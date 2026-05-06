import type { AppDatabase } from '../db/database.js';
import type {
  AnalyzeHotPeopleInput,
  AnalyzeHotPeopleResult,
  HotPeopleProvider,
  HotPeopleRetriever,
  HotPerson,
} from '../../shared/types.js';
import { AiService } from './AiService.js';
import { Solar } from 'lunar-typescript';

const DASHSCOPE_PRIMARY_MODEL = 'qwen3.5-plus';
const DASHSCOPE_CORE_MODEL = 'deepseek-v3.2';
const DASHSCOPE_VERIFY_BIRTHDAY_MODEL = 'kimi-k2.5';
const HOT_PEOPLE_MODEL_TIMEOUT_MS = 45_000;
const HOT_PEOPLE_CORE_BATCH_SIZE = 15;
const HOT_PEOPLE_CORE_CONCURRENCY = 2;

type TopicRecord = {
  id?: number;
  platform?: string;
  title?: string;
};

type Gender = HotPerson['gender'];

type EnrichedPerson = {
  name: string;
  gender: Gender;
  birthday: string;
  verifyBirthday: string;
  bio: string;
  photoUrl: string;
  promptText: string;
};

type PublicFigureEvidence = {
  id?: number;
  name?: string;
  title: string;
  summary: string;
  imageUrl: string;
  birthDate: string;
  gender: Gender;
  source?: string;
};

type PendingPersonTask = {
  name: string;
  topics: TopicRecord[];
};

type CorePersonProfile = {
  birthday: string;
  gender: Gender;
};

type TopicCoreProfile = {
  topicId: number;
  title: string;
  name: string;
  birthday: string;
  gender: Gender;
};

function parseChineseDate(value: string) {
  const match = value.replace(/\s+/g, '').match(/(\d{4})(?:\u5e74|-|\/|\.)(\d{1,2})(?:\u6708|-|\/|\.)(\d{1,2})/);
  if (!match) return null;
  return {
    year: Number(match[1]),
    month: Number(match[2]),
    day: Number(match[3]),
  };
}

function computeLunarDerivedFields(birthday: string, gender: Gender) {
  const parsed = parseChineseDate(birthday);
  if (!parsed) {
    return {
      constellation: '',
      sizhu: '',
      dayunInfo: '',
    };
  }

  const solar = Solar.fromYmdHms(parsed.year, parsed.month, parsed.day, 12, 0, 0);
  const lunar = solar.getLunar();
  const eightChar = lunar.getEightChar();
  const yun = eightChar.getYun(gender === '\u5973' ? 0 : 1, 2);
  const daYun = yun.getDaYun(8);

  return {
    constellation: solar.getXingZuo(),
    sizhu: `${eightChar.getYear()} ${eightChar.getMonth()} ${eightChar.getDay()}`,
    dayunInfo: daYun
      .map((item) => `${item.getStartYear()}-${item.getEndYear()}\u5e74(${item.getStartAge()}-${item.getEndAge()}\u5c81):${item.getGanZhi()}`)
      .join('; '),
  };
}

function clampBio(value: string) {
  return value.trim().slice(0, 150);
}

const commonChineseSurnames = new Set([
  '\u738b', '\u674e', '\u5f20', '\u5218', '\u9648', '\u6768', '\u9ec4', '\u8d75', '\u5468', '\u5434',
  '\u5f90', '\u5b59', '\u9a6c', '\u6731', '\u80e1', '\u6797', '\u90ed', '\u4f55', '\u9ad8', '\u7f57',
  '\u90d1', '\u6881', '\u8c22', '\u5b8b', '\u5510', '\u8bb8', '\u97e9', '\u51af', '\u9093', '\u66f9',
  '\u5f6d', '\u66fe', '\u8427', '\u7530', '\u8463', '\u8881', '\u6f58', '\u4e8e', '\u848b', '\u8521',
  '\u4f59', '\u675c', '\u53f6', '\u7a0b', '\u82cf', '\u9b4f', '\u5415', '\u4e01', '\u4efb', '\u5362',
  '\u59da', '\u6c88', '\u949f', '\u59dc', '\u5d14', '\u8c2d', '\u9646', '\u8303', '\u6c6a', '\u5ed6',
  '\u77f3', '\u91d1', '\u97e6', '\u590f', '\u65b9', '\u767d', '\u90b9', '\u5b5f', '\u718a', '\u79e6',
]);

const obviousNonNameWords = new Set([
  '\u70ed\u8bae',
  '\u7f51\u4f20',
  '\u7206\u6599',
  '\u665a\u4f1a',
  '\u7535\u5f71',
  '\u8282\u76ee',
  '\u6f14\u5531\u4f1a',
  '\u96be\u542c',
]);

