package com.novel.skill.novel;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.novel.config.UserContext;
import com.novel.dto.FirstChapterGenerationRequest;
import com.novel.dto.FirstChapterGenerationResult;
import com.novel.dto.NovelDraftResponse;
import com.novel.dto.OpeningGuideAnswer;
import com.novel.entity.Novel;
import com.novel.service.AiService;
import com.novel.service.NovelService;
import com.novel.skill.NovelSkill;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Component
@RequiredArgsConstructor
public class FirstChapterGenerationSkill implements NovelSkill<FirstChapterGenerationRequest, FirstChapterGenerationResult> {

    private final NovelService novelService;
    private final AiService aiService;
    private final ObjectMapper objectMapper;

    @Override
    public String getName() {
        return "FirstChapterGenerationSkill";
    }

    @Override
    public FirstChapterGenerationResult execute(FirstChapterGenerationRequest input) {
        Novel novel = loadNovelIfPresent(input);
        FirstChapterGenerationResult fallback = createFallback(input, novel);
        try {
            String response = aiService.call(buildPrompt(input, novel));
            FirstChapterGenerationResult result = objectMapper.readValue(extractJson(response), FirstChapterGenerationResult.class);
            fillDefaults(result, fallback);
            return result;
        } catch (Exception ignored) {
            return fallback;
        }
    }

    private Novel loadNovelIfPresent(FirstChapterGenerationRequest input) {
        if (input == null || input.getNovelId() == null) return null;
        Novel novel = novelService.getById(input.getNovelId());
        if (novel == null) throw new RuntimeException("小说不存在");
        UUID userId = UserContext.getUserId();
        if (userId == null || !userId.equals(novel.getUserId())) throw new RuntimeException("无权访问");
        return novel;
    }

    private FirstChapterGenerationResult createFallback(FirstChapterGenerationRequest input, Novel novel) {
        if (isWuxia(input)) return createWuxiaFallback(input, novel);

        NovelDraftResponse draft = input == null ? null : input.getDraft();
        String title = draft != null ? blankToDefault(draft.getTitle(), input == null ? null : input.getTitle()) : input == null ? "新的长篇小说" : input.getTitle();
        if (novel != null) title = blankToDefault(novel.getTitle(), title);
        String chapterTitle = draft == null ? "第一章：开篇" : blankToDefault(draft.getFirstChapterTitle(), "第一章：开篇");
        String opening = draft == null ? blankToDefault(input == null ? null : input.getIdea(), title + "的开篇危机") : blankToDefault(draft.getFirstChapterOpeningScene(), input.getIdea());
        String conflict = firstAnswer(input, 0, opening);
        String desire = firstAnswer(input, 1, "他必须夺回主动权");
        String hook = firstAnswer(input, Math.max(0, safeAnswers(input).size() - 1), "更大的危机正在逼近");

        FirstChapterGenerationResult result = new FirstChapterGenerationResult();
        result.setChapterTitle(chapterTitle);
        result.setChapterText("""
                %s

                %s并不是从一场胜利开始的。

                天色压得很低，所有人的目光都落在他身上，像一张越收越紧的网。眼前的麻烦很具体：%s。

                他原本可以退一步。

                可一想到%s，那一步就再也退不下去。

                “既然你们都想要一个答案，”他说，“那我现在给。”

                话音落下，周围的嘈杂忽然低了半截。他向前踏出一步，抓住规则里最细的一道裂口，把看似必输的局面撬开一线。

                原本等着看笑话的人脸色变了。规则、身份、旧怨和秘密在这一刻同时挤进窄小的开局里，把他推向所有人的正中央。

                而真正让他背脊发寒的，是%s。
                """.formatted(chapterTitle, blankToDefault(title, "这本书"), conflict, desire, hook).trim());
        result.setChapterSummary(chapterTitle + "围绕“" + conflict + "”展开，主角在公开压力中做出主动选择，并留下追读钩子。");
        result.setSuggestedNextStep("下一章可让主角为这次公开反击付出代价，同时揭开底牌的一小部分规则。");
        return result;
    }

