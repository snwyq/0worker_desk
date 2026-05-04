import { describe, expect, test } from 'vitest';
import { formatQueueErrorMessage } from '../../src/renderer/queueErrors';

describe('queue error messages', () => {
  test('formats schedule policy errors for operators', () => {
    expect(formatQueueErrorMessage(new Error('SCHEDULE_CONFLICT: account already has an active distribution task at this time')))
      .toBe('该账号在这个发布时间已有任务，请选择其他时间。');
    expect(formatQueueErrorMessage(new Error('SCHEDULE_INTERVAL_CONFLICT: account already has an active distribution task inside the minimum interval')))
      .toBe('该账号两次发布时间间隔太近，请调整到账号策略允许的时间。');
    expect(formatQueueErrorMessage(new Error('SCHEDULE_DAILY_LIMIT: account has reached the configured daily distribution limit')))
      .toBe('该账号当天发布数量已达到上限，请换一天或调整账号发布策略。');
  });

  test('keeps unknown errors visible', () => {
    expect(formatQueueErrorMessage('Unexpected failure')).toBe('Unexpected failure');
  });
});