export function sanitizeExtractedPersonName(value: string) {
  let name = value.trim();
  const leadingTokens = ['\u66dd', '\u7206', '\u7f51\u4f20', '\u70ed\u8bae'];
  const trailingTokens = [
    '\u4e0d\u662f',
    '\u56de\u5e94',
    '\u53d1\u6587',
    '\u5e26\u5973',
    '\u8bf4',
    '\u6253',
    '\u6f14',
    '\u770b',
    '\u88ab',
    '\u5f81',
    '\u8bef',
    '\u5510',
    '\u4e0d',
    '\u8d5e',
    '\u4e3a',
    '\u5a5a',
  ];
  for (const token of leadingTokens) {
    if (name.startsWith(token) && name.length > token.length + 1) {
      name = name.slice(token.length);
    }
  }
  for (const token of trailingTokens) {
    if (name.endsWith(token) && name.length > token.length + 1) {
      name = name.slice(0, -token.length);
      break;
    }
  }
  return name.trim();
}

function looksLikePersonName(value: string) {
  const name = sanitizeExtractedPersonName(value);
  if (name.length < 2 || name.length > 4) return false;
  if (obviousNonNameWords.has(name)) return false;
  if (!/^[\u4e00-\u9fa5]+$/.test(name)) return false;
  if (commonChineseSurnames.has(name.charAt(0))) return true;
  if (name.length >= 3) {
    return ['\u6b27\u9633', '\u53f8\u9a6c', '\u4e0a\u5b98', '\u8bf8\u845b', '\u4e1c\u65b9', '\u590f\u4faf'].includes(name.slice(0, 2));
  }
  return false;
}

function shouldEnterBirthdayPipeline(value: string) {
  return looksLikePersonName(value);
}

function resolveNameAgainstTasks(candidate: string, taskNames: string[]) {
  const cleanedCandidate = sanitizeExtractedPersonName(candidate);
  const direct = taskNames.find((name) => sanitizeExtractedPersonName(name) === cleanedCandidate);
  if (direct) return direct;
  const fuzzy = taskNames.find((name) => {
    const cleanedTask = sanitizeExtractedPersonName(name);
    return cleanedTask.startsWith(cleanedCandidate) || cleanedCandidate.startsWith(cleanedTask);
  });
  return fuzzy ?? cleanedCandidate;
}

function refineExtractedNameFromTitle(candidate: string, title: string) {
  let name = sanitizeExtractedPersonName(candidate);
  while (name.length >= 2 && !title.includes(name)) {
    name = sanitizeExtractedPersonName(name.slice(0, -1));
  }
  if (!title.includes(name)) return '';
  if (!shouldEnterBirthdayPipeline(name)) return '';
  return name;
}

function extractNamesFromTitle(title: string) {
  const known = ['\u4f55\u7085', '\u8c22\u5a1c', '\u6c6a\u5cf0', '\u6613\u70ca\u5343\u73ba', '\u738b\u4e00\u535a', '\u8096\u6218', '\u6797\u4f9d\u6668', '\u4e8e\u6b63'];
  const hits = known.filter((name) => title.includes(name));
  if (hits.length > 0) return hits;
  const generic = title.match(/[\u4e00-\u9fa5]{2,4}/g) ?? [];
  return generic.filter(looksLikePersonName).slice(0, 1);
}

function buildMockProfile(name: string, topic: TopicRecord): EnrichedPerson {
  if (name === '\u4f55\u7085') {
    return {
      name,
      gender: '\u7537',
      birthday: '1974\u5e744\u670828\u65e5',
      verifyBirthday: '1974\u5e744\u670828\u65e5',
      bio: '\u4f55\u7085\uff0c\u4e2d\u56fd\u77e5\u540d\u4e3b\u6301\u4eba\u3002',
      photoUrl: '',
      promptText: '\u4f55\u7085\uff0c\u4e3b\u6301\u4eba\u3002',
    };
  }
  if (name === '\u8c22\u5a1c') {
    return {
      name,
      gender: '\u5973',
      birthday: '1981\u5e745\u67086\u65e5',
      verifyBirthday: '1981\u5e745\u67086\u65e5',
      bio: '\u8c22\u5a1c\uff0c\u4e2d\u56fd\u77e5\u540d\u4e3b\u6301\u4eba\u3002',
      photoUrl: '',
      promptText: '\u8c22\u5a1c\uff0c\u4e3b\u6301\u4eba\u3002',
    };
  }
  return {
    name,
    gender: '',
    birthday: '',
    verifyBirthday: '',
    bio: '',
    photoUrl: '',
    promptText: `${name}, ${topic.title || ''}`,
  };
}

export function normalizeBirthday(value: string) {
  const direct = value.replace(/\s+/g, '').match(/(\d{4})[-/.\u5e74](\d{1,2})[-/.\u6708](\d{1,2})/);
  if (!direct) return '';
  return `${direct[1]}\u5e74${Number(direct[2])}\u6708${Number(direct[3])}\u65e5`;
}

function normalizeGender(value: string): Gender {
  const lower = value.toLowerCase();
  if (value.includes('\u7537') || lower.includes('male')) return '\u7537';
  if (value.includes('\u5973') || lower.includes('female')) return '\u5973';
  return '';
}

