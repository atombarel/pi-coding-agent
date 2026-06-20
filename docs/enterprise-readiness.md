# Enterprise Readiness

This project is enterprise-ready when it remains a thin, auditable setup layer around upstream Pi and can be operated without leaking credentials, session data, or provider-specific assumptions.

## Operating Principles

- Keep upstream Pi responsible for the TUI, agent loop, tool execution, provider integrations, context handling, sessions, and auth.
- Keep this repository responsible for defaults, small extensions, skills, prompt templates, provider recipes, and checks.
- Prefer configuration and documented extension points over runtime forks.
- Make safety posture visible in Git, CI, and local checks.

## Current Posture

- Provider auth is delegated to Pi `/login` or environment-backed provider config.
- The supported setup path is a no-clone archive bootstrap that installs repo-managed resources into `~/.pi/agent` and can be rerun for updates.
- The default provider lane is `openai-codex`, preserving Codex subscription auth as a first-class path.
- OpenRouter remains a separate provider lane with `data_collection` denied in the example model overrides that support it.
- Permission policies are explicit, with `balanced`, `review`, and `yolo` templates.
- Project packages are pinned in `.pi/settings.json`; install output under `.pi/npm/` is ignored.
- Session transcripts under `.pi/sessions/` are ignored and treated as sensitive.
- CI runs configuration validation, Pi version smoke testing, npm audit, and the local doctor.

## Required Controls

Before this setup is used in a company repository:

- Require pull requests for changes to `main`.
- Require the CI workflow to pass before merge.
- Require review from `CODEOWNERS` for configuration, permission, workflow, and extension changes.
- Keep Dependabot enabled for root npm and GitHub Actions updates.
- Keep `npm audit --audit-level=moderate` passing, or document and time-box any accepted advisory.
- Use `review` permission mode for third-party code review and untrusted repositories.
- Use `balanced` permission mode for normal implementation work.
- Use `yolo` only in trusted, disposable worktrees.

## Sensitive Data Boundaries

Never commit:

- `.env` or `.env.*`
- `.pi/sessions/`
- `.pi/npm/`
- `.pi/agent/auth.json`
- `.pi/agent/models.json`
- provider API keys
- copied terminal output containing secrets
- proprietary session transcripts

Keep enterprise-specific provider definitions in `~/.pi/agent/models.json`, a managed dotfiles store, or a secrets-backed endpoint instead of this repository.

## Change Management

Use this checklist for meaningful changes:

1. Explain whether the change is a Pi configuration change, a local extension change, or documentation only.
2. Verify that it does not replace upstream Pi runtime behavior.
3. Run `npm run install:check`.
4. Run `npm run check`.
5. Run `npm run audit`.
6. Run `npm run doctor`.
7. Review `git diff --check`.
8. Confirm no ignored runtime state was force-added.

## Residual Risks

- Local Pi sessions may still contain sensitive data on disk, even though they are ignored by Git.
- Provider model availability can change outside this repository.
- Third-party Pi packages declared in `.pi/settings.json` are pinned manually and can change behavior on update; review and pin upgrades intentionally.
- Permission policies are defense-in-depth, not a substitute for operating in a least-privilege worktree.
