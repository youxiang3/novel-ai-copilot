package com.novel.service.impl;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.novel.config.UserContext;
import com.novel.dto.NovelDraftRequest;
import com.novel.dto.NovelDraftResponse;
import com.novel.entity.Chapter;
import com.novel.entity.Lore;
import com.novel.entity.Novel;
import com.novel.service.AiService;
import com.novel.service.ChapterService;
import com.novel.service.LoreService;
import com.novel.service.NovelDraftService;
import com.novel.service.NovelService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class NovelDraftServiceImpl implements NovelDraftService {

    private final NovelService novelService;
    private final ChapterService chapterService;
    private final LoreService loreService;
    private final AiService aiService;
    private final ObjectMapper objectMapper;

    @Override
    public NovelDraftResponse createDraft(NovelDraftRequest request) {
        if (request.getTitle() == null || request.getTitle().isBlank()) {
            throw new RuntimeException("作品标题不能为空");
        }

        NovelDraftResponse fallback = createFallbackDraft(request);
        try {
            String response = aiService.call(buildDraftPrompt(request));
            NovelDraftResponse draft = objectMapper.readValue(extractJson(response), NovelDraftResponse.class);
            fillDraftDefaults(draft, fallback);
            return draft;
        } catch (Exception ignored) {
            return fallback;
        }
    }

    @Override
    public Novel confirmDraft(NovelDraftResponse draft) {
        UUID userId = UserContext.getUserId();
        if (userId == null) {
            throw new RuntimeException("未登录");
        }
        if (draft.getTitle() == null || draft.getTitle().isBlank()) {
            throw new RuntimeException("作品标题不能为空");
        }

        fillDraftDefaults(draft, createFallbackFromDraft(draft));

        Novel novel = new Novel();
        novel.setUserId(userId);
        novel.setTitle(draft.getTitle());
        novel.setGlobalOutline(String.join("\n", safeList(draft.getGlobalOutline())));
        novel.setAuthorStylePrompt(draft.getStyle());
        novelService.save(novel);

        Chapter firstChapter = new Chapter();
        firstChapter.setNovelId(novel.getId());
        firstChapter.setChapterNumber(1);
        firstChapter.setTitle(blankToDefault(draft.getFirstChapterTitle(), "第一章：开篇"));
        firstChapter.setContent("");
        firstChapter.setWordCount(0);
        firstChapter.setStatus("draft");
        chapterService.save(firstChapter);

        NovelDraftResponse.MainCharacter mainCharacter = draft.getMainCharacter() == null
                ? new NovelDraftResponse.MainCharacter()
                : draft.getMainCharacter();

        Lore characterLore = new Lore();
        characterLore.setNovelId(novel.getId());
        characterLore.setCategory("character");
        characterLore.setName(blankToDefault(mainCharacter.getName(), "主角"));
        characterLore.setContent(buildCharacterLore(mainCharacter));
        loreService.save(characterLore);

        Lore worldLore = new Lore();
        worldLore.setNovelId(novel.getId());
        worldLore.setCategory("world_rule");
        worldLore.setName("世界规则");
        worldLore.setContent(buildWorldLore(draft.getWorldRules()));
        loreService.save(worldLore);

        return novel;
    }

    private String buildDraftPrompt(NovelDraftRequest request) {
        return """
                你是一个 AI 网文产品中的小说开局策划助手。
                用户会输入作品标题、一句话脑洞、目标题材、目标风格，也可能提供开篇问答和草稿补丁。
                请生成一个新作品资料草稿，用于用户确认后创建作品。
                要求：
                1. 不要直接写完整章节，只生成作品基础资料。
                2. 内容适合网文连载，强调爽点、冲突、追读线。
                3. 主角设定包含欲望、短板、初始困境、成长方向。
                4. 世界规则清晰，但不要过度复杂。
                5. 输出必须是合法 JSON，不要输出 Markdown。
                JSON 字段：title, subtitle, sellPoint, genre, style, globalOutline, mainCharacter, worldRules, longTermArcs, currentHookLine, firstChapterOpeningScene, openingChapterGoal, firstChapterTitle。
                作品标题：%s
                一句话脑洞：%s
                目标题材：%s
                目标风格：%s
                开篇问答：
                %s
                草稿补丁：
                %s
                """.formatted(
                request.getTitle(),
                blankToDefault(request.getIdea(), "由 AI 根据标题推断"),
                blankToDefault(request.getGenre(), "不限"),
                blankToDefault(request.getStyle(), "清爽、有画面感"),
                buildAnswerText(request),
                buildPatchText(request.getDraftPatch())
        );
    }

    private NovelDraftResponse createFallbackDraft(NovelDraftRequest request) {
        String title = request.getTitle().trim();
        String idea = blankToDefault(patchValue(request.getDraftPatch(), "mainConflict"), blankToDefault(request.getIdea(), title + "的第一章核心危机"));
        String hook = blankToDefault(patchValue(request.getDraftPatch(), "openingHook"), idea);
        String protagonistHint = blankToDefault(patchValue(request.getDraftPatch(), "protagonistHint"), "被当前危机推到台前的核心人物");
        String worldHint = blankToDefault(patchValue(request.getDraftPatch(), "worldRuleHint"), "世界规则制造不公平，主角必须在限制中寻找破局点。");
        String genre = blankToDefault(request.getGenre(), "长篇网文");
        String style = blankToDefault(request.getStyle(), "清爽、有冲突、有追读钩子");

        NovelDraftResponse draft = new NovelDraftResponse();
        draft.setTitle(title);
        draft.setSubtitle("开篇危机下的主动反击");
        draft.setSellPoint(title + "：" + idea);
        draft.setGenre(genre);
        draft.setStyle(style);
        draft.setGlobalOutline(List.of(
                "开篇以“" + idea + "”切入，让主角在强压处境中暴露第一个底牌。",
                "中段围绕主角欲望、世界规则和敌对势力持续升级冲突。",
                "长线通过秘密、反转和关系变化形成连续追读。"
        ));

        NovelDraftResponse.MainCharacter character = new NovelDraftResponse.MainCharacter();
        character.setName("待命名主角");
        character.setIdentity(protagonistHint);
        character.setDesire("夺回主动权，并证明所有人都看错了自己。");
        character.setWeakness("起点受压制，秘密尚不能公开。");
        character.setInitialSituation(idea);
        character.setGrowthArc("从被动承受危机，成长为主动布局并改变规则的人。");
        draft.setMainCharacter(character);

        NovelDraftResponse.WorldRule rule = new NovelDraftResponse.WorldRule();
        rule.setName("核心压迫规则");
        rule.setDescription(worldHint);
        draft.setWorldRules(List.of(rule));
        draft.setLongTermArcs(List.of("低谷反击", "身份秘密升级", "更大势力介入"));
        draft.setCurrentHookLine(List.of(hook, "第一章结尾露出一个更大的问题。"));
        draft.setFirstChapterOpeningScene(hook);
        draft.setOpeningChapterGoal("写出主角在开篇压力中主动反击，并留下追读钩子。");
        draft.setFirstChapterTitle("第一章：开篇");
        return draft;
    }

    private NovelDraftResponse createFallbackFromDraft(NovelDraftResponse draft) {
        NovelDraftRequest request = new NovelDraftRequest();
        request.setTitle(blankToDefault(draft.getTitle(), "新的长篇小说"));
        request.setIdea(blankToDefault(draft.getSellPoint(), draft.getTitle()));
        request.setGenre(draft.getGenre());
        request.setStyle(draft.getStyle());
        return createFallbackDraft(request);
    }

    private void fillDraftDefaults(NovelDraftResponse draft, NovelDraftResponse fallback) {
        if (draft.getTitle() == null || draft.getTitle().isBlank()) draft.setTitle(fallback.getTitle());
        if (draft.getSubtitle() == null || draft.getSubtitle().isBlank()) draft.setSubtitle(fallback.getSubtitle());
        if (draft.getSellPoint() == null || draft.getSellPoint().isBlank()) draft.setSellPoint(fallback.getSellPoint());
        if (draft.getGenre() == null || draft.getGenre().isBlank()) draft.setGenre(fallback.getGenre());
        if (draft.getStyle() == null || draft.getStyle().isBlank()) draft.setStyle(fallback.getStyle());
        if (draft.getGlobalOutline() == null || draft.getGlobalOutline().isEmpty()) draft.setGlobalOutline(fallback.getGlobalOutline());
        if (draft.getMainCharacter() == null) draft.setMainCharacter(fallback.getMainCharacter());
        if (draft.getWorldRules() == null || draft.getWorldRules().isEmpty()) draft.setWorldRules(fallback.getWorldRules());
        if (draft.getLongTermArcs() == null || draft.getLongTermArcs().isEmpty()) draft.setLongTermArcs(fallback.getLongTermArcs());
        if (draft.getCurrentHookLine() == null || draft.getCurrentHookLine().isEmpty()) draft.setCurrentHookLine(fallback.getCurrentHookLine());
        if (draft.getFirstChapterOpeningScene() == null || draft.getFirstChapterOpeningScene().isBlank()) draft.setFirstChapterOpeningScene(fallback.getFirstChapterOpeningScene());
        if (draft.getOpeningChapterGoal() == null || draft.getOpeningChapterGoal().isBlank()) draft.setOpeningChapterGoal(fallback.getOpeningChapterGoal());
        if (draft.getFirstChapterTitle() == null || draft.getFirstChapterTitle().isBlank()) draft.setFirstChapterTitle(fallback.getFirstChapterTitle());
    }

    private String buildAnswerText(NovelDraftRequest request) {
        if (request.getAnswers() == null || request.getAnswers().isEmpty()) return "暂无";
        return request.getAnswers().stream()
                .map(item -> blankToDefault(item.getQuestion(), "问题") + "：" + blankToDefault(item.getAnswer(), "未回答"))
                .collect(Collectors.joining("\n"));
    }

    private String buildPatchText(Map<String, Object> draftPatch) {
        if (draftPatch == null || draftPatch.isEmpty()) return "暂无";
        return draftPatch.entrySet().stream()
                .map(entry -> entry.getKey() + "：" + String.valueOf(entry.getValue()))
                .collect(Collectors.joining("\n"));
    }

    private String patchValue(Map<String, Object> draftPatch, String key) {
        if (draftPatch == null || !draftPatch.containsKey(key) || draftPatch.get(key) == null) return null;
        return String.valueOf(draftPatch.get(key));
    }

    private String extractJson(String value) {
        int start = value == null ? -1 : value.indexOf('{');
        int end = value == null ? -1 : value.lastIndexOf('}');
        if (start >= 0 && end > start) return value.substring(start, end + 1);
        return value;
    }

    private String buildCharacterLore(NovelDraftResponse.MainCharacter character) {
        return String.join("\n",
                "身份：" + blankToDefault(character.getIdentity(), "待补充"),
                "欲望：" + blankToDefault(character.getDesire(), "待补充"),
                "短板：" + blankToDefault(character.getWeakness(), "待补充"),
                "初始处境：" + blankToDefault(character.getInitialSituation(), "待补充"),
                "成长方向：" + blankToDefault(character.getGrowthArc(), "待补充")
        );
    }

    private String buildWorldLore(List<NovelDraftResponse.WorldRule> rules) {
        if (rules == null || rules.isEmpty()) return "世界规则待补充。";
        StringBuilder builder = new StringBuilder();
        for (NovelDraftResponse.WorldRule rule : rules) {
            builder.append(blankToDefault(rule.getName(), "世界规则"))
                    .append("：")
                    .append(blankToDefault(rule.getDescription(), "待补充"))
                    .append("\n");
        }
        return builder.toString().trim();
    }

    private List<String> safeList(List<String> value) {
        return value == null ? List.of() : value;
    }

    private String blankToDefault(String value, String fallback) {
        return value == null || value.isBlank() ? fallback : value.trim();
    }
}
