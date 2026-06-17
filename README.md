# Pi Coding Agent

Pi is a small, hackable coding-agent starter kit. It is built around a simple idea: keep the agent core boring and make everything interesting an extension.

This repo gives you:

- A TypeScript CLI named `pi`
- A core runtime that composes prompts, loads extensions, registers tools, and talks to a provider
- An extension SDK for adding tools, system instructions, and skills
- A base extension with starter skills like `codex-goal`, `rtk`, and `extension-author`
- A sample `repo-inspector` extension
- Tests and GitHub Actions CI

## Quick Start

```bash
npm install
npm run build
npm run dev -- run "summarize this repo" --extension ./examples/extensions/repo-inspector/src/index.ts
npm run dev -- skills --extension ./extensions/base/src/index.ts
npm run dev -- run "add a Redux Toolkit slice" --extension ./extensions/base/src/index.ts --skill rtk
```

The default provider is `echo`, so the command works without API keys.

To use your Codex OAuth / ChatGPT subscription login, sign in once with the Codex CLI:

```bash
codex login
npm run dev -- run "what should I build next?" --provider codex
```

The `codex` provider delegates to `codex exec`, so it uses Codex's existing browser login, cached credentials, token refresh, workspace controls, and subscription access.

To call OpenAI through the API-key path instead:

```bash
export OPENAI_API_KEY=...
export PI_PROVIDER=openai
export PI_MODEL=gpt-4.1-mini
npm run dev -- run "what should I build next?"
```

To use OpenRouter:

```bash
export OPENROUTER_API_KEY=...
npm run dev -- run "what should I build next?" --provider openrouter --model anthropic/claude-sonnet-4
```

For everyday switching, copy `pi.config.example.json` to `pi.config.json` and use profiles:

```bash
npm run dev -- run "use my default profile"
npm run dev -- run "try OpenRouter" --profile openrouter
PI_PROFILE=codex npm run dev -- run "use the Codex OAuth profile"
PI_PROFILE=openai-api npm run dev -- run "use the OpenAI API-key profile"
```

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

- Add a real tool-calling loop
- Add workspace permission policies
- Add VS Code extension shell
- Add extension marketplace metadata
- Add session storage and replay
- Add multi-agent roles for planning, implementation, and review
