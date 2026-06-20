# Security Policy

## Scope

This repository stores Pi configuration, local extensions, skills, prompt templates, and setup checks. It must not store provider credentials, Pi OAuth tokens, private session transcripts, or machine-local model definitions.

## Supported Version

The supported version is the current `main` branch. Keep this repository rebased against upstream Pi behavior and prefer upstream Pi extension points over local runtime forks.

## Secret Handling

- Use `/login` for OpenAI Codex and GitHub Copilot subscription auth.
- Use environment variables, 1Password, macOS Keychain, or Pi auth storage for API keys.
- Do not commit `.env`, `.env.*`, `.pi/sessions/`, `.pi/npm/`, `.pi/agent/auth.json`, or `.pi/agent/models.json`.
- The no-clone installer updates global Pi setup files under `~/.pi/agent`, but it does not copy provider auth, model overrides, session transcripts, or `.env` files from this repository.
- The installer backs up changed global settings and config files before writing replacements.
- Treat session transcripts as sensitive. They can contain prompts, file paths, command output, credentials copied into terminals, and proprietary code context.
- Rotate any provider key that may have been copied into a prompt, shell command, or committed file.

## Reporting

Report suspected leaks or unsafe defaults privately to the repository owner. Include the affected file path, the exposed secret or sensitive data type, and the commit range if known.

## Security Gates

Run these before pushing:

```bash
npm run install:check
npm run check
npm run audit
npm run doctor
```

`npm run install:check` validates the installer against the current checkout in a temporary Pi agent directory. `npm run check` validates required Pi resources and fails if sensitive runtime paths are tracked by Git. `npm run audit` blocks known moderate-or-higher npm advisories. `npm run doctor` reports local optional state without printing secret values.
