package com.novel.skill.novel;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.novel.dto.OpeningGuideAnswer;
import com.novel.dto.OpeningGuideRequest;
import com.novel.dto.OpeningGuideResponse;
import com.novel.service.AiService;
import com.novel.skill.NovelSkill;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.stream.Collectors;

@Component
@RequiredArgsConstructor
public class OpeningGuideSkill implements NovelSkill<OpeningGuideRequest, OpeningGuideResponse> {

    private final AiService aiService;
    private final ObjectMapper objectMapper;

    @Override
    public String getName() {
        return "OpeningGuideSkill";
    }

    @Override
    public OpeningGuideResponse execute(OpeningGuideRequest input) {
        OpeningGuideResponse fallback = createFallback(input);
        try {
            String response = aiService.call(buildPrompt(input));
            OpeningGuideResponse result = objectMapper.readValue(extractJson(response), OpeningGuideResponse.class);
            fillDefaults(result, fallback);
            return result;
        } catch (Exception ignored) {
            return fallback;
        }
    }

    private OpeningGuideResponse createFallback(OpeningGuideRequest input) {
        int answered = safeAnswers(input).size();
        int maxSteps = input == null || input.getMaxSteps() == null || input.getMaxSteps() < 3 ? 5 : input.getMaxSteps();
        boolean wuxia = isWuxia(input);

        OpeningGuideResponse response = new OpeningGuideResponse();
        response.setFinished(answered >= maxSteps);
        response.setDraftPatch(createPatch(input));
        response.setHelperText(wuxia
                ? "围绕退隐原因、旧案追索、封刀誓言和不拔刀破局继续收束开篇。"
                : "根据已回答内容继续收束开篇冲突，可随时生成资料草稿。");

        if (Boolean.TRUE.equals(response.getFinished())) {
            response.setQuestion("");
            response.setOptions(List.of());
            response.setHelperText("开篇信息已足够，可以生成作品资料草稿。");
            return response;
        }

        if (wuxia) {
            fillWuxiaQuestion(response, answered);
            return response;
        }

        switch (answered) {
            case 0 -> {
                response.setQuestion("第一章一开场，主角正在承受什么具体压力？");
                response.setOptions(List.of("被当众羞辱或误判", "被迫接下不可能完成的任务", "亲近之人卷入危机"));
            }
            case 1 -> {
                response.setQuestion("主角为什么不能退？他最想夺回或证明什么？");
                response.setOptions(List.of("夺回被剥夺的尊严", "守住唯一重要的人", "证明隐藏身份或能力"));
            }
            case 2 -> {
                response.setQuestion("开篇最适合露出哪种底牌或异常？");
                response.setOptions(List.of("随身物突然回应", "旧记忆或血脉觉醒", "别人看不见的规则漏洞"));
            }
            case 3 -> {
                response.setQuestion("世界规则如何制造不公平，让冲突更锋利？");
                response.setOptions(List.of("等级森严，弱者无申辩权", "资源被少数势力垄断", "仪式或契约限制主角"));
            }
            default -> {
                response.setQuestion("第一章结尾留下什么追读钩子？");
                response.setOptions(List.of("更强对手突然到场", "底牌暴露出副作用", "主角发现危机背后另有操盘者"));
            }
        }
        return response;
    }

    private void fillWuxiaQuestion(OpeningGuideResponse response, int answered) {
        switch (answered) {
            case 0 -> {
                response.setQuestion("三年前他退出江湖，真正原因更接近哪一种？");
                response.setOptions(List.of("替人背下血案", "误杀旧人封刀", "败给故人退隐", "守住秘密不拔刀"));
            }
            case 1 -> {
                response.setQuestion("第一章开场，谁最适合在热闹处认出这个退隐少年？");
                response.setOptions(List.of("旧日仇家", "当年死者亲人", "官府捕头", "昔日同伴"));
            }
            case 2 -> {
                response.setQuestion("他不能拔刀，那第一章要用什么方式破局？");
                response.setOptions(List.of("以筷夹刀", "茶水听风辨位", "旧招识破来人", "一句江湖规矩反制"));
            }
            case 3 -> {
                response.setQuestion("第一章末尾露出哪条江湖代价，让读者知道他不是想退就能退？");
                response.setOptions(List.of("封刀誓代价", "旧案名帖重现", "当年血案活口", "门派旧约追责"));
            }
            default -> {
                response.setQuestion("第一章最后一句，最好把读者钩向哪个江湖问题？");
                response.setOptions(List.of("死人昨夜进城", "旧刀主人未死", "官府榜文改名", "故人留下血书"));
            }
        }
    }

