import electron from 'electron';
import electronUpdater from 'electron-updater';
import type { UpdateCheckResult, UpdateConfig } from '../../shared/types.js';
import type { AppDatabase } from '../db/database.js';

const { app } = electron;

function getAutoUpdater() {
  return electronUpdater.autoUpdater;
}

export function readUpdateConfig(repositories: AppDatabase): UpdateConfig {
  const enabled = repositories.settings.get('updates.enabled') !== 'false';
  const provider = 'github' as const;
  const owner = repositories.settings.get('updates.owner')?.trim() ?? '';
  const repo = repositories.settings.get('updates.repo')?.trim() ?? '';
  const channel = repositories.settings.get('updates.channel')?.trim() || 'latest';

  if (!enabled) {
    return {
      enabled,
      provider,
      owner,
      repo,
      channel,
      canCheck: false,
      reason: 'Update checks are disabled',
    };
  }

  if (!owner || !repo) {
    return {
      enabled,
      provider,
      owner,
      repo,
      channel,
      canCheck: false,
      reason: 'GitHub Releases owner and repo are required before update checks can run',
    };
  }

  return {
    enabled,
    provider,
    owner,
    repo,
    channel,
    canCheck: true,
  };
}

export function configureAutoUpdater(repositories: AppDatabase) {
  const config = readUpdateConfig(repositories);
  const autoUpdater = getAutoUpdater();
  autoUpdater.autoDownload = false;
  autoUpdater.allowPrerelease = config.channel !== 'latest';
  autoUpdater.setFeedURL({
    provider: config.provider,
    owner: config.owner,
    repo: config.repo,
    private: false,
  });
  return config;
}

export async function checkForUpdates(repositories: AppDatabase): Promise<UpdateCheckResult> {
  const config = readUpdateConfig(repositories);
  const currentVersion = app.getVersion();
  if (!config.canCheck) {
    return {
      ok: false,
      message: config.reason ?? 'Update checks are not available',
      currentVersion,
    };
  }

  configureAutoUpdater(repositories);
  const autoUpdater = getAutoUpdater();
  const result = await autoUpdater.checkForUpdates();
  return {
    ok: true,
    message: result?.updateInfo?.version ? `Latest version: ${result.updateInfo.version}` : 'No update metadata returned',
    currentVersion,
    updateAvailable: Boolean(result?.updateInfo?.version && result.updateInfo.version !== currentVersion),
  };
}
