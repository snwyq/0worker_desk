import { describe, expect, it } from 'vitest';
import { buildWorkflowFormFields, mergeWorkflowDefaults } from '../../src/renderer/agentWorkflowForm';
import type { AiWorkflow } from '../../src/shared/types';

const workflow: AiWorkflow = {
  id: 1,
  pluginCode: 'maoxiaoxian',
  code: 'maoxiaoxian.dynamic',
  name: 'Dynamic workflow',
  definitionJson: {
    settingsSchema: {
      topic: { type: 'string', title: '热点选题', default: '今日热点' },
      count: { type: 'number', description: '生成数量', default: 3 },
      refreshHotEvents: { type: 'boolean', title: '强制刷新热点', default: false },
      reviewMode: { type: 'string', default: 'manual' },
    },
  },
  createdAt: '',
  updatedAt: '',
};

describe('agent workflow form model', () => {
  it('builds visible fields from workflow settings schema and hides system fields', () => {
    expect(buildWorkflowFormFields(workflow)).toEqual([
      expect.objectContaining({ key: 'topic', label: '热点选题', control: 'textarea', defaultValue: '今日热点' }),
      expect.objectContaining({ key: 'count', label: '生成数量', control: 'number', defaultValue: 3 }),
      expect.objectContaining({ key: 'refreshHotEvents', label: '强制刷新热点', control: 'checkbox', defaultValue: false }),
    ]);
  });

  it('merges schema defaults without overwriting operator edits', () => {
    expect(mergeWorkflowDefaults({ topic: '人工输入' }, workflow)).toEqual({
      topic: '人工输入',
      count: 3,
      refreshHotEvents: false,
      reviewMode: 'manual',
    });
  });
});