    private FirstChapterGenerationResult createWuxiaFallback(FirstChapterGenerationRequest input, Novel novel) {
        String title = novel == null ? blankToDefault(input == null ? null : input.getTitle(), "烟雨江湖") : blankToDefault(novel.getTitle(), input.getTitle());
        String reason = firstAnswer(input, 0, "三年前他替人背下一桩血案，从此封刀退隐");
        String recognizer = firstAnswer(input, 1, "旧日仇家在茶楼里认出了他");
        String solution = firstAnswer(input, 2, "他以筷夹刀，始终不碰自己的旧刀");
        String cost = firstAnswer(input, 3, "封刀誓一破，旧案名帖就会重回江湖");
        String finalHook = firstAnswer(input, 4, "说书人忽然改口：三年前死去的那个人，昨夜进城了");
        String protagonist = inferWuxiaName(input, title);
        String chapterTitle = "第一章：三年不拔刀";

        FirstChapterGenerationResult result = new FirstChapterGenerationResult();
        result.setChapterTitle(chapterTitle);
        result.setChapterText("""
                %s

                五月初七，宜嫁娶，忌动刀。

                临安城的听雨楼坐满了人。雨从檐角落下来，细细密密，像一张银灰色的帘，把楼外的长街隔成旧画。说书先生一拍醒木，正讲到“三年前白衣少年一夜挑翻十二寨”，满堂叫好。

                靠窗的青衣伙计低头擦桌，像没听见。

                他叫%s。至少这三年里，街坊都这么叫他。没人知道他从哪里来，只知道他手脚勤快，话少，雨天会把门口的伞往里挪半尺，免得客人进门时沾湿鞋面。

                直到有人把一柄旧刀放在他桌上。

                刀鞘很旧，皮面被雨水泡得发黑。楼里的笑声还没散，那人已经按着刀柄，笑着喊出另一个名字。

                “%s，”他说，“江湖都说你死了。”

                满堂声息一静。

                %s的手停在茶盏边。他看了一眼那柄刀，没有碰。

                三年前，%s。江湖人只记得他退得突然，却没人知道他退得有多狼狈。那一夜之后，他给自己立过一条规矩：不再拔刀。

                可江湖从来不认一个人自己立的规矩。

                来人往前压了一步，声音不高，却足够让整座茶楼听清：“有人托我带句话。你若还记得当年那桩事，今晚子时，到旧渡口。”

                “我不记得。”%s说。

                “那就让你想起来。”

                刀光骤起。

                茶楼里有人惊叫，有人撞翻长凳。那一刀来得极快，劈向的却不是%s的头颈，而是桌上那柄旧刀。对方要逼他伸手，要逼他在众目睽睽之下承认自己还是当年的那个人。

                %s没有拔刀。

                他只是抬起两根竹筷。

                筷尖点在刀脊上，轻得像夹起一片茶叶。可那柄来势凶狠的刀偏偏在半寸外停住，刀锋震出一声细鸣，连带着满桌茶水都荡开一圈涟漪。

                %s

                来人的笑僵在脸上。

                楼上楼下的人都看见了：这个低眉顺眼的青衣伙计，武功还在。更可怕的是，他明明能杀人，却连自己的刀都没有碰一下。

                “你还守着那条誓？”来人咬牙。

                %s把竹筷放回桌上，声音很轻：“我守的不是誓，是人命。”

                这句话落下，窗外忽然又响起醒木声。

                说书先生不知何时停了原来的段子，嗓音变得干涩：“诸位，方才讲错了。三年前死在渡口的那个人，昨夜进城了。”

                %s终于抬眼。

                他知道，自己这三年的安稳，到此为止了。

                因为%s。
                """.formatted(
                chapterTitle,
                protagonist,
                protagonist,
                protagonist,
                trimSentence(reason),
                protagonist,
                protagonist,
                protagonist,
                trimSentence(solution),
                protagonist,
                protagonist,
                trimSentence(finalHook)
        ).trim());
        result.setChapterSummary("退隐三年的江湖少年在听雨楼被旧人认出，他不拔旧刀，以筷破局，却被章末消息重新拖回三年前的旧案。");
        result.setSuggestedNextStep("下一章建议写旧渡口赴约：让旧案活口、官府榜文或昔日同伴登场，逼主角解释三年前为何封刀。");
        return result;
    }

