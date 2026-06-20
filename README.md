# Personal Pi Setup

Personal configuration for [Pi](https://pi.dev/), tuned for day-to-day coding work across Codex, GitHub Copilot, and OpenRouter-backed models.

The repository keeps Pi settings, local skills, prompt templates, model recipes, and setup checks in one place so a machine can be made ready with one install/update command.

It also loads a small RTK integration for token-efficient shell output in Pi sessions.
Permission, tool-display, and theme resources are installed from this repo so Pi feels closer to Codex/Claude Code in daily use.

## Quick Start

```bash
curl -fsSL https://raw.githubusercontent.com/atombarel/personal-pi-setup/main/scripts/install-or-update.zsh | zsh
pi
```

Run the same command later to update the machine from the latest repo reference. It does not clone this repository or leave a Git checkout behind; it downloads a temporary archive snapshot, installs the repo-managed Pi resources into `~/.pi/agent`, installs the pinned Pi CLI and Pi packages, verifies the result, then removes the snapshot.

Use a specific branch, tag, or commit when needed:

```bash
curl -fsSL https://raw.githubusercontent.com/atombarel/personal-pi-setup/main/scripts/install-or-update.zsh | PI_SETUP_REF=main zsh
```

If you are already inside a checkout of this repo, the equivalent local command is:

```bash
npm run install:update
```

For a one-off non-interactive run:

```bash
pi -p "summarize this repo"
```

## Layout

```text
.
├── .pi/
│   ├── settings.json
│   ├── agent/pi-permissions.jsonc
│   ├── extensions/pi-workbench.ts
│   ├── themes/pi-studio-dark.json
│   ├── skills/
│   └── prompts/
├── templates/
│   ├── models.openrouter.example.json
│   ├── permissions/
│   ├── tool-display/
│   └── settings.enabled-models.example.json
├── scripts/
│   ├── check-config.mjs
│   └── doctor.mjs
├── AGENTS.md
└── package.json
```

## Running Pi

Default installed settings use `openai-codex` with high thinking:

```bash
pi
```

Pass Pi flags directly:

```bash
pi --provider openai-codex
pi --provider github-copilot
OPENROUTER_API_KEY=... pi --provider openrouter --model moonshotai/kimi-k2.6
```

From a repo checkout, `npm run pi` still works:

```bash
npm run pi -- --provider openai-codex
```

## Thinking Level

The project default is:

```json
{
  "defaultThinkingLevel": "high"
}
```

In the Pi TUI, the active thinking level is shown in the footer next to the active model, for example:

```text
(openai-codex) gpt-5.5 • high
```

If the active model supports reasoning, cycle levels with `Shift+Tab`. Valid CLI/config levels are:

```text
off, minimal, low, medium, high, xhigh
```

You can also set thinking explicitly at launch:

```bash
pi --thinking high
pi --model openai-codex/gpt-5.5:high
```

For model cycling, append the level to each pattern in `enabledModels`, as in:

```json
"openai-codex/gpt-5.5:high"
```

`pi --list-models` only shows whether a model supports thinking; it does not show your current selected thinking level.

## Providers

### OpenAI Codex

```bash
pi --provider openai-codex
```

Authenticate from inside Pi:

```text
/login
```

Choose ChatGPT Plus/Pro (Codex). Pi stores and refreshes credentials in `~/.pi/agent/auth.json`.

This is the default lane for subscription-backed OpenAI models. In Pi `0.79.8`, this provider exposes:

```text
gpt-5.5
gpt-5.4
gpt-5.4-mini
gpt-5.3-codex-spark
```

### OpenAI API

Use this lane when you want direct OpenAI API-key models instead of ChatGPT/Codex subscription auth:

```bash
OPENAI_API_KEY=... pi --provider openai --model gpt-5.5
```

The model-cycling template includes GPT-5.5, GPT-5.5 Pro, GPT-5.4, GPT-5.4 mini, and GPT-5.4 nano. Actual access depends on the OpenAI account and API key.

### GitHub Copilot

```bash
pi --provider github-copilot --models "github-copilot/*"
```

Authenticate through `/login`, then choose GitHub Copilot. If a model is unavailable, enable it from the VS Code Copilot Chat model selector first.

### OpenRouter

```bash
OPENROUTER_API_KEY=... pi --provider openrouter --model moonshotai/kimi-k2.6
```

OpenRouter credentials can also be saved through `/login` or `~/.pi/agent/auth.json`.

## RTK

This setup installs [`@sherif-fanous/pi-rtk`](https://www.npmjs.com/package/@sherif-fanous/pi-rtk) as a project Pi package:

```json
{
  "packages": ["npm:@sherif-fanous/pi-rtk@0.6.0"]
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

Project package installs are cached under `.pi/npm/`, which is intentionally ignored. The pinned package references in `.pi/settings.json` are the source of truth.

## Plan Mode

This setup installs [`@narumitw/pi-plan-mode`](https://www.npmjs.com/package/@narumitw/pi-plan-mode) as a project Pi package. It adds a Codex-like read-only planning mode for exploration, clarifying questions, and an explicit implementation handoff.

Inside Pi:

```text
/plan
/plan <prompt>
/plan tools
/plan exit
```

You can also start Pi directly in plan mode:

```bash
npm run pi -- --plan
```

While plan mode is active, Pi should inspect files and run read-only commands, but block edits/writes and mutating shell commands. When the plan is ready, the extension prompts whether to implement, stay in plan mode, or exit.

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

The screenshot-friendly default for this setup is the balanced preset:

```bash
npm run tool-display:preset -- balanced
```

That writes:

```text
~/.pi/agent/extensions/pi-tool-display/config.json
```

Balanced mode keeps tool calls much tighter by rendering read output as summaries, search output as counts, MCP output as summaries, and bash output as line counts. Restart Pi or run `/reload` after changing it.

## Theme

The active project theme is:

```text
.pi/themes/pi-studio-dark.json
```

It uses warm neutral surfaces, a teal accent, and a neutral completed-tool background. Success, warning, and error colors are still available as text accents and diff colors.

Theme loading is enabled from `.pi/settings.json`:

```json
{
  "theme": "pi-studio-dark",
  "themes": ["themes"]
}
```

Restart Pi after changing the selected theme. Edits to an already loaded theme can usually be refreshed with `/reload`.

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

The example includes two OpenAI lanes:

- `openai-codex/...`: ChatGPT/Codex subscription auth through Pi `/login`.
- `openai/...`: direct OpenAI API-key models through `OPENAI_API_KEY`.

## Local Resources

The no-clone installer copies repo-managed resources under:

```text
~/.pi/agent/personal-pi-setup/
```

It adds those paths to global Pi settings in `~/.pi/agent/settings.json`:

```json
{
  "extensions": ["personal-pi-setup/extensions/pi-workbench.ts"],
  "skills": ["personal-pi-setup/skills"],
  "prompts": ["personal-pi-setup/prompts"],
  "themes": ["personal-pi-setup/themes"]
}
```

In a repo checkout, paths in [`.pi/settings.json`](.pi/settings.json) resolve relative to `.pi`.

```json
{
  "extensions": ["extensions/pi-workbench.ts"],
  "skills": ["skills"],
  "prompts": ["prompts"],
  "themes": ["themes"]
}
```

Current resources:

- `/pi-status`: shows the personal setup status and provider lanes.
- `/rtk`: controls RTK command rewriting for the current Pi session.
- `/permission-system`: opens permission settings and YOLO controls.
- `/tool-display`: controls compact tool rendering and diff display.
- `plan` skill: ordered tasks, vertical slices, acceptance criteria, checkpoints, and verification.
- `review` skill: findings-first review across correctness, readability, architecture, security, and performance.
- `provider-smoke` prompt: small read-only prompt for comparing providers.

## Checks

```bash
npm run install:check
npm run check
npm run audit
npm run doctor
```

`install:check` validates the no-clone global install path in a temporary Pi agent directory. `check` validates local config, confirms the Pi binary version, and fails if sensitive Pi runtime paths are tracked by Git. `audit` blocks moderate-or-higher npm advisories. `doctor` also reports optional auth/model state, including whether `~/.pi/agent/models.json` and `OPENROUTER_API_KEY` are present, without printing secret values.

## Enterprise Readiness

This repo is intentionally a thin setup layer around upstream Pi. It should stay easy to audit, rebase, and operate in company worktrees.

Enterprise controls live in:

- [Security policy](SECURITY.md)
- [Architecture boundaries](docs/architecture.md)
- [Enterprise readiness checklist](docs/enterprise-readiness.md)
- [Code ownership](.github/CODEOWNERS)
- [Dependabot updates for root npm and GitHub Actions](.github/dependabot.yml)
- [CI](.github/workflows/ci.yml)

Sensitive local state is ignored by default:

- `.env` and `.env.*`
- `.pi/sessions/`
- `.pi/npm/`
- `.pi/agent/auth.json`
- `.pi/agent/models.json`

Before using this setup in a company repository, require PR review, require CI on `main`, keep Dependabot enabled for tracked dependency manifests, review Pi package pin bumps intentionally, and use `review` or `balanced` permission modes unless the worktree is trusted and disposable.
