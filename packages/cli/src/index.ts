#!/usr/bin/env node
import { readFile } from "node:fs/promises";
import path from "node:path";
import { createInterface } from "node:readline/promises";
import {
  AgentRuntime,
  CodexCliProvider,
  CodexSdkProvider,
  EchoProvider,
  loadExtension,
  OpenAIResponsesProvider,
  OpenRouterProvider
} from "@pi/core";
import type { AgentProvider } from "@pi/core";

interface CliOptions {
  command?: string;
  prompt?: string;
  cwd: string;
  configPath?: string;
  profile?: string;
  provider?: string;
  model?: string;
  baseUrl?: string;
  codexProfile?: string;
  codexSandbox?: "read-only" | "workspace-write" | "danger-full-access";
  extensions: string[];
  skills: string[];
}

interface ResolvedCliOptions extends CliOptions {
  provider: string;
}

interface ProviderProfile {
  provider?: string;
  model?: string;
  baseUrl?: string;
  codexProfile?: string;
  codexSandbox?: "read-only" | "workspace-write" | "danger-full-access";
}

interface PiConfig {
  activeProfile?: string;
  profile?: string;
  provider?: string;
  model?: string;
  extensions?: string[];
  skills?: string[];
  profiles?: Record<string, ProviderProfile>;
}

