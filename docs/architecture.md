# Architecture

Pi starts as a local coding agent with a deliberately small kernel.

## Principles

- The core owns orchestration, provider calls, extension loading, permissions, and session state.
- Extensions own domain-specific tools, extra instructions, skills, and workflow shortcuts.
- Providers are adapters. The rest of the agent should not care whether the model is OpenAI, local, hosted, or something else.
- Provider profiles make switching cheap: `echo` for no-key local testing, `codex` for Codex OAuth/subscription access through the Codex CLI, `openai` for the direct API-key path, and `openrouter` for routed multi-model access.
- Dangerous capabilities must pass through a permission layer before they become default behavior.

## Runtime Flow

1. The CLI parses a user prompt and runtime options.
2. The extension loader imports configured extensions.
3. The runtime registers extension tools and merges system instructions.
4. Selected skills are appended as focused operating-mode instructions.
5. The provider receives a composed prompt.
6. Later versions will let the provider request tool calls through the runtime.

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
      "provider": "codex",
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

## Near-Term Build Plan

1. Implement provider-driven tool calls.
2. Add explicit permission decisions for shell and file writes.
3. Store sessions as JSONL for replay and debugging.
4. Ship a VS Code extension that wraps the CLI/runtime.
5. Add a first-party extension registry format.
