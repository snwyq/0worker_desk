# Weibo Multi-Account Publisher MVP Design

## Goal

Build a local desktop MVP that manages multiple Weibo accounts and publishes scheduled content through already-open browser environments. The MVP focuses on proving the core publishing flow before binding tightly to any specific fingerprint browser vendor.

The first version supports manual connection to a fingerprint browser environment through either a Chrome DevTools `wsEndpoint` or a `debuggingPort`. Later versions can add provider adapters for AdsPower, BitBrowser, GoLogin, or similar products.

## Non-Goals

- Do not reverse engineer private Weibo HTTP APIs.
- Do not store Weibo usernames, passwords, SMS codes, or captcha data.
- Do not bypass login verification, captcha, platform limits, or other access controls.
- Do not implement automatic content rewriting or advanced anti-risk behavior in the MVP.
- Do not depend on one fingerprint browser vendor in the core publishing logic.

## Recommended Stack

- Desktop shell: Electron
- UI: React
- Automation: Playwright
- Local database: SQLite
- Build language: TypeScript

Electron is the preferred MVP choice because it fits naturally with Playwright and Node-based local automation. Tauri can be considered later if package size becomes more important than integration speed.

## Architecture

```text
Electron App
  |-- Account Manager
  |-- Post Queue
  |-- Publish Dashboard
  |-- Local SQLite Store
  `-- Publish Worker
        |-- Browser Connector Interface
        |     |-- ManualWsConnector
        |     `-- ManualPortConnector
        `-- WeiboPublisher
```

The UI lets the user maintain accounts, add pending posts, review logs, and mark accounts for manual handling. The worker reads queued posts, connects to the selected account browser environment, publishes to Weibo, then records the outcome.

## Browser Connection Strategy

The MVP has a small connector interface:

```text
connect(account) -> BrowserSession
disconnect(session) -> void
```

Supported MVP connection modes:

- `manual_ws`: user enters a full Chrome DevTools websocket endpoint.
- `manual_port`: user enters a local debugging port, and the app resolves the browser websocket endpoint.

Future provider modes:

- `adspower`: call AdsPower Local API to start an account environment and read its automation connection details.
- `bitbrowser`: call BitBrowser local API or automation endpoint.
- `gologin`: call GoLogin API to start/connect to an account profile.

This keeps vendor-specific code outside the publishing workflow.

## Data Model

### accounts

- `id`
- `name`
- `platform`
- `browserMode`
- `wsEndpoint`
- `debuggingPort`
- `status`
- `notes`
- `createdAt`
- `updatedAt`

Allowed account statuses:

- `active`
- `paused`
- `needs_manual_action`
- `login_expired`
- `risk_blocked`

### posts

- `id`
- `accountId`
- `content`
- `mediaPaths`
- `scheduledAt`
- `status`
- `lastError`
- `screenshotPath`
- `createdAt`
- `updatedAt`

Allowed post statuses:

- `draft`
- `queued`
- `publishing`
- `published`
- `failed`
- `needs_manual_action`

### publish_logs

- `id`
- `postId`
- `accountId`
- `level`
- `message`
- `screenshotPath`
- `createdAt`

### settings

- `key`
- `value`

## Core Publishing Flow

1. User creates a fingerprint browser environment for each Weibo account.
2. User manually logs into Weibo inside that browser environment.
3. User enters the environment `wsEndpoint` or `debuggingPort` into the desktop app.
4. User creates a post task with content, optional media paths, target account, and schedule time.
5. Publish worker finds due queued posts.
6. Worker checks that the account is `active` and has no active publishing task.
7. Worker connects to the existing browser environment through Playwright.
8. Worker opens the Weibo compose page.
9. Worker inputs text and uploads media.
10. Worker clicks publish.
11. Worker verifies whether publishing succeeded.
12. Worker records success, failure, screenshot path, and logs.

## Error Handling

The worker should classify common failures:

- Browser connection failed: mark post `failed`, keep account active.
- Weibo login page detected: mark account `login_expired`, post `needs_manual_action`.
- Captcha or verification detected: mark account `needs_manual_action`, post `needs_manual_action`.
- Upload failed: mark post `failed` and store screenshot.
- Publish confirmation not detected: mark post `failed` and store screenshot.

The MVP should avoid aggressive retries. A failed post can be retried manually from the UI.

## Risk Controls

- Only one publishing task may run per account at a time.
- Add a small random delay before publish actions.
- Do not publish identical queued posts to many accounts at the same second.
- Stop using an account when login, captcha, or verification pages appear.
- Keep screenshots and logs for every failure.
- Store all app data locally.

## Initial UI

The first screen should be the usable dashboard, not a marketing page.

Main views:

- Accounts: add/edit account connection details and see status.
- Queue: create and schedule posts.
- Runs: view recent publish attempts, screenshots, and errors.
- Settings: set default delay and screenshot folder.

The UI should be practical and dense enough for operations work: clear tables, compact forms, status badges, and direct actions.

## MVP Acceptance Criteria

- User can add at least one Weibo account with manual `wsEndpoint` or `debuggingPort`.
- User can create a queued post with text and optional local images.
- Worker can connect to an already-open browser environment.
- Worker can attempt to publish through Weibo web.
- Success and failure states are persisted in SQLite.
- Failure screenshots are saved locally.
- Login or verification blockers pause the account for manual action.

## Open Implementation Notes

- Exact Weibo selectors should be isolated inside `WeiboPublisher`, because they are likely to change.
- The worker should support a dry-run mode during early testing.
- The first runnable build can support immediate publishing before adding full scheduled polling.
- AdsPower integration should be added after manual connection proves the publishing flow.