function extractJsonPayload(text: string) {
  const trimmed = text.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  if (fenced?.[1]) return fenced[1].trim();
  const firstArray = trimmed.indexOf('[');
  const lastArray = trimmed.lastIndexOf(']');
  if (firstArray !== -1 && lastArray !== -1 && lastArray > firstArray) {
    return trimmed.slice(firstArray, lastArray + 1);
  }
  return trimmed;
}

function chunkArray<T>(items: T[], size: number) {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
}

function safeLog(...args: unknown[]) {
  try {
    if (typeof process !== 'undefined' && process.stdout && !process.stdout.destroyed && !process.stdout.writableEnded) {
      console.log(...args);
    }
  } catch {}
}

function withTimeout<T>(promise: Promise<T>, timeoutMs: number, label: string): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error(`${label}_TIMEOUT_${timeoutMs}`)), timeoutMs);
  });
  return Promise.race([promise, timeout]).finally(() => {
    if (timer) clearTimeout(timer);
  });
}

function isProfileComplete(person: HotPerson | null) {
  if (!person) return false;
  return person.analysisStatus === 'completed'
    && Boolean(person.birthday.trim())
    && Boolean(person.verifyBirthday.trim());
}

export class HotPeopleService {
  private db: AppDatabase | null = null;
  private aiService: AiService;
  private analyzePendingPromise: Promise<AnalyzeHotPeopleResult> | null = null;
  private analyzeProgress = {
    running: false,
    selectedTopics: 0,
    processedTopics: 0,
    pendingTopics: 0,
  };

  constructor(aiService = new AiService()) {
    this.aiService = aiService;
  }

  init(db: AppDatabase) {
    this.db = db;
    this.aiService.init(db);
  }

  list(): HotPerson[] {
    return this.db?.hotPeople.list() ?? [];
  }

  getAnalyzeProgress() {
    return { ...this.analyzeProgress };
  }

  async analyzePendingHotTopics(input: AnalyzeHotPeopleInput = {}): Promise<AnalyzeHotPeopleResult> {
    if (this.analyzePendingPromise) {
      return this.analyzePendingPromise;
    }
    const run = this.runAnalyzePendingHotTopics(input);
    this.analyzePendingPromise = run;
    try {
      return await run;
    } finally {
      if (this.analyzePendingPromise === run) {
        this.analyzePendingPromise = null;
      }
    }
  }

