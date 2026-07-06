export type CreationMode = 'web-ai' | 'local' | 'api'
export type WorkspaceStep = 'idea' | 'materials' | 'outline' | 'draft' | 'confirm'
export type OperationStatus = 'idle' | 'loading' | 'success' | 'error'
export type WorkStatus = 'local-draft' | 'official'
export type ProjectStatus = 'local-draft' | 'draft' | 'serializing' | 'completed' | 'published' | 'archived'
export type ProjectSyncState = 'local-only' | 'pending' | 'syncing' | 'synced' | 'failed'
export type PublishPlatform = '番茄小说' | '起点中文网' | '晋江文学城' | '微信读书' | '自定义平台' | '未设置平台'
export type ToolState = 'disabled' | 'enabled' | 'running' | 'passed' | 'risk'
export type LoreType = 'work' | 'character' | 'world' | 'location' | 'item' | 'faction' | 'foreshadow' | 'chapter-summary'
export type MemoryType = 'event' | 'character-state' | 'world-fact' | 'open-foreshadow' | 'chapter-summary' | 'rule'
export type CheckIssueType = 'character-ooc' | 'setting-conflict' | 'timeline-conflict' | 'open-foreshadow' | 'emotion-flow' | 'chapter-goal'
export type IssueSeverity = 'high' | 'medium' | 'low'
export type IssueStatus = 'open' | 'ignored' | 'resolved'
export type SkillCategory = 'opening' | 'outline' | 'chapter' | 'character' | 'world' | 'check' | 'polish'
export type GenerationMode = 'local' | 'web-ai' | 'api'
export type ModelProvider = 'OpenAI' | 'DeepSeek' | 'Gemini' | 'OpenRouter' | 'Custom'
export type AppTheme = 'blue' | 'green' | 'paper' | 'dark'
export type ExportFormat = 'txt' | 'markdown' | 'docx' | 'pdf' | 'epub' | 'more'
export type ExportScope = 'current' | 'selected' | 'all'
export type CommunityPostType = 'inspiration' | 'prompt' | 'skill'

export interface WorkItem {
  id: string
  title: string
  type: string
  status: WorkStatus
  projectStatus?: ProjectStatus
  words: number
  targetWords?: number
  plannedChapters?: number
  chapterCount?: number
  currentPublishStatus?: string
  weeklyUpdateGoal?: number
  authorName?: string
  publishPlatform?: PublishPlatform
  updatedAt: string
  createdAt?: string
  monthlyUpdatedChapters?: number
  tags: string[]
  summary: string
  sellingPoint?: string
  description?: string
  globalOutline?: string[]
  protagonists?: string[]
  mainCharacters?: string[]
  worldRules?: string[]
  coreConflict?: string
  cover: string
  syncState: ProjectSyncState
  enabledTools?: string[]
  toolStates?: Record<string, ToolState>
  recentTasks?: string[]
}

export interface PromptResult {
  title: string
  text: string
  summary: string
  nextStep: string
}

export interface ParsedWorkResult {
  title: string
  genre: string
  sellingPoint: string
  characters: string[]
  chapterTitle: string
  chapterText: string
  summary: string
  nextStep: string
  foreshadowing: string[]
  rawText: string
}

export interface GuideDraft {
  title: string
  idea: string
  mode: CreationMode
  genre: string
  sellingPoint: string
  characters: string[]
  chapterTitle: string
  chapterText: string
  summary: string
  nextStep: string
}

export interface SavedWork extends WorkItem {
  chapterTitle: string
  chapterText: string
  chapters?: WorkChapter[]
  materials: {
    genre: string
    sellingPoint: string
    characters: string[]
    summary: string
    nextStep: string
  }
}

export interface WorkChapter {
  id: string
  chapterNumber: number
  title: string
  content: string
  status: 'draft' | 'published'
  wordCount: number
  createdAt?: string
  updatedAt?: string
}

export interface StorylineOverview {
  workId: string
  aiSummary: {
    coreConflict: string
    mainCharacters: string
    worldSetting: string
    unresolvedHooks: string
  }
  manualSummary: {
    mainGoal: string
    emotionLine: string
    foreshadowFocus: string
    stylePace: string
  }
  currentStage: string
  genres: string[]
  status: string
}

