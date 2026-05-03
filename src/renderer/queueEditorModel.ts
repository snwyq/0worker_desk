import type { ContentItem, DistributionTask } from '../shared/types';

export function readTaskEditorDraft(task: DistributionTask, contents: ContentItem[] = []) {
  const payload = task.platformPayload ?? {};
  const payloadContent = typeof payload.content === 'string' ? payload.content : '';
  const contentHtml = payloadContent || contents.find((item) => item.id === task.contentId)?.body || '';

  const mediaPaths = Array.isArray(payload.mediaPaths)
    ? payload.mediaPaths.filter((item): item is string => typeof item === 'string')
    : [];

  return {
    contentHtml,
    mediaPathsText: mediaPaths.join('\n'),
  };
}