  private async runAnalyzePendingHotTopics(input: AnalyzeHotPeopleInput = {}): Promise<AnalyzeHotPeopleResult> {
    const db = this.db;
    if (!db) throw new Error('HOT_PEOPLE_DB_NOT_READY');

    const provider = input.provider ?? 'dashscope';
    const retriever = input.retriever ?? 'wikipedia';
    const items: HotPerson[] = [];
    const seenTopicIds = new Set<number>();
    const seenItemKeys = new Set<string>();
    let selectedTopics = 0;
    let processedTopics = 0;
    let skippedTopics = 0;
    let createdCount = 0;
    let updatedCount = 0;
    let failedCount = 0;
    const failedReasons = new Set<string>();
    const batchLimit = input.limit ?? HOT_PEOPLE_CORE_BATCH_SIZE * HOT_PEOPLE_CORE_CONCURRENCY;

    this.analyzeProgress = {
      running: true,
      selectedTopics: 0,
      processedTopics: 0,
      pendingTopics: db.hotTopicAnalysis.getQueueSummary().pendingTopics,
    };

    while (true) {
      const topics = db.hotTopicAnalysis.listPending(batchLimit) as TopicRecord[];
      if (topics.length === 0) break;

      for (const topic of topics) {
        if (topic.id && !seenTopicIds.has(Number(topic.id))) {
          seenTopicIds.add(Number(topic.id));
          selectedTopics += 1;
        }
      }
      this.analyzeProgress.selectedTopics = selectedTopics;
      this.analyzeProgress.pendingTopics = db.hotTopicAnalysis.getQueueSummary().pendingTopics;

      const titlePairs = topics
        .map((topic) => ({ topic, title: String(topic.title ?? '').trim() }))
        .filter((item) => item.title);

      const coreBatches = chunkArray(
        titlePairs.map((item) => ({ id: Number(item.topic.id), title: item.title })),
        HOT_PEOPLE_CORE_BATCH_SIZE,
      );
      const coreBatchResults = await Promise.allSettled(
        coreBatches.map((batch) => this.extractCoreProfilesFromTopics(batch, provider)),
      );
      const topicCoreProfiles = new Map<string, TopicCoreProfile[]>();
      for (let index = 0; index < coreBatchResults.length; index += 1) {
        const result = coreBatchResults[index];
        const batch = coreBatches[index] ?? [];
        if (result.status === 'fulfilled') {
          for (const [key, value] of result.value.entries()) {
            topicCoreProfiles.set(key, value);
          }
          continue;
        }

        const message = result.reason instanceof Error ? result.reason.message : 'HOT_PEOPLE_TOPIC_CORE_FAILED';
        failedReasons.add(message);
        for (const failedTopic of batch) {
          db.hotTopicAnalysis.markFailed(failedTopic.id, message);
          processedTopics += 1;
        }
        failedCount += batch.length;
      }
      this.analyzeProgress.processedTopics = processedTopics;
      this.analyzeProgress.pendingTopics = db.hotTopicAnalysis.getQueueSummary().pendingTopics;
      const pendingTasks = new Map<string, PendingPersonTask>();
      const topicNameMap = new Map<number, string[]>();
      const coreProfiles = new Map<string, CorePersonProfile>();

      for (const { topic, title } of titlePairs) {
        const topicKey = `${Number(topic.id)}:${title}`;
        const coreProfileItems = topicCoreProfiles.get(topicKey) ?? [];
        const names = coreProfileItems.map((item) => item.name).filter(Boolean);
        if (topic.id) {
          db.hotTopicAnalysis.markExtracted(topic.id, names);
          topicNameMap.set(Number(topic.id), names);
          if (names.length === 0) {
            db.hotTopicAnalysis.markProcessed(topic.id, names);
            processedTopics += 1;
            skippedTopics += 1;
            this.analyzeProgress.processedTopics = processedTopics;
            this.analyzeProgress.pendingTopics = db.hotTopicAnalysis.getQueueSummary().pendingTopics;
          }
        }

        for (const name of names) {
          const cleanName = sanitizeExtractedPersonName(name);
          if (!shouldEnterBirthdayPipeline(cleanName)) continue;
          const directCoreProfile = coreProfileItems.find((item) => item.name === name || sanitizeExtractedPersonName(item.name) === cleanName);
          if (directCoreProfile?.birthday) {
            coreProfiles.set(cleanName, {
              birthday: directCoreProfile.birthday,
              gender: directCoreProfile.gender,
            });
          }
          const existing = db.hotPeople.findByName(cleanName);
          if (isProfileComplete(existing)) {
            const existingKey = `${existing?.name}:${existing?.birthday}:${existing?.updateTime}`;
            if (existing && !seenItemKeys.has(existingKey)) {
              seenItemKeys.add(existingKey);
              items.push(existing);
            }
            continue;
          }
          const current = pendingTasks.get(cleanName);
          if (current) {
            current.topics.push(topic);
          } else {
            pendingTasks.set(cleanName, { name: cleanName, topics: [topic] });
          }
        }
      }

      const tasks = Array.from(pendingTasks.values());
      const missingCoreTasks = tasks.filter((task) => !coreProfiles.get(task.name)?.birthday);
      const fallbackCoreProfiles = provider === 'mock'
        ? this.buildMockCoreProfiles(missingCoreTasks)
        : new Map<string, CorePersonProfile>();
      for (const [name, profile] of fallbackCoreProfiles.entries()) {
        coreProfiles.set(name, profile);
      }
      const birthdayFailedNames = new Set(tasks.map((task) => task.name).filter((name) => !(coreProfiles.get(name)?.birthday ?? '')));
      const verifyBirthdayTasks = tasks.filter((task) => {
        const existing = db.hotPeople.findByName(task.name);
        return !existing?.verifyBirthday && Boolean(coreProfiles.get(task.name)?.birthday);
      });
      const verifiedBirthdays = provider === 'mock'
        ? new Map<string, string>()
        : await this.verifyBirthdaysInBatch(verifyBirthdayTasks, coreProfiles);

      for (const task of tasks) {
        const existing = db.hotPeople.findByName(task.name);
        const primaryTopic = task.topics[0];
        const coreProfile = coreProfiles.get(task.name);
        if (!coreProfile?.birthday) {
          const message = 'BIRTHDAY_YMD_REQUIRED';
          failedCount += 1;
          failedReasons.add(message);
          for (const topic of task.topics) {
            if (topic.id) db.hotTopicAnalysis.markFailed(topic.id, message);
          }
          continue;
        }

        const lunar = computeLunarDerivedFields(coreProfile.birthday, coreProfile.gender);
        const saved = db.hotPeople.upsert({
          name: task.name,
          gender: coreProfile.gender,
          birthday: coreProfile.birthday,
          verifyBirthday: existing?.verifyBirthday || verifiedBirthdays.get(task.name) || '',
          bio: existing?.bio ?? '',
          constellation: lunar.constellation,
          sizhu: lunar.sizhu,
          dayunInfo: lunar.dayunInfo,
          photoUrl: existing?.photoUrl ?? '',
          promptText: existing?.promptText ?? '',
          sourceTopicTitle: String(primaryTopic.title ?? ''),
          sourcePlatform: String(primaryTopic.platform ?? ''),
          analysisStatus: 'completed',
        });
        const savedKey = `${saved.name}:${saved.birthday}:${saved.updateTime}`;
        if (!seenItemKeys.has(savedKey)) {
          seenItemKeys.add(savedKey);
          items.push(saved);
        }
        processedTopics += 1;
        this.analyzeProgress.processedTopics = processedTopics;
        this.analyzeProgress.pendingTopics = db.hotTopicAnalysis.getQueueSummary().pendingTopics;
        if (existing) updatedCount += 1;
        else createdCount += 1;
      }

      for (const { topic } of titlePairs) {
        if (!topic.id) continue;
        const names = topicNameMap.get(Number(topic.id)) ?? [];
        const hasFailedName = names.some((name) => {
          if (birthdayFailedNames.has(name)) return true;
          const person = db.hotPeople.findByName(name) ?? null;
          return !person?.birthday;
        });
        if (!hasFailedName && names.length > 0) {
          db.hotTopicAnalysis.markProcessed(Number(topic.id), names);
        }
      }

      this.analyzeProgress.pendingTopics = db.hotTopicAnalysis.getQueueSummary().pendingTopics;
    }

    const queueSummary = db.hotTopicAnalysis.getQueueSummary();
    this.analyzeProgress = {
      running: false,
      selectedTopics,
      processedTopics,
      pendingTopics: queueSummary.pendingTopics,
    };

    return {
      selectedTopics,
      processedTopics,
      skippedTopics,
      createdCount,
      updatedCount,
      failedCount,
      failedReasons: Array.from(failedReasons),
      pendingTopics: queueSummary.pendingTopics,
      coolingFailedTopics: queueSummary.coolingFailedTopics,
      nextRetryAt: queueSummary.nextRetryAt,
      items,
    };
  }

