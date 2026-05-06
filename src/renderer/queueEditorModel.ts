import type { ContentItem, DistributionTask } from '../shared/types';
import { normalizePublishMediaPaths } from '../shared/mediaPaths';

export function readTaskEditorDraft(task: DistributionTask, contents: ContentItem[] = []) {
  const payload = task.platformPayload ?? {};
  const payloadContent = typeof payload.content === 'string' ? payload.content : '';
  const contentHtml = payloadContent || contents.find((item) => item.id === task.contentId)?.body || '';

  const mediaPaths = Array.isArray(payload.mediaPaths)
    ? normalizePublishMediaPaths(payload.mediaPaths)
    : [];

  return {
    contentHtml,
    mediaPathsText: mediaPaths.join('\n'),
  };
}