    private OpeningGuideResponse.DraftPatch createPatch(OpeningGuideRequest input) {
        List<OpeningGuideAnswer> answers = safeAnswers(input);
        OpeningGuideResponse.DraftPatch patch = new OpeningGuideResponse.DraftPatch();
        if (isWuxia(input)) {
            patch.setMainConflict(firstAnswer(answers, 1, blankToDefault(input == null ? null : input.getIdea(), "退隐少年在热闹处被旧人认出")));
            patch.setProtagonistHint(firstAnswer(answers, 0, "曾经名动江湖，如今因旧案退隐封刀"));
            patch.setOpeningHook(firstAnswer(answers, 2, "他不拔刀，却必须当众破局"));
            patch.setWorldRuleHint(firstAnswer(answers, 3, "江湖旧债不因退隐而消失"));
            return patch;
        }
        patch.setMainConflict(firstAnswer(answers, 0, blankToDefault(input == null ? null : input.getIdea(), "主角被迫卷入开篇危机")));
        patch.setProtagonistHint(firstAnswer(answers, 1, "主角在压力中做出主动选择"));
        patch.setOpeningHook(firstAnswer(answers, Math.max(0, answers.size() - 1), blankToDefault(input == null ? null : input.getIdea(), "第一章末尾出现更大的问题")));
        patch.setWorldRuleHint(firstAnswer(answers, 3, blankToDefault(input == null ? null : input.getGenre(), "规则不公平，冲突持续升级")));
        return patch;
    }

    private String buildPrompt(OpeningGuideRequest input) {
        return """
                你是网文开篇向导。请根据用户标题、脑洞、题材、风格和历史问答，决定下一题或结束问答。
                如果题材是武侠/江湖/架空历史，不要套玄幻、系统、金手指、血脉觉醒模板；优先追问退隐原因、旧案、誓言、旧人重逢、不拔刀破局、江湖规矩和章末追读钩子。
                输出必须是合法 JSON，不要输出 Markdown。
                JSON 字段：finished, question, options, helperText, draftPatch。
                draftPatch 字段：mainConflict, openingHook, protagonistHint, worldRuleHint。

                标题：%s
                脑洞：%s
                题材：%s
                风格：%s
                当前步骤：%s / %s
                历史问答：
                %s
                """.formatted(
                blankToDefault(input == null ? null : input.getTitle(), "未命名作品"),
                blankToDefault(input == null ? null : input.getIdea(), "未填写"),
                blankToDefault(input == null ? null : input.getGenre(), "不限"),
                blankToDefault(input == null ? null : input.getStyle(), "节奏紧凑"),
                input == null || input.getCurrentStep() == null ? safeAnswers(input).size() : input.getCurrentStep(),
                input == null || input.getMaxSteps() == null ? 5 : input.getMaxSteps(),
                answerText(input)
        );
    }

    private boolean isWuxia(OpeningGuideRequest input) {
        String source = String.join(" ",
                blankToDefault(input == null ? null : input.getTitle(), ""),
                blankToDefault(input == null ? null : input.getIdea(), ""),
                blankToDefault(input == null ? null : input.getGenre(), ""),
                blankToDefault(input == null ? null : input.getStyle(), ""),
                answerText(input)
        );
        return source.matches("(?s).*(武侠|江湖|侠客|少侠|大侠|门派|镖局|轻功|内力|刀客|剑客|退隐|封刀|不拔刀|旧案|茶楼).*");
    }

    private void fillDefaults(OpeningGuideResponse result, OpeningGuideResponse fallback) {
        if (result.getFinished() == null) result.setFinished(fallback.getFinished());
        if (!Boolean.TRUE.equals(result.getFinished()) && (result.getQuestion() == null || result.getQuestion().isBlank())) {
            result.setQuestion(fallback.getQuestion());
        }
        if (result.getOptions() == null || result.getOptions().isEmpty()) result.setOptions(fallback.getOptions());
        if (result.getHelperText() == null || result.getHelperText().isBlank()) result.setHelperText(fallback.getHelperText());
        if (result.getDraftPatch() == null) result.setDraftPatch(fallback.getDraftPatch());
    }

    private String answerText(OpeningGuideRequest input) {
        return safeAnswers(input).stream()
                .map(item -> blankToDefault(item.getQuestion(), "问题") + "：" + blankToDefault(item.getAnswer(), "未回答"))
                .collect(Collectors.joining("\n"));
    }

    private List<OpeningGuideAnswer> safeAnswers(OpeningGuideRequest input) {
        return input == null || input.getAnswers() == null ? List.of() : input.getAnswers();
    }

    private String firstAnswer(List<OpeningGuideAnswer> answers, int index, String fallback) {
        if (index >= 0 && index < answers.size() && answers.get(index).getAnswer() != null && !answers.get(index).getAnswer().isBlank()) {
            return answers.get(index).getAnswer().trim();
        }
        return fallback;
    }

    private String extractJson(String value) {
        int start = value == null ? -1 : value.indexOf('{');
        int end = value == null ? -1 : value.lastIndexOf('}');
        if (start >= 0 && end > start) return value.substring(start, end + 1);
        return value;
    }

    private String blankToDefault(String value, String fallback) {
        return value == null || value.isBlank() ? fallback : value.trim();
    }
}