async function main(argv: string[]): Promise<void> {
  const options = await resolveOptions(parseArgs(argv));

  if (!options.command || options.command === "help") {
    printHelp();
    return;
  }

  if (options.command === "run") {
    await runAgent(options);
    return;
  }

  if (options.command === "tui") {
    await runTui(options);
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

async function runAgent(options: ResolvedCliOptions): Promise<void> {
  if (!options.prompt) {
    throw new Error("Missing prompt. Example: pi run \"summarize this repo\"");
  }

  const runtime = await createRuntime(options);
  const result = await runtime.run(options.prompt);
  process.stdout.write(`${result.content}\n`);
}

async function runTui(options: ResolvedCliOptions): Promise<void> {
  const runtime = await createRuntime(options);
  const session = runtime.startSession();
  const rl = createInterface({
    input: process.stdin,
    output: process.stdout,
    terminal: Boolean(process.stdin.isTTY && process.stdout.isTTY)
  });

  printTuiHeader(options);

  try {
    while (true) {
      const input = (await rl.question("pi> ")).trim();

      if (!input) {
        continue;
      }

      if (input === "/exit" || input === "/quit") {
        process.stdout.write("bye\n");
        return;
      }

      if (input === "/help") {
        printTuiHelp();
        continue;
      }

      if (input === "/clear") {
        console.clear();
        printTuiHeader(options);
        continue;
      }

      if (input === "/status") {
        printRuntimeStatus(options, runtime);
        continue;
      }

      if (input === "/extensions") {
        printExtensions(runtime);
        continue;
      }

      if (input === "/skills") {
        printSkills(runtime);
        continue;
      }

      if (input === "/tools") {
        printTools(runtime);
        continue;
      }

      process.stdout.write("\nPi is thinking...\n\n");

      try {
        const result = await session.run(input);
        process.stdout.write(`${result.content.trim()}\n\n`);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        process.stdout.write(`Error: ${message}\n\n`);
      }
    }
  } finally {
    rl.close();
  }
}

async function listExtensions(options: ResolvedCliOptions): Promise<void> {
  const runtime = await createRuntime(options);
  printExtensions(runtime);
}

function printExtensions(runtime: AgentRuntime): void {
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

async function listSkills(options: ResolvedCliOptions): Promise<void> {
  const runtime = await createRuntime(options);
  printSkills(runtime);
}

function printSkills(runtime: AgentRuntime): void {
  const skills = runtime.listSkills();

  if (skills.length === 0) {
    process.stdout.write("No skills loaded.\n");
    return;
  }

  for (const skill of skills) {
    process.stdout.write(`${skill.id} - ${skill.title}: ${skill.description}\n`);
  }
}

function printTools(runtime: AgentRuntime): void {
  const tools = runtime.listTools();

  if (tools.length === 0) {
    process.stdout.write("No tools loaded.\n");
    return;
  }

  for (const tool of tools) {
    process.stdout.write(`${tool.name} - ${tool.description}\n`);
  }
}

async function createRuntime(options: ResolvedCliOptions): Promise<AgentRuntime> {
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

function createProvider(options: ResolvedCliOptions): AgentProvider {
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
      baseUrl: options.baseUrl ?? process.env.OPENAI_BASE_URL
    });
  }

  if (options.provider === "codex" || options.provider === "codex-sdk") {
    return new CodexSdkProvider({
      sandboxMode: options.codexSandbox
    });
  }

  if (options.provider === "codex-exec") {
    return new CodexCliProvider({
      profile: options.codexProfile,
      sandbox: options.codexSandbox
    });
  }

  if (options.provider === "openrouter") {
    const apiKey = process.env.OPENROUTER_API_KEY;

    if (!apiKey) {
      throw new Error("OPENROUTER_API_KEY is required when PI_PROVIDER=openrouter or --provider openrouter.");
    }

    return new OpenRouterProvider({
      apiKey,
      model: options.model ?? "openai/gpt-4.1-mini",
      baseUrl: options.baseUrl ?? process.env.OPENROUTER_BASE_URL,
      appUrl: process.env.OPENROUTER_APP_URL,
      appTitle: process.env.OPENROUTER_APP_TITLE ?? "Personal Pi Setup"
    });
  }

  throw new Error(`Unsupported provider "${options.provider}".`);
}

function parseArgs(argv: string[]): CliOptions {
  const options: CliOptions = {
    cwd: process.cwd(),
    extensions: [],
    skills: []
  };

  const args = [...argv];
  options.command = args.shift();

  if (options.command === "--help" || options.command === "-h") {
    options.command = "help";
  }

  if (options.command === "run") {
    options.prompt = args.shift();
  }

  while (args.length > 0) {
    const arg = args.shift();

    if (arg === "--cwd") {
      options.cwd = path.resolve(requireValue(args, "--cwd"));
    } else if (arg === "--config") {
      options.configPath = requireValue(args, "--config");
    } else if (arg === "--profile") {
      options.profile = requireValue(args, "--profile");
    } else if (arg === "--provider") {
      options.provider = requireValue(args, "--provider");
    } else if (arg === "--model") {
      options.model = requireValue(args, "--model");
    } else if (arg === "--base-url") {
      options.baseUrl = requireValue(args, "--base-url");
    } else if (arg === "--codex-profile") {
      options.codexProfile = requireValue(args, "--codex-profile");
    } else if (arg === "--codex-sandbox") {
      options.codexSandbox = parseCodexSandbox(requireValue(args, "--codex-sandbox"));
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

async function resolveOptions(options: CliOptions): Promise<ResolvedCliOptions> {
  const config = await loadConfig(options);
  const profileName = options.profile
    ?? process.env.PI_PROFILE
    ?? config.activeProfile
    ?? config.profile;
  const profile = profileName ? config.profiles?.[profileName] : undefined;

  if (profileName && !profile) {
    throw new Error(`Profile "${profileName}" was not found in pi.config.json.`);
  }

  return {
    ...options,
    provider: options.provider
      ?? process.env.PI_PROVIDER
      ?? profile?.provider
      ?? config.provider
      ?? "echo",
    model: options.model
      ?? process.env.PI_MODEL
      ?? profile?.model
      ?? config.model,
    baseUrl: options.baseUrl
      ?? process.env.PI_BASE_URL
      ?? profile?.baseUrl,
    codexProfile: options.codexProfile
      ?? process.env.PI_CODEX_PROFILE
      ?? profile?.codexProfile,
    codexSandbox: options.codexSandbox
      ?? parseOptionalCodexSandbox(process.env.PI_CODEX_SANDBOX)
      ?? profile?.codexSandbox,
    extensions: [
      ...(config.extensions ?? []),
      ...options.extensions
    ],
    skills: [
      ...(config.skills ?? []),
      ...options.skills
    ]
  };
}

async function loadConfig(options: CliOptions): Promise<PiConfig> {
  const configPath = options.configPath
    ? path.resolve(options.cwd, options.configPath)
    : path.join(options.cwd, "pi.config.json");

  try {
    const content = await readFile(configPath, "utf8");
    const parsed = JSON.parse(content) as unknown;

    if (!isConfig(parsed)) {
      throw new Error(`Invalid config file at ${configPath}.`);
    }

    return parsed;
  } catch (error) {
    if (isNodeError(error) && error.code === "ENOENT" && !options.configPath) {
      return {};
    }

    throw error;
  }
}

function isConfig(value: unknown): value is PiConfig {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isNodeError(error: unknown): error is NodeJS.ErrnoException {
  return error instanceof Error && "code" in error;
}

function parseOptionalCodexSandbox(value: string | undefined): CliOptions["codexSandbox"] {
  if (!value) {
    return undefined;
  }

  return parseCodexSandbox(value);
}

function parseCodexSandbox(value: string): NonNullable<CliOptions["codexSandbox"]> {
  if (value === "read-only" || value === "workspace-write" || value === "danger-full-access") {
    return value;
  }

  throw new Error(`Invalid Codex sandbox "${value}". Expected read-only, workspace-write, or danger-full-access.`);
}

function requireValue(args: string[], flag: string): string {
  const value = args.shift();

  if (!value) {
    throw new Error(`${flag} requires a value.`);
  }

  return value;
}

function printHelp(): void {
  process.stdout.write(`Personal Pi Setup

Usage:
  pi run "prompt" [--cwd path] [--config path] [--profile name] [--provider echo|codex-sdk|codex-exec|openrouter|openai] [--model model] [--base-url url] [--codex-profile name] [--codex-sandbox mode] [--extension path] [--skill id]
  pi tui [--cwd path] [--config path] [--profile name] [--provider echo|codex-sdk|openrouter]
  pi extensions [--extension path]
  pi skills [--extension path]

Examples:
  pi run "summarize this repo"
  pi tui --profile codex
  pi tui --profile openrouter --skill codex-goal
  pi run "use my Codex subscription" --profile codex
  pi run "compare providers" --profile openrouter
  pi run "inspect the project" --extension ./examples/extensions/repo-inspector/dist/index.js
  pi run "build an RTK slice" --extension ./extensions/base/dist/index.js --skill rtk
`);
}

function printTuiHeader(options: ResolvedCliOptions): void {
  process.stdout.write([
    "Personal Pi Setup",
    `provider: ${options.provider}${options.model ? ` / ${options.model}` : ""}`,
    `cwd: ${options.cwd}`,
    "type /help for commands, /exit to quit",
    ""
  ].join("\n"));
}

function printTuiHelp(): void {
  process.stdout.write([
    "",
    "Commands:",
    "  /help        show this help",
    "  /status      show provider, cwd, skills, extensions, and tools",
    "  /extensions  list loaded extensions",
    "  /skills      list loaded skills",
    "  /tools       list loaded tools",
    "  /clear       clear the screen",
    "  /exit        quit",
    ""
  ].join("\n"));
}

function printRuntimeStatus(options: ResolvedCliOptions, runtime: AgentRuntime): void {
  process.stdout.write([
    "",
    `provider: ${options.provider}`,
    `model: ${options.model ?? "default"}`,
    `cwd: ${options.cwd}`,
    `extensions: ${runtime.listExtensions().map((extension) => extension.id).join(", ") || "none"}`,
    `skills: ${options.skills.join(", ") || "none"}`,
    `tools: ${runtime.listTools().map((tool) => tool.name).join(", ") || "none"}`,
    ""
  ].join("\n"));
}

main(process.argv.slice(2)).catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  process.stderr.write(`pi: ${message}\n`);
  process.exitCode = 1;
});
