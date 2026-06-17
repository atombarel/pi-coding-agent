# Architecture

Pi starts as a local coding agent with a deliberately small kernel.

## Principles

- The core owns orchestration, provider calls, extension loading, permissions, and session state.
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
6. `pi run` executes a single provider call; `pi tui` keeps a provider session alive across turns.
7. Later versions will let the provider request tool calls through the runtime.

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

## Interactive Surface

`pi tui` is the first agent workspace surface. It is a line-oriented terminal interface with slash commands and persistent provider sessions.

Current scope:

- Persistent Codex SDK thread for `codex-sdk`.
- Persistent OpenRouter chat history for `openrouter`.
- Slash commands for status, loaded extensions, skills, tools, clear, and exit.

Next scope:

- Streamed provider events.
- Activity and command panes.
- File-change and diff views.
- Approval prompts.
- Optional Codex app-server integration for a richer app-like surface.

## Near-Term Build Plan

1. Add streaming provider events to the TUI.
2. Add explicit permission decisions for shell and file writes.
3. Store sessions as JSONL for replay and debugging.
4. Ship a VS Code extension that wraps the CLI/runtime.
5. Add a full-screen TUI renderer and optional app-server-backed UI.
