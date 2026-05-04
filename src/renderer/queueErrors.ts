export function formatQueueErrorMessage(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  if (message.includes('SCHEDULE_CONFLICT')) {
    return '该账号在这个发布时间已有任务，请选择其他时间。';
  }
  if (message.includes('SCHEDULE_INTERVAL_CONFLICT')) {
    return '该账号两次发布时间间隔太近，请调整到账号策略允许的时间。';
  }
  if (message.includes('SCHEDULE_DAILY_LIMIT')) {
    return '该账号当天发布数量已达到上限，请换一天或调整账号发布策略。';
  }
  return message;
}
