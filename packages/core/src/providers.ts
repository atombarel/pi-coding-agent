import { spawn } from "node:child_process";
import { Codex } from "@openai/codex-sdk";
import type { SandboxMode, ThreadOptions } from "@openai/codex-sdk";
import type { AgentTool } from "@pi/extension-sdk";

export interface ProviderRequest {
  prompt: string;
  systemPrompt: string;
  tools: AgentTool[];
  cwd: string;
  model?: string;
}

export interface ProviderResponse {
  content: string;
  raw?: unknown;
}

export interface AgentProvider {
  name: string;
  complete(request: ProviderRequest): Promise<ProviderResponse>;
  startSession?(): AgentProviderSession;
}

export interface AgentProviderSession {
  complete(request: ProviderRequest): Promise<ProviderResponse>;
}

export class EchoProvider implements AgentProvider {
  readonly name = "echo";

  async complete(request: ProviderRequest): Promise<ProviderResponse> {
    const toolNames = request.tools.map((tool) => tool.name).join(", ") || "none";
    return {
      content: [
        "Pi echo provider",
        "",
        `Model: ${request.model ?? "none"}`,
        `Tools: ${toolNames}`,
        "",
        "System prompt:",
        request.systemPrompt,
        "",
        "User prompt:",
        request.prompt
      ].join("\n")
    };
  }

  startSession(): AgentProviderSession {
    return new EchoProviderSession(this);
  }
}

class EchoProviderSession implements AgentProviderSession {
  private turn = 0;

  constructor(private readonly provider: EchoProvider) {}

  async complete(request: ProviderRequest): Promise<ProviderResponse> {
    this.turn += 1;
    const response = await this.provider.complete(request);

    return {
      ...response,
      content: [`Turn: ${this.turn}`, "", response.content].join("\n")
    };
  }
}

export interface CodexCliProviderOptions {
  command?: string;
  profile?: string;
  sandbox?: "read-only" | "workspace-write" | "danger-full-access";
}

export class CodexCliProvider implements AgentProvider {
  readonly name = "codex-exec";
  private readonly command: string;
  private readonly profile?: string;
  private readonly sandbox?: "read-only" | "workspace-write" | "danger-full-access";

  constructor(options: CodexCliProviderOptions = {}) {
    this.command = options.command ?? "codex";
    this.profile = options.profile;
    this.sandbox = options.sandbox;
  }

  async complete(request: ProviderRequest): Promise<ProviderResponse> {
    const args = [
      "exec",
      "--color",
      "never",
      "--skip-git-repo-check",
      "-C",
      request.cwd
    ];

    if (request.model) {
      args.push("-m", request.model);
    }

    if (this.profile) {
      args.push("-p", this.profile);
    }

    if (this.sandbox) {
      args.push("--sandbox", this.sandbox);
    }

    args.push("-");

    const input = [
      "<pi_runtime_instructions>",
      request.systemPrompt,
      "</pi_runtime_instructions>",
      "",
      "<user_prompt>",
      request.prompt,
      "</user_prompt>"
    ].join("\n");

    const result = await runProcess(this.command, args, input, request.cwd);

    return {
      content: result.stdout.trim(),
      raw: {
        stderr: result.stderr.trim()
      }
    };
  }
}

export interface CodexSdkProviderOptions {
  sandboxMode?: SandboxMode;
  skipGitRepoCheck?: boolean;
}

export class CodexSdkProvider implements AgentProvider {
  readonly name = "codex-sdk";
  private readonly sandboxMode?: SandboxMode;
  private readonly skipGitRepoCheck: boolean;

  constructor(options: CodexSdkProviderOptions = {}) {
    this.sandboxMode = options.sandboxMode;
    this.skipGitRepoCheck = options.skipGitRepoCheck ?? true;
  }

  async complete(request: ProviderRequest): Promise<ProviderResponse> {
    const codex = new Codex();
    const thread = codex.startThread(this.threadOptions(request));
    const turn = await thread.run(this.input(request));

    return this.result(thread.id, turn);
  }

  startSession(): AgentProviderSession {
    return new CodexSdkProviderSession(this);
  }

  threadOptions(request: ProviderRequest): ThreadOptions {
    const threadOptions: ThreadOptions = {
      workingDirectory: request.cwd,
      skipGitRepoCheck: this.skipGitRepoCheck
    };

    if (request.model) {
      threadOptions.model = request.model;
    }

    if (this.sandboxMode) {
      threadOptions.sandboxMode = this.sandboxMode;
    }

    return threadOptions;
  }

  input(request: ProviderRequest) {
    return [
      {
        type: "text" as const,
        text: [
          "<pi_runtime_instructions>",
          request.systemPrompt,
          "</pi_runtime_instructions>",
          "",
          "<user_prompt>",
          request.prompt,
          "</user_prompt>"
        ].join("\n")
      }
    ];
  }

  result(threadId: string | null, turn: Awaited<ReturnType<ReturnType<Codex["startThread"]>["run"]>>): ProviderResponse {
    return {
      content: turn.finalResponse,
      raw: {
        threadId,
        usage: turn.usage,
        items: turn.items
      }
    };
  }
}

