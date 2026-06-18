# Architecture

Pi starts as a personal coding setup with a deliberately small kernel. Mature external UIs do the heavy interactive work; Pi owns provider/profile glue, extensions, skills, and experiments.

## Principles

- The core owns orchestration, provider calls, extension loading, permissions, and session state.
- Real daily interfaces should be delegated to mature tools instead of rebuilt locally.
- Extensions own domain-specific tools, extra instructions, skills, and workflow shortcuts.
- Providers are adapters. The rest of the agent should not care whether the model is OpenAI, local, hosted, or something else.
- Provider profiles make switching cheap: `echo` for no-key local testing, `codex-sdk` for Codex OAuth/subscription access through `@openai/codex-sdk`, `codex-exec` as a shell fallback, and `openrouter` for routed multi-model access.
- Dangerous capabilities must pass through a permission layer before they become default behavior.

## Runtime Flow

1. The CLI parses a user prompt and runtime options.
2. The extension loader imports configured extensions.
3. The runtime registers extension tools and merges system instructions.
4. Selected skills are appended as focused operating-mode instructions.
5. The provider receives a composed prompt.
6. `pi run` executes a single provider call; `pi tui` keeps a lightweight provider session alive across turns.
7. `pi codex` launches the real Codex interface; `pi opencode` launches the real OpenCode interface.
8. Later versions will export Pi config/skills into those tools where possible.

## Extension Contract

An extension can provide:

- `systemPrompt`: guidance appended to the runtime prompt.
- `tools`: callable capabilities with names, descriptions, optional JSON schemas, and execute handlers.
- `skills`: named instruction bundles that can be activated for a single run.

Extensions should be ordinary npm packages whenever possible. Local file extensions are supported for fast iteration.

## Skill Contract

A skill is a lightweight operating mode:

- `id`: stable command-line identifier, such as `codex-goal` or `rtk`.
- `title`: human-friendly label.
- `description`: one-line purpose shown by `pi skills`.
- `prompt`: focused instructions appended only when the skill is selected.

Skills should be narrow. Prefer several small skills over one broad "do everything" prompt.

## Provider Profiles

`pi.config.json` can define named provider profiles:

```json
{
  "activeProfile": "echo",
  "profiles": {
    "codex": {
      "provider": "codex-sdk",
      "codexSandbox": "workspace-write"
    },
    "codex-exec": {
      "provider": "codex-exec",
      "codexSandbox": "workspace-write"
    },
    "openai-api": {
      "provider": "openai",
      "model": "gpt-4.1-mini"
    },
    "openrouter": {
      "provider": "openrouter",
      "model": "anthropic/claude-sonnet-4"
    }
  }
}
```

Precedence is: CLI flags, environment variables, selected profile, flat config defaults, then `echo`.

## Real Interfaces

Pi deliberately avoids rebuilding a full Claude Code/Codex-style interface.

- `pi codex` launches Codex CLI, which already provides the real Codex TUI and app handoff.
- `pi opencode` launches OpenCode, which already provides a real terminal/desktop/IDE agent interface with OpenRouter support.

## Experimental Shell

`pi tui` is a line-oriented runtime test shell with slash commands and persistent provider sessions.

Current scope:

- Persistent Codex SDK thread for `codex-sdk`.
- Persistent OpenRouter chat history for `openrouter`.
- Slash commands for status, loaded extensions, skills, tools, clear, and exit.

Next scope:

- Config generation for Codex and OpenCode.
- Skill/instruction export into supported external tool formats.
- Small workflow launchers that compose provider, cwd, model, and skill choices.

## Near-Term Build Plan

1. Make Codex and OpenCode the main daily interfaces.
2. Generate/sync external tool config from `pi.config.json`.
3. Add explicit permission decisions for shell and file writes in the experimental runtime.
4. Store sessions as JSONL for replay and debugging.
5. Add workflow launchers around common coding tasks.
