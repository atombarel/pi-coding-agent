# Architecture

This repository is a setup layer for upstream Pi.

## Boundaries

Pi owns:

- terminal interface
- agent loop
- context handling
- tool execution
- sessions
- provider integrations
- OAuth and API-key auth

This repo owns:

- personal defaults
- project-local Pi resources
- no-clone install/update bootstrap
- small extensions
- reusable skills
- provider and model recipes
- setup checks

## No-Clone Install

The supported machine setup path is:

```bash
curl -fsSL https://raw.githubusercontent.com/atombarel/personal-pi-setup/main/scripts/install-or-update.zsh | zsh
```

The shell bootstrap downloads a temporary GitHub archive for the selected repo ref and runs the Node installer from that snapshot. It does not create or maintain a Git checkout.

The installer owns these global Pi files:

- `~/.pi/agent/settings.json`, merged with backups
- `~/.pi/agent/pi-permissions.jsonc`, copied from `templates/permissions/`
- `~/.pi/agent/extensions/pi-tool-display/config.json`, copied from `templates/tool-display/`
- `~/.pi/agent/personal-pi-setup/`, replaced with repo-managed extensions, skills, prompts, themes, templates, and docs

The installer does not copy provider credentials, model overrides, session files, or `.env` files.

## Provider Lanes

### OpenAI Codex

Use Pi's `openai-codex` provider. Authenticate through `/login` in the Pi TUI. This is the default lane because it keeps subscription auth inside Pi.

### GitHub Copilot

Use Pi's `github-copilot` provider. Authenticate through `/login`. Keep it available as a practical fallback and comparison lane.

### OpenRouter

Use Pi's `openrouter` provider with `OPENROUTER_API_KEY` or Pi auth storage. Store custom routing and model overrides in `~/.pi/agent/models.json`; this repo keeps a starter template under `templates/`.

## Extension Policy

Local extensions should stay small:

- guard sensitive operations
- add commands
- inject small context
- improve status display

Avoid extensions that replace core Pi behavior unless the upstream extension point is clearly meant for it.