  private buildMockCoreProfiles(tasks: PendingPersonTask[]) {
    const result = new Map<string, CorePersonProfile>();
    for (const task of tasks) {
      const profile = buildMockProfile(task.name, task.topics[0]);
      if (profile.birthday) {
        result.set(task.name, { birthday: profile.birthday, gender: profile.gender });
      }
    }
    return result;
  }

  private async extractCoreProfilesFromTopics(topics: Array<{ id: number; title: string }>, provider: HotPeopleProvider) {
    const result = new Map<string, TopicCoreProfile[]>();
    if (provider === 'mock') {
      for (const topic of topics) {
        const profiles = extractNamesFromTitle(topic.title)
          .map((name) => buildMockProfile(name, { id: topic.id, title: topic.title }))
          .filter((profile) => profile.birthday)
          .map((profile) => ({
            topicId: topic.id,
            title: topic.title,
            name: profile.name,
            birthday: profile.birthday,
            gender: profile.gender,
          }));
        result.set(`${topic.id}:${topic.title}`, profiles);
      }
      return result;
    }

    const uniqueTopics = topics.filter((item) => item.title);
    if (uniqueTopics.length === 0) return result;

    const prompt = [
      '\u4f60\u662f\u70ed\u70b9\u4eba\u7269\u57fa\u7840\u8d44\u6599\u63d0\u53d6\u52a9\u624b\u3002\u8bf7\u4ece\u6bcf\u6761\u70ed\u70b9\u6807\u9898\u4e2d\u63d0\u53d6\u660e\u786e\u63d0\u5230\u7684\u516c\u4f17\u4eba\u7269\uff0c\u5e76\u8fd4\u56de\u751f\u65e5\u548c\u6027\u522b\u3002',
      '\u53ea\u8f93\u51fa JSON \u6570\u7ec4\u3002\u6bcf\u9879\u5b57\u6bb5\u53ea\u5141\u8bb8\u5305\u542b topicId, title, name, birthday, gender\u3002',
      'name \u5fc5\u987b\u662f\u7eaf\u4eba\u540d\uff0c\u4e0d\u8981\u5e26\u6807\u9898\u4e2d\u7684\u52a8\u4f5c\u3001\u72b6\u6001\u3001\u8bc4\u8bba\u6216\u4fee\u9970\u8bcd\u3002',
      'birthday \u5fc5\u987b\u7cbe\u786e\u5230\u5e74\u6708\u65e5\uff0c\u683c\u5f0f\u5982 1974\u5e744\u670828\u65e5\uff1b\u4e0d\u786e\u5b9a\u5c31\u8f93\u51fa\u7a7a\u5b57\u7b26\u4e32\u3002',
      'gender \u53ea\u80fd\u662f \u7537\u3001\u5973\u3001\u7a7a\u5b57\u7b26\u4e32\u3002\u6ca1\u6709\u660e\u786e\u516c\u4f17\u4eba\u7269\u5219\u4e0d\u8981\u8fd4\u56de\u8be5\u70ed\u70b9\u3002',
      '',
      ...uniqueTopics.map((topic, index) => `${index + 1}. topicId=${topic.id}; title=${topic.title}`),
    ].join('\n');

    const response = await withTimeout(this.aiService.generateText({
      provider,
      model: provider === 'dashscope' ? DASHSCOPE_CORE_MODEL : undefined,
      maxTokens: 1600,
      prompt,
    }), HOT_PEOPLE_MODEL_TIMEOUT_MS, 'HOT_PEOPLE_TOPIC_CORE');

    const parsed = JSON.parse(extractJsonPayload(response.content)) as Array<{
      topicId?: number;
      title?: string;
      name?: string;
      birthday?: string;
      gender?: string;
    }>;

    for (const item of parsed) {
      const topicId = Number(item.topicId ?? 0);
      const topic = uniqueTopics.find((current) => current.id === topicId)
        ?? uniqueTopics.find((current) => String(item.title ?? '') && current.title === String(item.title));
      if (!topic || !item.name) continue;
      const name = sanitizeExtractedPersonName(String(item.name));
      if (!shouldEnterBirthdayPipeline(name)) continue;
      const key = `${topic.id}:${topic.title}`;
      const existing = this.db?.hotPeople.findByName(name);
      const current = result.get(key) ?? [];
      current.push({
        topicId: topic.id,
        title: topic.title,
        name,
        birthday: existing?.birthday || normalizeBirthday(String(item.birthday ?? '')),
        gender: existing?.gender || normalizeGender(String(item.gender ?? '')),
      });
      result.set(key, current);
    }

    for (const topic of uniqueTopics) {
      if (!result.has(`${topic.id}:${topic.title}`)) {
        result.set(`${topic.id}:${topic.title}`, []);
      }
    }

    return result;
  }

