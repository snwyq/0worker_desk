import { describe, expect, test } from 'vitest';
import { buildAgentDraftFromHotTopic, buildRequirementFromHotTopic } from '../../src/shared/agentDraft.js';

describe('agent draft handoff', () => {
  test('builds a focused Agent draft from a hot topic mirror row', () => {
    const draft = buildAgentDraftFromHotTopic({
      platform: '微博',
      title: '某明星新剧开播',
      desc: '讨论集中在角色反差和剧情节奏',
      url: 'https://weibo.com/example',
      rank: 3,
      hotValue: '188万',
    });

    expect(draft.topic).toBe('某明星新剧开播');
    expect(draft.source.platform).toBe('微博');
    expect(draft.source.url).toBe('https://weibo.com/example');
    expect(draft.requirement).toContain('某明星新剧开播');
    expect(draft.requirement).toContain('讨论集中在角色反差和剧情节奏');
    expect(draft.requirement).toContain('微博');
    expect(draft.createdAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  test('falls back to a safe topic and compact requirement when mirror fields are sparse', () => {
    const requirement = buildRequirementFromHotTopic({ title: '  ', platform: '知乎' });

    expect(requirement).toContain('今日热点');
    expect(requirement).toContain('知乎');
    expect(requirement.length).toBeLessThan(260);
  });
});
