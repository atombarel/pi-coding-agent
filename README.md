# Personal Pi Setup

Personal Pi Setup is the local base for building my own Pi-style coding agent. It keeps the runtime small, makes extensions and skills first-class, and lets me switch between Codex SDK and OpenRouter without rewriting the agent.

This repo is set up around:

- A TypeScript CLI named `pi`
- A core runtime that composes prompts, loads extensions, registers tools, and talks to provider adapters
- Primary providers for Codex SDK and OpenRouter
- A Codex exec fallback for one-shot shell workflows
- An extension SDK for adding tools, system instructions, and reusable skills
- A base extension with starter skills like `codex-goal`, `rtk`, and `extension-author`
- A sample `repo-inspector` extension
- Tests and GitHub Actions CI

## Quick Start

```bash
npm install
npm run build
npm run dev -- tui --config pi.config.example.json --profile echo
npm run dev -- run "summarize this repo" --extension ./examples/extensions/repo-inspector/src/index.ts
npm run dev -- skills --extension ./extensions/base/src/index.ts
npm run dev -- run "add a Redux Toolkit slice" --extension ./extensions/base/src/index.ts --skill rtk
```

The default provider is `echo`, so the command works without API keys.

## Provider Setup

### Codex SDK

Use this when I want Pi to run through my Codex OAuth / ChatGPT subscription login.

```bash
codex login
npm run dev -- run "what should I build next?" --provider codex-sdk
```

The `codex-sdk` provider uses `@openai/codex-sdk`, so it keeps Codex's existing browser login, cached credentials, token refresh, workspace controls, and subscription access while giving Pi a proper thread-based integration.

Start an interactive Pi session with:

```bash
npm run dev -- tui --profile codex
```

### OpenRouter

Use this when I want routed model access outside the Codex subscription path.

```bash
export OPENROUTER_API_KEY=...
npm run dev -- run "what should I build next?" --provider openrouter --model anthropic/claude-sonnet-4
```

### Codex Exec Fallback

Use this when a plain noninteractive Codex CLI bridge is enough.

```bash
npm run dev -- run "summarize this repo" --provider codex-exec
```

### OpenAI API Key

This path is still available, but it is intentionally separate from Codex subscription auth.

```bash
export OPENAI_API_KEY=...
npm run dev -- run "what should I build next?" --provider openai --model gpt-4.1-mini
```

## Profiles

For everyday switching, copy `pi.config.example.json` to `pi.config.json` and use profiles:

```bash
npm run dev -- run "use my default profile"
PI_PROFILE=codex npm run dev -- run "use the Codex SDK profile"
PI_PROFILE=openrouter npm run dev -- run "try OpenRouter"
```

## TUI

`pi tui` is the first interactive surface. It keeps a provider session alive, which means:

- Codex SDK runs on a persistent Codex thread.
- OpenRouter keeps chat history for the session.
- Extensions and selected skills are applied to the session prompt.

Available slash commands:

```text
/help
/status
/extensions
/skills
/tools
/clear
/exit
```

This is intentionally a simple terminal shell first. The next layer is a richer full-screen TUI with streamed events, file-change panes, command logs, approvals, and a Codex-app-style workspace view.

## Project Shape

```text
packages/
  cli/             command line app
  core/            runtime, providers, extension loading
  extension-sdk/   public types and helpers for extensions
extensions/
  base/            first-party starter skills
examples/
  extensions/
    repo-inspector/
docs/
  architecture.md
```

## Extension Example

```ts
import { defineExtension } from "@pi/extension-sdk";

export default defineExtension({
  id: "my-extension",
  displayName: "My Extension",
  systemPrompt: "Prefer tiny, reversible changes.",
  skills: [
    {
      id: "my-skill",
      title: "My Skill",
      description: "A focused operating mode.",
      prompt: "Use this mode for one specific workflow."
    }
  ],
  tools: [
    {
      name: "hello",
      description: "Say hello from an extension.",
      execute: async () => ({ content: "hello from Pi" })
    }
  ]
});
```

## Current Roadmap

- Add streaming provider events to the TUI
- Add a full-screen TUI renderer with transcript, activity, and diff panes
- Add workspace permission policies
- Add VS Code extension shell
- Add extension marketplace metadata
- Add session storage and replay
- Add multi-agent roles for planning, implementation, and review