  private async extractPeopleFromTopics(topics: Array<{ id: number; title: string }>, provider: HotPeopleProvider) {
    const result = new Map<string, string[]>();
    if (provider === 'mock') {
      for (const topic of topics) {
        result.set(`${topic.id}:${topic.title}`, extractNamesFromTitle(topic.title));
      }
      return result;
    }

    const uniqueTopics = topics.filter((item) => item.title);
    if (uniqueTopics.length === 0) return result;

    const prompt = [
      '\u4f60\u662f\u70ed\u70b9\u6807\u9898\u4eba\u7269\u62bd\u53d6\u52a9\u624b\u3002\u8bf7\u4ece\u6bcf\u4e00\u884c\u6807\u9898\u4e2d\u63d0\u53d6\u88ab\u660e\u786e\u63d0\u53ca\u7684\u516c\u4f17\u4eba\u7269\u59d3\u540d\u3002',
      '\u53ea\u8f93\u51fa JSON\uff0c\u5bf9\u8c61\u952e\u5fc5\u987b\u662f id:title\uff0c\u503c\u662f\u5b57\u7b26\u4e32\u6570\u7ec4\u3002',
      '\u6ca1\u6709\u4eba\u7269\u5219\u8fd4\u56de\u7a7a\u6570\u7ec4\u3002',
      '',
      ...uniqueTopics.map((topic, index) => `${index + 1}. ${topic.id}:${topic.title}`),
    ].join('\n');

    try {
      const response = await withTimeout(this.aiService.generateText({
        provider,
        model: provider === 'dashscope' ? DASHSCOPE_PRIMARY_MODEL : undefined,
        maxTokens: 1200,
        prompt,
      }), HOT_PEOPLE_MODEL_TIMEOUT_MS, 'HOT_PEOPLE_EXTRACT');
      const parsed = JSON.parse(response.content) as Record<string, string[]>;
      for (const topic of uniqueTopics) {
        const key = `${topic.id}:${topic.title}`;
        const names = Array.isArray(parsed[key])
          ? parsed[key]
            .map((item) => refineExtractedNameFromTitle(String(item), topic.title))
            .filter((item, index, items) => Boolean(item) && items.indexOf(item) === index)
          : [];
        result.set(key, names.length > 0 ? names : extractNamesFromTitle(topic.title));
      }
    } catch {
      for (const topic of uniqueTopics) {
        result.set(`${topic.id}:${topic.title}`, extractNamesFromTitle(topic.title));
      }
    }
    return result;
  }