class CodexSdkProviderSession implements AgentProviderSession {
  private thread: ReturnType<Codex["startThread"]> | undefined;

  constructor(private readonly provider: CodexSdkProvider) {}

  async complete(request: ProviderRequest): Promise<ProviderResponse> {
    this.thread ??= new Codex().startThread(this.provider.threadOptions(request));
    const turn = await this.thread.run(this.provider.input(request));

    return this.provider.result(this.thread.id, turn);
  }
}

export interface OpenAIProviderOptions {
  apiKey: string;
  model: string;
  baseUrl?: string;
}

export class OpenAIResponsesProvider implements AgentProvider {
  readonly name = "openai";
  private readonly apiKey: string;
  private readonly model: string;
  private readonly baseUrl: string;

  constructor(options: OpenAIProviderOptions) {
    this.apiKey = options.apiKey;
    this.model = options.model;
    this.baseUrl = options.baseUrl ?? "https://api.openai.com/v1";
  }

  async complete(request: ProviderRequest): Promise<ProviderResponse> {
    const response = await fetch(`${this.baseUrl}/responses`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${this.apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: request.model ?? this.model,
        instructions: request.systemPrompt,
        input: request.prompt
      })
    });

    if (!response.ok) {
      const body = await response.text();
      throw new Error(`OpenAI provider failed with ${response.status}: ${body}`);
    }

    const body = await response.json() as { output_text?: string };
    return {
      content: body.output_text ?? JSON.stringify(body, null, 2),
      raw: body
    };
  }
}

export interface OpenRouterProviderOptions {
  apiKey: string;
  model: string;
  baseUrl?: string;
  appUrl?: string;
  appTitle?: string;
}

export class OpenRouterProvider implements AgentProvider {
  readonly name = "openrouter";
  private readonly apiKey: string;
  private readonly model: string;
  private readonly baseUrl: string;
  private readonly appUrl?: string;
  private readonly appTitle?: string;

  constructor(options: OpenRouterProviderOptions) {
    this.apiKey = options.apiKey;
    this.model = options.model;
    this.baseUrl = options.baseUrl ?? "https://openrouter.ai/api/v1";
    this.appUrl = options.appUrl;
    this.appTitle = options.appTitle;
  }

  startSession(): AgentProviderSession {
    return new OpenRouterProviderSession(this);
  }

  async completeMessages(
    request: ProviderRequest,
    messages: Array<{ role: "system" | "user" | "assistant"; content: string }>
  ): Promise<ProviderResponse> {
    const headers: Record<string, string> = {
      "Authorization": `Bearer ${this.apiKey}`,
      "Content-Type": "application/json"
    };

    if (this.appUrl) {
      headers["HTTP-Referer"] = this.appUrl;
    }

    if (this.appTitle) {
      headers["X-OpenRouter-Title"] = this.appTitle;
    }

    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        model: request.model ?? this.model,
        messages
      })
    });

    if (!response.ok) {
      const body = await response.text();
      throw new Error(`OpenRouter provider failed with ${response.status}: ${body}`);
    }

    const body = await response.json() as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const content = body.choices?.[0]?.message?.content;

    return {
      content: content ?? JSON.stringify(body, null, 2),
      raw: body
    };
  }

  async complete(request: ProviderRequest): Promise<ProviderResponse> {
    return this.completeMessages(request, [
      { role: "system", content: request.systemPrompt },
      { role: "user", content: request.prompt }
    ]);
  }
}

class OpenRouterProviderSession implements AgentProviderSession {
  private readonly messages: Array<{ role: "system" | "user" | "assistant"; content: string }> = [];

  constructor(private readonly provider: OpenRouterProvider) {}

  async complete(request: ProviderRequest): Promise<ProviderResponse> {
    if (this.messages.length === 0) {
      this.messages.push({ role: "system", content: request.systemPrompt });
    }

    this.messages.push({ role: "user", content: request.prompt });
    const response = await this.provider.completeMessages(request, this.messages);
    this.messages.push({ role: "assistant", content: response.content });

    return response;
  }
}

interface ProcessResult {
  stdout: string;
  stderr: string;
}

function runProcess(command: string, args: string[], input: string, cwd: string): Promise<ProcessResult> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd,
      stdio: ["pipe", "pipe", "pipe"]
    });
    const stdout: Buffer[] = [];
    const stderr: Buffer[] = [];

    child.stdout.on("data", (chunk: Buffer) => stdout.push(chunk));
    child.stderr.on("data", (chunk: Buffer) => stderr.push(chunk));
    child.on("error", reject);
    child.on("close", (code) => {
      const output = {
        stdout: Buffer.concat(stdout).toString("utf8"),
        stderr: Buffer.concat(stderr).toString("utf8")
      };

      if (code === 0) {
        resolve(output);
        return;
      }

      reject(new Error(`Codex CLI failed with exit code ${code}: ${output.stderr || output.stdout}`));
    });

    child.stdin.end(input);
  });
}
