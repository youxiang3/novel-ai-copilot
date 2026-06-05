# Opening Guide E2E Notes

Updated: 2026-06-04

This note covers the backend Opening Guide and First Chapter Generation skill endpoints added after the main E2E checklist.

## Endpoints

- `POST /api/novels/opening-guide/next-question`
- `POST /api/novels/draft`
- `POST /api/novels/opening-guide/generate-first-chapter`

All endpoints return the existing `Result<T>` JSON envelope. Model failures should fall back to rule-based output instead of returning a direct 500.

## Generate Next Question

```powershell
$guideBody = @{
  title = "开篇向导 E2E 小说"
  idea = "退婚现场，主角掌心旧印第一次回应"
  genre = "玄幻"
  style = "热血、逆袭、节奏紧凑"
  answers = @()
  currentStep = 0
  maxSteps = 5
} | ConvertTo-Json -Depth 10

$guide = Invoke-RestMethod `
  -Method Post `
  -Uri "http://localhost:8080/api/novels/opening-guide/next-question" `
  -Headers $headers `
  -ContentType "application/json" `
  -Body $guideBody
```

Expected `data` fields:

- `finished`
- `question`
- `options`
- `helperText`
- `draftPatch.mainConflict`
- `draftPatch.openingHook`
- `draftPatch.protagonistHint`
- `draftPatch.worldRuleHint`

## Generate Draft With Answers

```powershell
$draftBody = @{
  title = "开篇向导 E2E 小说"
  idea = "退婚现场，主角掌心旧印第一次回应"
  genre = "玄幻"
  style = "热血、逆袭、节奏紧凑"
  answers = @(
    @{ question = "第一章一开场，主角正在承受什么具体压力？"; answer = "被当众退婚，旧印却突然发烫" }
  )
  draftPatch = @{
    mainConflict = "被当众退婚，旧印却突然发烫"
    openingHook = "旧印认主，引出家族旧案"
    protagonistHint = "被误判为废物的少年"
    worldRuleHint = "血脉与宗门资源绑定，弱者无申辩权"
  }
} | ConvertTo-Json -Depth 10

$draft = Invoke-RestMethod `
  -Method Post `
  -Uri "http://localhost:8080/api/novels/draft" `
  -Headers $headers `
  -ContentType "application/json" `
  -Body $draftBody
```

Expected `data` keeps old fields and additionally includes:

- `subtitle`
- `openingChapterGoal`
- `firstChapterTitle`

## Generate First Chapter

```powershell
$firstChapterBody = @{
  title = "开篇向导 E2E 小说"
  idea = "退婚现场，主角掌心旧印第一次回应"
  genre = "玄幻"
  style = "热血、逆袭、节奏紧凑"
  answers = @(
    @{ question = "第一章一开场，主角正在承受什么具体压力？"; answer = "被当众退婚，旧印却突然发烫" }
  )
  draft = $draft.data
} | ConvertTo-Json -Depth 10

Invoke-RestMethod `
  -Method Post `
  -Uri "http://localhost:8080/api/novels/opening-guide/generate-first-chapter" `
  -Headers $headers `
  -ContentType "application/json" `
  -Body $firstChapterBody
```

Expected `data` fields:

- `chapterTitle`
- `chapterText`
- `chapterSummary`
- `suggestedNextStep`

## Verification Status

- `mvn -DskipTests compile` passed with JDK 21.
- `npm run build` passed.
- Real PostgreSQL HTTP verification was not rerun in this pass because the previous temporary PostgreSQL instance is no longer running in the current shell.
