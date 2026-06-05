package com.novel.agent;

import com.novel.agent.dto.AgentTaskResponse;
import com.novel.agent.dto.CreateNovelAgentTaskRequest;
import com.novel.dto.ChapterExpansionResult;
import com.novel.dto.NovelDraftResponse;
import com.novel.dto.StoryGraphResult;
import com.novel.agent.tool.ConfirmNovelTool;
import com.novel.agent.tool.CreateDraftTool;
import com.novel.agent.tool.GenerateFirstChapterTool;
import com.novel.agent.tool.GenerateStoryGraphTool;
import com.novel.agent.tool.NovelCreationToolContext;
import com.novel.agent.tool.SaveFirstChapterTool;
import com.novel.entity.AgentTask;
import com.novel.entity.AgentTaskStep;
import com.novel.entity.Chapter;
import com.novel.entity.Novel;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class NovelCreationAgentWorkflow {

    private static final String SCOPE_NOVEL_CREATE = "novel:create";
    private static final String SCOPE_CHAPTER_CREATE = "chapter:create";
    private static final String SCOPE_CHAPTER_UPDATE = "chapter:update";
    private static final String SCOPE_STORY_GRAPH_GENERATE = "storyGraph:generate";

    private final AgentAuthorizationService authorizationService;
    private final AgentTaskService taskService;
    private final CreateDraftTool createDraftTool;
    private final ConfirmNovelTool confirmNovelTool;
    private final GenerateFirstChapterTool generateFirstChapterTool;
    private final SaveFirstChapterTool saveFirstChapterTool;
    private final GenerateStoryGraphTool generateStoryGraphTool;

    public AgentTaskResponse start(CreateNovelAgentTaskRequest request) {
        validateRequest(request);
        List<String> requiredScopes = new ArrayList<>(List.of(SCOPE_NOVEL_CREATE, SCOPE_CHAPTER_CREATE, SCOPE_CHAPTER_UPDATE));
        if (Boolean.TRUE.equals(request.getAutoGenerateStoryGraph())) {
            requiredScopes.add(SCOPE_STORY_GRAPH_GENERATE);
        }
        authorizationService.validate(request.getAuthorizationId(), AgentType.NOVEL_CREATION, requiredScopes);

        AgentTask task = taskService.createTask(AgentType.NOVEL_CREATION, request.getTitle(), inputSnapshot(request));
        taskService.log(task, AgentLogLevel.INFO, "小说创建代理任务已创建", Map.of("agentType", AgentType.NOVEL_CREATION.name()));
        taskService.updateStatus(task, AgentTaskStatus.RUNNING);
        taskService.log(task, AgentLogLevel.INFO, "小说创建代理任务开始执行", Map.of("title", request.getTitle()));

        NovelCreationToolContext context = createContext(request);
        try {
            NovelDraftResponse draft = executeStep(task, "CREATE_DRAFT", "生成作品资料草稿", draftInput(request), () -> {
                return (NovelDraftResponse) createDraftTool.execute(context, draftInput(request));
            });

            Novel novel = executeStep(task, "CONFIRM_NOVEL", "确认创建作品", draft, () -> (Novel) confirmNovelTool.execute(context, Map.of("confirmation", "confirmed")));
            Chapter firstChapter = context.getFirstChapter();

            if (Boolean.TRUE.equals(request.getAutoGenerateFirstChapter()) && firstChapter != null) {
                ChapterExpansionResult expansion = executeStep(task, "GENERATE_FIRST_CHAPTER", "生成第一章开篇正文", Map.of(
                        "novelId", novel.getId(),
                        "chapterId", firstChapter.getId(),
                        "sceneText", draft.getFirstChapterOpeningScene()
                ), () -> (ChapterExpansionResult) generateFirstChapterTool.execute(context, Map.of(
                        "sceneText", blankToDefault(draft.getFirstChapterOpeningScene(), request.getIdea()),
                        "chapterGoal", "写出第一章开篇，完成主角亮相、核心冲突和追读钩子。"
                )));

                Chapter savedChapter = executeStep(task, "SAVE_CHAPTER", "保存第一章", Map.of(
                        "chapterId", firstChapter.getId(),
                        "chapterTitle", firstChapter.getTitle()
                ), () -> (Chapter) saveFirstChapterTool.execute(context, Map.of()));
            } else {
                taskService.skipStep(task, "GENERATE_FIRST_CHAPTER", "生成第一章开篇正文", "用户未启用自动生成第一章，或第一章占位章节不存在");
                taskService.skipStep(task, "SAVE_CHAPTER", "保存第一章", "无自动生成正文可保存");
            }

            if (Boolean.TRUE.equals(request.getAutoGenerateStoryGraph())) {
                StoryGraphResult graph = executeStep(task, "GENERATE_STORY_GRAPH", "生成世界观图谱", Map.of("novelId", novel.getId()), () -> {
                    return (StoryGraphResult) generateStoryGraphTool.execute(context, Map.of("mode", "full"));
                });
            } else {
                taskService.skipStep(task, "GENERATE_STORY_GRAPH", "生成世界观图谱", "用户未启用自动生成世界观图谱");
            }

            Map<String, Object> result = context.resultSnapshot();
            result.put("runnerMode", "FIXED_WORKFLOW");
            taskService.finishSuccess(task, result);
            taskService.log(task, AgentLogLevel.INFO, "小说创建代理任务执行成功", result);
            AgentTaskResponse response = taskService.toResponse(task);
            response.setMessage("小说创建代理任务已完成");
            return response;
        } catch (Exception error) {
            taskService.finishFailed(task, error.getMessage());
            taskService.log(task, AgentLogLevel.ERROR, "小说创建代理任务执行失败", Map.of("error", error.getMessage()));
            AgentTaskResponse response = taskService.toResponse(task);
            response.setMessage("小说创建代理任务执行失败");
            return response;
        }
    }

    private <T> T executeStep(AgentTask task, String stepKey, String stepName, Object input, StepRunner<T> runner) {
        if (taskService.isCancelled(task)) {
            throw new RuntimeException("任务已取消");
        }
        AgentTaskStep step = taskService.startStep(task, stepKey, stepName, input);
        taskService.log(task, AgentLogLevel.INFO, "开始步骤：" + stepName, Map.of("stepKey", stepKey));
        try {
            T output = runner.run();
            taskService.finishStep(step, output);
            taskService.log(task, AgentLogLevel.INFO, "完成步骤：" + stepName, Map.of("stepKey", stepKey));
            return output;
        } catch (Exception error) {
            taskService.failStep(step, error.getMessage());
            taskService.log(task, AgentLogLevel.ERROR, "步骤失败：" + stepName, Map.of("stepKey", stepKey, "error", error.getMessage()));
            throw error;
        }
    }

    private Map<String, Object> inputSnapshot(CreateNovelAgentTaskRequest request) {
        Map<String, Object> input = new LinkedHashMap<>();
        input.put("authorizationId", request.getAuthorizationId());
        input.put("title", request.getTitle());
        input.put("idea", request.getIdea());
        input.put("genre", request.getGenre());
        input.put("style", request.getStyle());
        input.put("autoGenerateFirstChapter", Boolean.TRUE.equals(request.getAutoGenerateFirstChapter()));
        input.put("autoGenerateStoryGraph", Boolean.TRUE.equals(request.getAutoGenerateStoryGraph()));
        return input;
    }

    private NovelCreationToolContext createContext(CreateNovelAgentTaskRequest request) {
        NovelCreationToolContext context = new NovelCreationToolContext();
        context.setTitle(request.getTitle());
        context.setIdea(request.getIdea());
        context.setGenre(request.getGenre());
        context.setStyle(request.getStyle());
        context.setAutoGenerateFirstChapter(Boolean.TRUE.equals(request.getAutoGenerateFirstChapter()));
        context.setAutoGenerateStoryGraph(Boolean.TRUE.equals(request.getAutoGenerateStoryGraph()));
        return context;
    }

    private Map<String, Object> draftInput(CreateNovelAgentTaskRequest request) {
        return Map.of(
                "title", request.getTitle(),
                "idea", blankToDefault(request.getIdea(), ""),
                "genre", blankToDefault(request.getGenre(), ""),
                "style", blankToDefault(request.getStyle(), "")
        );
    }

    private void validateRequest(CreateNovelAgentTaskRequest request) {
        if (request.getAuthorizationId() == null) {
            throw new RuntimeException("authorizationId 不能为空");
        }
        if (request.getTitle() == null || request.getTitle().isBlank()) {
            throw new RuntimeException("作品标题不能为空");
        }
    }

    private String blankToDefault(String value, String fallback) {
        return value == null || value.isBlank() ? fallback : value.trim();
    }

    @FunctionalInterface
    private interface StepRunner<T> {
        T run();
    }
}
