import fs from 'node:fs';
import path from 'node:path';

export interface HelpDocsPayload {
  userGuide: string;
  updateGuide: string;
  releaseNotes: string;
}

export function readHelpDocs(workspaceRoot: string): HelpDocsPayload {
  return {
    userGuide: fs.readFileSync(path.join(workspaceRoot, 'docs', 'user-guide.md'), 'utf8'),
    updateGuide: fs.readFileSync(path.join(workspaceRoot, 'docs', 'update-guide.md'), 'utf8'),
    releaseNotes: fs.readFileSync(path.join(workspaceRoot, 'docs', 'releases', '0.1.0.md'), 'utf8'),
  };
}
