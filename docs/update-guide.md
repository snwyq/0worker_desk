# 0Worker Desk Update Guide

Windows builds are produced with `electron-builder`.

Use:

```bash
npm run dist:win
```

The default update provider is GitHub Releases. Configure these database settings before checking updates:

- `updates.enabled`
- `updates.owner`
- `updates.repo`
- `updates.channel`

The default package publish configuration targets `snwyq/0worker_desk` on GitHub Releases. Windows code signing should be added before public release to reduce SmartScreen warnings.

## Native SQLite Note

`better-sqlite3` is rebuilt for Electron during `npm run dist:win`. If you run Node-based tests after packaging and see a `NODE_MODULE_VERSION` mismatch, rebuild the native module for the local Node runtime:

```bash
npm rebuild better-sqlite3
```

On Windows, run this from a Visual Studio Developer Command Prompt or after loading `VsDevCmd.bat`.