  private async fetchCoreProfilesInBatch(tasks: PendingPersonTask[], provider: 'dashscope' | 'apiyi') {
    const result = new Map<string, CorePersonProfile>();
    if (tasks.length === 0) return result;

    for (const task of tasks) {
      const cached = this.db?.publicFigureEvidence.findByName(task.name) as PublicFigureEvidence | null;
      if (cached?.birthDate) {
        result.set(task.name, { birthday: cached.birthDate, gender: cached.gender });
      }
    }

    const unresolved = tasks.filter((task) => !result.has(task.name));
    const groups = chunkArray(unresolved, 6);
    for (const group of groups) {
      const prompt = [
        '\u4f60\u662f\u516c\u4f17\u4eba\u7269\u751f\u65e5\u548c\u6027\u522b\u63d0\u53d6\u52a9\u624b\u3002\u8bf7\u53ea\u8f93\u51fa JSON \u6570\u7ec4\u3002',
        '\u6570\u7ec4\u5b57\u6bb5\u53ea\u5141\u8bb8\u5305\u542b name, birthday, gender\u3002',
        'birthday \u5fc5\u987b\u7cbe\u786e\u5230\u5e74\u6708\u65e5\uff0c\u683c\u5f0f\u5982 1974\u5e744\u670828\u65e5\uff1b\u4e0d\u786e\u5b9a\u5c31\u8f93\u51fa\u7a7a\u5b57\u7b26\u4e32\u3002',
        'gender \u53ea\u80fd\u662f \u7537\u3001\u5973\u3001\u7a7a\u5b57\u7b26\u4e32\u3002',
        '',
        ...group.map((task, index) => `${index + 1}. \u4eba\u7269\u540d\uff1a${task.name}\uff1b\u70ed\u70b9\u6765\u6e90\uff1a${task.topics[0]?.title || ''}`),
      ].join('\n');

      try {
        const response = await withTimeout(this.aiService.generateText({
          provider,
          model: provider === 'dashscope' ? DASHSCOPE_PRIMARY_MODEL : undefined,
          maxTokens: 1200,
          prompt,
        }), HOT_PEOPLE_MODEL_TIMEOUT_MS, 'HOT_PEOPLE_CORE');
        const parsed = JSON.parse(extractJsonPayload(response.content)) as Array<{ name?: string; birthday?: string; gender?: string }>;
        for (const item of parsed) {
          if (!item?.name) continue;
          const cleanedName = resolveNameAgainstTasks(String(item.name), group.map((task) => task.name));
          const birthday = normalizeBirthday(String(item.birthday ?? ''));
          if (birthday) {
            result.set(cleanedName, { birthday, gender: normalizeGender(String(item.gender ?? '')) });
          }
        }
      } catch {
        safeLog('[HOT-PEOPLE][CORE-BATCH] failed', group.map((task) => task.name));
      }
    }

    return result;
  }

  private scheduleProfileCompletion(
    tasks: PendingPersonTask[],
    retriever: HotPeopleRetriever,
    provider: HotPeopleProvider,
    coreProfiles: Map<string, CorePersonProfile>,
  ) {
    // Disabled by product decision: enrich bio/avatar/promptText during article generation instead.
    return;
    if (tasks.length === 0 || provider === 'mock') return;
    void this.completeProfilesInBackground(tasks, retriever, provider, coreProfiles).catch((error) => {
      safeLog('[HOT-PEOPLE][BACKGROUND-COMPLETE] failed', error);
    });
  }

  private async completeProfilesInBackground(
    tasks: PendingPersonTask[],
    retriever: HotPeopleRetriever,
    provider: HotPeopleProvider,
    coreProfiles: Map<string, CorePersonProfile>,
  ) {
    const db = this.db;
    if (!db || provider === 'mock') return;

    const providerName = provider as 'dashscope' | 'apiyi';
    const [verifiedBirthdays, enrichedResults] = await Promise.all([
      this.verifyBirthdaysInBatch(tasks),
      this.enrichPeopleInBatch(tasks, retriever, provider, coreProfiles),
    ]);

    for (const task of tasks) {
      const current = db.hotPeople.findByName(task.name);
      const coreProfile = coreProfiles.get(task.name);
      if (!current || !coreProfile?.birthday) continue;
      const enriched = enrichedResults.get(task.name);
      const verifyBirthday = verifiedBirthdays.get(task.name) ?? current.verifyBirthday ?? '';
      const birthday = current.birthday || coreProfile.birthday;
      const gender = enriched?.gender || current.gender || coreProfile.gender;
      const lunar = computeLunarDerivedFields(birthday, gender);
      db.hotPeople.upsert({
        name: task.name,
        gender,
        birthday,
        verifyBirthday,
        bio: enriched?.bio ? clampBio(enriched.bio) : current.bio,
        constellation: current.constellation || lunar.constellation,
        sizhu: current.sizhu || lunar.sizhu,
        dayunInfo: current.dayunInfo || lunar.dayunInfo,
        photoUrl: enriched?.photoUrl || current.photoUrl,
        promptText: enriched?.promptText || current.promptText,
        sourceTopicTitle: current.sourceTopicTitle || String(task.topics[0]?.title ?? ''),
        sourcePlatform: current.sourcePlatform || String(task.topics[0]?.platform ?? ''),
        analysisStatus: enriched?.bio || current.bio ? 'completed' : current.analysisStatus,
      });
    }
  }