export interface StorylineCharacter {
  id: string
  name: string
  avatar?: string
  roleType: string
  faction: string
  tags: string[]
  description: string
  statusSummary: string
}

export interface StorylineChapterNode {
  id: string
  chapterIndex: number
  chapterTitle: string
  summary: string
  mainCharacterIds: string[]
  eventIds: string[]
  locationIds: string[]
  hookIds: string[]
  emotionTags: string[]
  conflictTags: string[]
  status: 'planned' | 'draft' | 'structured' | 'developing' | 'resolved'
}

export interface StorylineEvent {
  id: string
  title: string
  description: string
  chapterIds: string[]
  characterIds: string[]
  locationId: string
  impact: string
}

export interface StorylineHook {
  id: string
  title: string
  description: string
  plantedAtChapter: number
  strengthenedAtChapters: number[]
  resolvedAtChapter?: number
  relatedCharacterIds: string[]
  relatedEventIds: string[]
  status: 'open' | 'resolved' | 'abandoned' | 'risk'
}

export interface StorylineLocation {
  id: string
  name: string
  type: string
  description: string
  relatedEventIds: string[]
}

export interface StorylinePrediction {
  id: string
  targetType: string
  predictedChapterCount: number
  summary: string
  suggestions: string[]
  confidence: number
  createdAt: string
}

export interface StorylineData {
  overview: StorylineOverview
  characters: StorylineCharacter[]
  chapters: StorylineChapterNode[]
  events: StorylineEvent[]
  hooks: StorylineHook[]
  locations: StorylineLocation[]
  predictions: StorylinePrediction[]
}

export interface LoreEntry {
  id: string
  title: string
  type: LoreType
  content: string
  tags: string[]
  relatedChapterIds: string[]
  updatedAt: string
}

export interface MemoryEntry {
  id: string
  type: MemoryType
  title: string
  content: string
  sourceChapterId: string
  updatedAt: string
  status?: 'draft' | 'confirmed' | 'rejected' | 'stale'
  confidence?: number
  sourceText?: string
  createdBy?: 'user' | 'local' | 'web-ai'
  createdAt?: string
}

export interface CheckIssue {
  id: string
  issueType: CheckIssueType
  severity: IssueSeverity
  position: string
  description: string
  suggestion: string
  status: IssueStatus
}

export interface SkillTemplate {
  id: string
  title: string
  category: SkillCategory
  summary: string
  description: string
  inputRequirements: string[]
  outputContent: string[]
  tags: string[]
  models: string[]
  promptLength: number
  usageCount: string
  favoriteCount: string
  prompt: string
  sampleResult: string
  featured?: boolean
}

export interface ModelSettings {
  generationMode: GenerationMode
  provider: ModelProvider
  baseUrl: string
  modelName: string
  apiKey: string
  routeMode: 'unified' | 'by-task'
  taskModels: {
    creation: string
    memory: string
    check: string
    agent: string
  }
  webAiSites: string[]
  promptInjection: 'auto' | 'safe' | 'custom'
  pasteStrength: 'standard' | 'enhanced' | 'extreme'
  fallbackReasons: string[]
}

export interface AppearanceSettings {
  theme: AppTheme
  sidebarCollapsed: boolean
  density: 'comfortable' | 'compact'
  contentMode: 'card' | 'list'
  editorFont: string
  editorFontSize: number
  lineHeight: number
  maxWidth: number
  focusMode: boolean
  typewriterScroll: boolean
  grammarCheck: boolean
  animationLevel: 'off' | 'low' | 'medium' | 'high'
  autosaveInterval: '10s' | '30s' | '1m' | 'off'
  historyRetention: '7d' | '30d' | 'forever'
}

export interface CommunityPost {
  id: string
  type: CommunityPostType
  title: string
  summary: string
  content: string
  author: string
  authorBadge: string
  createdAt: string
  tags: string[]
  likes: number
  favorites: number
  comments: number
  skillName?: string
  prompt?: string
}