    private String buildPrompt(FirstChapterGenerationRequest input, Novel novel) {
        NovelDraftResponse draft = input == null ? null : input.getDraft();
        return """
                你是网文第一章正文生成助手。请根据开篇问答和作品资料生成可直接写入编辑器的第一章正文。
                如果题材是武侠/江湖/架空历史，不要写玄幻觉醒、系统、血脉、发光道具；要写茶楼/客栈/渡口等具体场景、旧人认出、封刀誓言、不拔刀破局和章末旧案钩子。
                输出必须是合法 JSON，不要输出 Markdown。
                JSON 字段：chapterTitle, chapterText, chapterSummary, suggestedNextStep。

                已保存作品：%s
                标题：%s
                脑洞：%s
                题材：%s
                风格：%s
                草稿卖点：%s
                第一章目标：%s
                第一章开场：%s
                历史问答：
                %s
                """.formatted(
                novel == null ? "未保存" : novel.getTitle(),
                blankToDefault(input == null ? null : input.getTitle(), draft == null ? "未命名作品" : draft.getTitle()),
                blankToDefault(input == null ? null : input.getIdea(), ""),
                blankToDefault(input == null ? null : input.getGenre(), draft == null ? "不限" : draft.getGenre()),
                blankToDefault(input == null ? null : input.getStyle(), draft == null ? "节奏紧凑" : draft.getStyle()),
                draft == null ? "" : blankToDefault(draft.getSellPoint(), ""),
                draft == null ? "" : blankToDefault(draft.getOpeningChapterGoal(), ""),
                draft == null ? "" : blankToDefault(draft.getFirstChapterOpeningScene(), ""),
                answerText(input)
        );
    }

    private boolean isWuxia(FirstChapterGenerationRequest input) {
        String source = String.join(" ",
                blankToDefault(input == null ? null : input.getTitle(), ""),
                blankToDefault(input == null ? null : input.getIdea(), ""),
                blankToDefault(input == null ? null : input.getGenre(), ""),
                blankToDefault(input == null ? null : input.getStyle(), ""),
                answerText(input)
        );
        return source.matches("(?s).*(武侠|江湖|侠客|少侠|大侠|门派|镖局|轻功|内力|刀客|剑客|退隐|封刀|不拔刀|旧案|茶楼).*");
    }

    private String inferWuxiaName(FirstChapterGenerationRequest input, String title) {
        String source = blankToDefault(input == null ? null : input.getIdea(), "") + " " + title;
        if (source.contains("烟雨")) return "沈照";
        return "他";
    }

    private String trimSentence(String value) {
        return blankToDefault(value, "").replaceAll("[。！？；;,.，\\s]+$", "");
    }

    private void fillDefaults(FirstChapterGenerationResult result, FirstChapterGenerationResult fallback) {
        if (result.getChapterTitle() == null || result.getChapterTitle().isBlank()) result.setChapterTitle(fallback.getChapterTitle());
        if (result.getChapterText() == null || result.getChapterText().isBlank()) result.setChapterText(fallback.getChapterText());
        if (result.getChapterSummary() == null || result.getChapterSummary().isBlank()) result.setChapterSummary(fallback.getChapterSummary());
        if (result.getSuggestedNextStep() == null || result.getSuggestedNextStep().isBlank()) result.setSuggestedNextStep(fallback.getSuggestedNextStep());
    }

    private String answerText(FirstChapterGenerationRequest input) {
        return safeAnswers(input).stream()
                .map(item -> blankToDefault(item.getQuestion(), "问题") + "：" + blankToDefault(item.getAnswer(), "未回答"))
                .collect(Collectors.joining("\n"));
    }

    private List<OpeningGuideAnswer> safeAnswers(FirstChapterGenerationRequest input) {
        return input == null || input.getAnswers() == null ? List.of() : input.getAnswers();
    }

    private String firstAnswer(FirstChapterGenerationRequest input, int index, String fallback) {
        List<OpeningGuideAnswer> answers = safeAnswers(input);
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