  private async enrichPeopleInBatch(
    tasks: PendingPersonTask[],
    retriever: HotPeopleRetriever,
    provider: HotPeopleProvider,
    coreProfiles: Map<string, CorePersonProfile>,
  ) {
    const result = new Map<string, EnrichedPerson>();
    if (tasks.length === 0) return result;

    if (provider === 'mock' || retriever === 'mock') {
      for (const task of tasks) {
        const profile = buildMockProfile(task.name, task.topics[0]);
        const core = coreProfiles.get(task.name);
        profile.birthday = core?.birthday ?? profile.birthday;
        profile.gender = core?.gender || profile.gender;
        result.set(task.name, profile);
      }
      return result;
    }

    const groups = chunkArray(tasks, 6);
    for (const group of groups) {
      const prompt = [
        '\u4f60\u662f\u516c\u4f17\u4eba\u7269\u8d44\u6599\u6574\u7406\u52a9\u624b\u3002\u8bf7\u6279\u91cf\u8f93\u51fa\u4e25\u683c JSON \u6570\u7ec4\u3002',
        '\u6570\u7ec4\u4e2d\u6bcf\u9879\u5fc5\u987b\u5305\u542b name, gender, birthday, bio, photoUrl, promptText\u3002',
        'bio \u5fc5\u987b\u662f\u4e2d\u6587\uff0c150\u5b57\u4ee5\u5185\u3002',
        '',
        ...group.map((task, index) => `${index + 1}. \u4eba\u7269\u540d\uff1a${task.name}\uff1b\u751f\u65e5\uff1a${coreProfiles.get(task.name)?.birthday ?? ''}\uff1b\u70ed\u70b9\uff1a${task.topics[0]?.title || ''}`),
      ].join('\n');

      try {
        const response = await withTimeout(this.aiService.generateText({
          provider,
          model: provider === 'dashscope' ? DASHSCOPE_PRIMARY_MODEL : undefined,
          maxTokens: 1800,
          prompt,
        }), HOT_PEOPLE_MODEL_TIMEOUT_MS, 'HOT_PEOPLE_PROFILE');
        const parsed = JSON.parse(extractJsonPayload(response.content)) as Array<Partial<EnrichedPerson>>;
        for (const item of parsed) {
          if (!item?.name) continue;
          const cleanedName = resolveNameAgainstTasks(String(item.name), group.map((task) => task.name));
          const core = coreProfiles.get(cleanedName);
          const enriched = {
            name: cleanedName,
            gender: normalizeGender(String(item.gender ?? core?.gender ?? '')),
            birthday: normalizeBirthday(String(item.birthday ?? core?.birthday ?? '')) || core?.birthday || '',
            verifyBirthday: '',
            bio: clampBio(String(item.bio ?? '')),
            photoUrl: String(item.photoUrl ?? ''),
            promptText: String(item.promptText ?? ''),
          };
          result.set(cleanedName, enriched);
          this.db?.publicFigureEvidence.upsert({
            name: cleanedName,
            title: cleanedName,
            summary: enriched.bio,
            imageUrl: enriched.photoUrl,
            birthDate: enriched.birthday,
            gender: enriched.gender,
            source: 'model',
          });
        }
      } catch {
        safeLog('[HOT-PEOPLE][PROFILE-BATCH] failed', group.map((task) => task.name));
      }
    }

    return result;
  }

  private async verifyBirthdaysInBatch(
    tasks: PendingPersonTask[],
    coreProfiles = new Map<string, CorePersonProfile>(),
  ) {
    const result = new Map<string, string>();
    const groups = chunkArray(tasks, 6);
    for (const group of groups) {
      const prompt = [
        '\u4f60\u662f\u516c\u4f17\u4eba\u7269\u751f\u65e5\u6821\u9a8c\u52a9\u624b\u3002\u8bf7\u53ea\u8f93\u51fa JSON \u6570\u7ec4\u3002',
        '\u6570\u7ec4\u5b57\u6bb5\u53ea\u5141\u8bb8\u5305\u542b name, verifyBirthday\u3002',
        'verifyBirthday \u5fc5\u987b\u7cbe\u786e\u5230\u5e74\u6708\u65e5\uff1b\u4e0d\u786e\u5b9a\u5c31\u8f93\u51fa\u7a7a\u5b57\u7b26\u4e32\u3002',
        '',
        ...group.map((task, index) => `${index + 1}. \u4eba\u7269\u540d\uff1a${task.name}\uff1b\u7b2c\u4e00\u8f6e\u751f\u65e5\uff1a${coreProfiles.get(task.name)?.birthday ?? ''}\uff1b\u70ed\u70b9\uff1a${task.topics[0]?.title || ''}`),
      ].join('\n');
      try {
        const response = await withTimeout(this.aiService.generateText({
          provider: 'dashscope',
          model: DASHSCOPE_VERIFY_BIRTHDAY_MODEL,
          maxTokens: 900,
          prompt,
        }), HOT_PEOPLE_MODEL_TIMEOUT_MS, 'HOT_PEOPLE_VERIFY_BIRTHDAY');
        const parsed = JSON.parse(extractJsonPayload(response.content)) as Array<{ name?: string; verifyBirthday?: string }>;
        for (const item of parsed) {
          if (!item?.name) continue;
          const cleanedName = resolveNameAgainstTasks(String(item.name), group.map((task) => task.name));
          result.set(cleanedName, normalizeBirthday(String(item.verifyBirthday ?? '')));
        }
      } catch {
        safeLog('[HOT-PEOPLE][VERIFY-BIRTHDAY] failed', group.map((task) => task.name));
      }
    }
    return result;
  }
}

export const hotPeopleService = new HotPeopleService();
