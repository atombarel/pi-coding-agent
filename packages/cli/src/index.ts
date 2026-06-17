#!/usr/bin/env node
import path from "node:path";
import { AgentRuntime, EchoProvider, loadExtension, OpenAIResponsesProvider } from "@pi/core";
import type { AgentProvider } from "@pi/core";

interface CliOptions {
  command?: string;
  prompt?: string;
  cwd: string;
  provider: string;
  model?: string;
  extensions: string[];
  skills: string[];
}

async function main(argv: string[]): Promise<void> {
  const options = parseArgs(argv);

  if (!options.command || options.command === "help") {
    printHelp();
    return;
  }

  if (options.command === "run") {
    await runAgent(options);
    return;
  }

  if (options.command === "extensions") {
    await listExtensions(options);
    return;
  }

  if (options.command === "skills") {
    await listSkills(options);
    return;
  }

  throw new Error(`Unknown command "${options.command}".`);
}

async function runAgent(options: CliOptions): Promise<void> {
  if (!options.prompt) {
    throw new Error("Missing prompt. Example: pi run \"summarize this repo\"");
  }

  const runtime = await createRuntime(options);
  const result = await runtime.run(options.prompt);
  process.stdout.write(`${result.content}\n`);
}

async function listExtensions(options: CliOptions): Promise<void> {
  const runtime = await createRuntime(options);
  const extensions = runtime.listExtensions();

  if (extensions.length === 0) {
    process.stdout.write("No extensions loaded.\n");
    return;
  }

  for (const extension of extensions) {
    const toolCount = extension.tools?.length ?? 0;
    process.stdout.write(`${extension.id} (${toolCount} tools)\n`);
  }
}

async function listSkills(options: CliOptions): Promise<void> {
  const runtime = await createRuntime(options);
  const skills = runtime.listSkills();

  if (skills.length === 0) {
    process.stdout.write("No skills loaded.\n");
    return;
  }

  for (const skill of skills) {
    process.stdout.write(`${skill.id} - ${skill.title}: ${skill.description}\n`);
  }
}

async function createRuntime(options: CliOptions): Promise<AgentRuntime> {
  const extensions = await Promise.all(
    options.extensions.map((extensionPath) => loadExtension(extensionPath, options.cwd))
  );

  return new AgentRuntime({
    cwd: options.cwd,
    provider: createProvider(options),
    model: options.model,
    extensions,
    skillIds: options.skills
  });
}

function createProvider(options: CliOptions): AgentProvider {
  if (options.provider === "echo") {
    return new EchoProvider();
  }

  if (options.provider === "openai") {
    const apiKey = process.env.OPENAI_API_KEY;

    if (!apiKey) {
      throw new Error("OPENAI_API_KEY is required when PI_PROVIDER=openai or --provider openai.");
    }

    return new OpenAIResponsesProvider({
      apiKey,
      model: options.model ?? "gpt-4.1-mini",
      baseUrl: process.env.OPENAI_BASE_URL
    });
  }

  throw new Error(`Unsupported provider "${options.provider}".`);
}

function parseArgs(argv: string[]): CliOptions {
  const options: CliOptions = {
    cwd: process.cwd(),
    provider: process.env.PI_PROVIDER ?? "echo",
    model: process.env.PI_MODEL,
    extensions: [],
    skills: []
  };

  const args = [...argv];
  options.command = args.shift();

  if (options.command === "run") {
    options.prompt = args.shift();
  }

  while (args.length > 0) {
    const arg = args.shift();

    if (arg === "--cwd") {
      options.cwd = path.resolve(requireValue(args, "--cwd"));
    } else if (arg === "--provider") {
      options.provider = requireValue(args, "--provider");
    } else if (arg === "--model") {
      options.model = requireValue(args, "--model");
    } else if (arg === "--extension") {
      options.extensions.push(requireValue(args, "--extension"));
    } else if (arg === "--skill") {
      options.skills.push(requireValue(args, "--skill"));
    } else if (arg === "--help" || arg === "-h") {
      options.command = "help";
    } else if (arg) {
      throw new Error(`Unknown option "${arg}".`);
    }
  }

  return options;
}

function requireValue(args: string[], flag: string): string {
  const value = args.shift();

  if (!value) {
    throw new Error(`${flag} requires a value.`);
  }

  return value;
}

function printHelp(): void {
  process.stdout.write(`Pi Coding Agent

Usage:
  pi run "prompt" [--cwd path] [--provider echo|openai] [--model model] [--extension path]
  pi extensions [--extension path]
  pi skills [--extension path]

Examples:
  pi run "summarize this repo"
  pi run "inspect the project" --extension ./examples/extensions/repo-inspector/dist/index.js
  pi run "build an RTK slice" --extension ./extensions/base/dist/index.js --skill rtk
`);
}

main(process.argv.slice(2)).catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  process.stderr.write(`pi: ${message}\n`);
  process.exitCode = 1;
});
