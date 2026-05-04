export type GeneratedContentResult = {
  content: string;
  sourceKey: string;
};

const preferredKeys = [
  'final_post',
  'finalContent',
  'finalPost',
  'weiboContent',
  'content',
  'body',
  'text',
];

const nestedContentKeys = ['body', 'content', 'text', 'final_post', 'finalContent'];

function stringifyContent(value: unknown): string {
  if (typeof value === 'string') {
    return value.trim();
  }
  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }
  if (value && typeof value === 'object') {
    const record = value as Record<string, unknown>;
    for (const key of nestedContentKeys) {
      const nested = stringifyContent(record[key]);
      if (nested) {
        return nested;
      }
    }
  }
  return '';
}

export function extractGeneratedContent(state: Record<string, unknown>): GeneratedContentResult | null {
  for (const key of preferredKeys) {
    const content = stringifyContent(state[key]);
    if (content) {
      return { content, sourceKey: key };
    }
  }

  for (const [key, value] of Object.entries(state)) {
    const content = stringifyContent(value);
    if (content && /post|content|draft|result|output/i.test(key)) {
      return { content, sourceKey: key };
    }
  }

  return null;
}
