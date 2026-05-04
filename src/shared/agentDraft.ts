export const AGENT_DRAFT_STORAGE_KEY = '0worker.agentDraft';

export type AgentDraftSource = {
  platform?: string;
  title?: string;
  desc?: string;
  url?: string;
  mobileUrl?: string;
  rank?: number | string;
  hotValue?: string | number;
};

export type AgentDraft = {
  topic: string;
  requirement: string;
  source: AgentDraftSource;
  createdAt: string;
};

function readText(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function readTopic(topic: AgentDraftSource): string {
  return readText(topic.title) || '今日热点';
}

export function buildRequirementFromHotTopic(topic: AgentDraftSource): string {
  const title = readTopic(topic);
  const platform = readText(topic.platform) || '热点平台';
  const desc = readText(topic.desc);
  const rank = topic.rank !== undefined && topic.rank !== null && String(topic.rank).trim()
    ? `排行：${topic.rank}`
    : '';
  const hotValue = topic.hotValue !== undefined && topic.hotValue !== null && String(topic.hotValue).trim()
    ? `热度：${topic.hotValue}`
    : '';
  const context = [desc, rank, hotValue].filter(Boolean).join('；');

  return [
    `围绕${platform}热点“${title}”生成一条微博内容。`,
    context ? `可参考素材：${context}。` : '',
    '要求控制在 180 字以内，有明确观点或情绪价值，避免编造未经素材提供的新事实，保留人工审核空间。',
  ].filter(Boolean).join('\n');
}

export function buildAgentDraftFromHotTopic(topic: AgentDraftSource): AgentDraft {
  return {
    topic: readTopic(topic),
    requirement: buildRequirementFromHotTopic(topic),
    source: {
      platform: readText(topic.platform) || undefined,
      title: readTopic(topic),
      desc: readText(topic.desc) || undefined,
      url: readText(topic.url) || undefined,
      mobileUrl: readText(topic.mobileUrl) || undefined,
      rank: topic.rank,
      hotValue: topic.hotValue,
    },
    createdAt: new Date().toISOString(),
  };
}
