import type { AiWorkflow } from '../shared/types';

export type WorkflowFormField = {
  key: string;
  label: string;
  description: string;
  control: 'text' | 'textarea' | 'number' | 'checkbox';
  defaultValue: string | number | boolean;
};

const hiddenKeys = new Set(['accountId', 'styleId', 'reviewMode']);

type SchemaEntry = {
  type?: string;
  title?: string;
  description?: string;
  default?: unknown;
};

function readSchema(workflow: AiWorkflow | null): Record<string, SchemaEntry> {
  const definition = workflow?.definitionJson ?? {};
  const settingsSchema = definition.settingsSchema;
  if (settingsSchema && typeof settingsSchema === 'object' && !Array.isArray(settingsSchema)) {
    return settingsSchema as Record<string, SchemaEntry>;
  }

  const inputSchema = definition.inputSchema;
  if (inputSchema && typeof inputSchema === 'object' && !Array.isArray(inputSchema)) {
    const properties = (inputSchema as { properties?: unknown }).properties;
    if (properties && typeof properties === 'object' && !Array.isArray(properties)) {
      return properties as Record<string, SchemaEntry>;
    }
  }

  return {};
}

function defaultFor(type: string | undefined, explicit: unknown): string | number | boolean {
  if (typeof explicit === 'string' || typeof explicit === 'number' || typeof explicit === 'boolean') {
    return explicit;
  }
  if (type === 'number' || type === 'integer') return 1;
  if (type === 'boolean') return false;
  return '';
}

function controlFor(key: string, type: string | undefined): WorkflowFormField['control'] {
  if (type === 'number' || type === 'integer') return 'number';
  if (type === 'boolean') return 'checkbox';
  const lowerKey = key.toLowerCase();
  return lowerKey.includes('topic') || lowerKey.includes('requirement') || lowerKey.includes('persona') ? 'textarea' : 'text';
}

export function buildWorkflowFormFields(workflow: AiWorkflow | null): WorkflowFormField[] {
  return Object.entries(readSchema(workflow))
    .filter(([key]) => !hiddenKeys.has(key))
    .map(([key, entry]) => ({
      key,
      label: entry.title || entry.description || key,
      description: entry.description || '',
      control: controlFor(key, entry.type),
      defaultValue: defaultFor(entry.type, entry.default),
    }));
}

export function mergeWorkflowDefaults(current: Record<string, unknown>, workflow: AiWorkflow | null): Record<string, unknown> {
  const next = { ...current };
  for (const [key, entry] of Object.entries(readSchema(workflow))) {
    if (next[key] === undefined || next[key] === '') {
      next[key] = defaultFor(entry.type, entry.default);
    }
  }
  return next;
}
