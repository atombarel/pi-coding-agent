# Personal Pi Setup

Personal configuration for [Pi](https://pi.dev/), tuned for day-to-day coding work across Codex, GitHub Copilot, and OpenRouter-backed models.

The repository keeps Pi settings, local skills, prompt templates, model recipes, and setup checks in one place so a machine can be made ready with a small number of commands.

It also loads a small RTK integration for token-efficient shell output in Pi sessions.
Permission and tool-display extensions are installed as project packages so Pi feels closer to Codex/Claude Code in daily use.

## Quick Start

```bash
npm install
npm run check
npm run pi
```

On the first interactive launch, trust the project so Pi loads the local `.pi` resources:

```text
/trust
```

Restart Pi after saving the trust decision.

For a one-off non-interactive run:

```bash
npx pi --approve -p "summarize this repo"
```

## Layout

```text
.
├── .pi/
│   ├── settings.json
│   ├── agent/pi-permissions.jsonc
│   ├── extensions/pi-workbench.ts
│   ├── skills/
│   └── prompts/
├── templates/
│   ├── models.openrouter.example.json
│   ├── permissions/
│   └── settings.enabled-models.example.json
├── scripts/
│   ├── check-config.mjs
│   └── doctor.mjs
├── AGENTS.md
└── package.json
```

## Running Pi

Default project settings use `openai-codex` with high thinking:

```bash
npm run pi
```

Pass Pi flags after `--`:

```bash
npm run pi -- --provider openai-codex
npm run pi -- --provider github-copilot
OPENROUTER_API_KEY=... npm run pi -- --provider openrouter --model moonshotai/kimi-k2.6
```

The local binary is also available through `npx`:

```bash
npx pi --provider openai-codex
```

## Providers

### OpenAI Codex

```bash
npm run pi -- --provider openai-codex
```

Authenticate from inside Pi:

```text
/login
```

Choose ChatGPT Plus/Pro (Codex). Pi stores and refreshes credentials in `~/.pi/agent/auth.json`.

### GitHub Copilot

```bash
npm run pi -- --provider github-copilot --models "github-copilot/*"
```

Authenticate through `/login`, then choose GitHub Copilot. If a model is unavailable, enable it from the VS Code Copilot Chat model selector first.

### OpenRouter

```bash
OPENROUTER_API_KEY=... npm run pi -- --provider openrouter --model moonshotai/kimi-k2.6
```

OpenRouter credentials can also be saved through `/login` or `~/.pi/agent/auth.json`.

## RTK

This setup installs [`@sherif-fanous/pi-rtk`](https://www.npmjs.com/package/@sherif-fanous/pi-rtk) as a project Pi package:

```json
{
  "packages": ["npm:@sherif-fanous/pi-rtk"]
}
```

The extension routes Pi bash commands through [`rtk rewrite`](https://github.com/rtk-ai/rtk) when possible, then falls back to normal shell behavior if RTK cannot rewrite a command.

Install RTK locally before relying on it:

```bash
which rtk
rtk --version
```

Inside Pi:

```text
/rtk status
/rtk disable
/rtk enable
```

Project package installs are cached under `.pi/npm/`, which is intentionally ignored. The package reference in `.pi/settings.json` is the source of truth.

## Permissions

This setup installs [`pi-permission-system`](https://www.npmjs.com/package/pi-permission-system) as a project Pi package. The active policy is:

```text
.pi/agent/pi-permissions.jsonc
```

The default mode is `balanced`:

- read/search/list operations are allowed
- edits and writes ask
- most shell commands ask
- common read-only shell commands are allowed
- `sudo`, `rm -rf`, hard resets, and destructive clean commands are denied
- external-directory access asks

Switch modes with:

```bash
npm run permissions:mode -- balanced
npm run permissions:mode -- review
npm run permissions:mode -- yolo
```

Modes:

- `balanced`: normal coding mode with approvals for mutations.
- `review`: read-only review mode; writes/edits are denied and only read-only shell commands are allowed.
- `yolo`: edits, writes, and shell are broadly allowed, while the most destructive commands still ask or deny.

Inside Pi:

```text
/permission-system
```

Use that modal for runtime controls such as YOLO mode.

## Tool Display

This setup installs [`pi-tool-display`](https://www.npmjs.com/package/pi-tool-display) as a project Pi package. It gives Pi a more compact, OpenCode-style tool display with better edit/write diffs and cleaner tool output rendering.

Inside Pi:

```text
/tool-display
/tool-display preset opencode
/tool-display preset balanced
/tool-display preset verbose
```

The package defaults are used initially. Runtime config is owned by Pi under `~/.pi/agent/extensions/pi-tool-display/`.

## Model Files

Pi's custom provider and model definitions live at:

```text
~/.pi/agent/models.json
```

This repo includes an OpenRouter starter:

```bash
mkdir -p ~/.pi/agent
cp templates/models.openrouter.example.json ~/.pi/agent/models.json
```

Keep secrets out of this repository. Prefer `/login`, environment variables, 1Password, or macOS Keychain command interpolation for credentials.

## Model Cycling

Pi cycles models with `Ctrl+P` using the `enabledModels` setting.

The default project settings do not enable a cycling list because unauthenticated providers generate noisy warnings. After logging in, copy the block from:

```text
templates/settings.enabled-models.example.json
```

into either project settings or global settings:

```text
.pi/settings.json
~/.pi/agent/settings.json
```

## Local Resources

Paths in [`.pi/settings.json`](.pi/settings.json) resolve relative to `.pi`.

```json
{
  "extensions": ["extensions/pi-workbench.ts"],
  "skills": ["skills"],
  "prompts": ["prompts"]
}
```

Current resources:

- `/pi-status`: shows the personal setup status and provider lanes.
- `/rtk`: controls RTK command rewriting for the current Pi session.
- `/permission-system`: opens permission settings and YOLO controls.
- `/tool-display`: controls compact tool rendering and diff display.
- `plan` skill: short planning mode for ambiguous work.
- `review` skill: findings-first code review mode.
- `provider-smoke` prompt: small read-only prompt for comparing providers.

## Checks

```bash
npm run check
npm run doctor
```

`check` validates local config and confirms the Pi binary version. `doctor` also reports optional auth/model state, including whether `~/.pi/agent/models.json` and `OPENROUTER_API_KEY` are present.
