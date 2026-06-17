import type { AgentSkill, PiExtension } from "@pi/extension-sdk";
import type { AgentProvider, ProviderResponse } from "./providers.js";
import { ToolRegistry } from "./tool-registry.js";

export interface AgentRuntimeOptions {
  cwd: string;
  provider: AgentProvider;
  model?: string;
  extensions?: PiExtension[];
  skillIds?: string[];
}

export interface AgentRunResult {
  content: string;
  provider: string;
  toolCount: number;
  raw?: unknown;
}

const BASE_SYSTEM_PROMPT = [
  "You are Pi, a local-first coding agent.",
  "Be direct, inspect the workspace before making claims, and prefer small reversible changes.",
  "Explain tool use and file edits clearly."
].join("\n");

export class AgentRuntime {
  private readonly cwd: string;
  private readonly provider: AgentProvider;
  private readonly model?: string;
  private readonly extensions: PiExtension[];
  private readonly skillIds: string[];
  private readonly registry = new ToolRegistry();

  constructor(options: AgentRuntimeOptions) {
    this.cwd = options.cwd;
    this.provider = options.provider;
    this.model = options.model;
    this.extensions = options.extensions ?? [];
    this.skillIds = options.skillIds ?? [];

    for (const extension of this.extensions) {
      for (const tool of extension.tools ?? []) {
        this.registry.register(tool);
      }
    }
  }

  async run(prompt: string): Promise<AgentRunResult> {
    const response = await this.provider.complete({
      prompt,
      systemPrompt: this.systemPrompt(),
      tools: this.registry.list(),
      model: this.model
    });

    return this.formatResult(response);
  }

  listExtensions(): PiExtension[] {
    return [...this.extensions];
  }

  listTools() {
    return this.registry.list();
  }

  listSkills(): AgentSkill[] {
    return this.extensions.flatMap((extension) => extension.skills ?? []);
  }

  private systemPrompt(): string {
    const extensionPrompts = this.extensions
      .map((extension) => extension.systemPrompt)
      .filter((prompt): prompt is string => Boolean(prompt));

    const skillPrompts = this.selectedSkills().map((skill) => [
      `Skill: ${skill.title} (${skill.id})`,
      skill.prompt
    ].join("\n"));

    return [BASE_SYSTEM_PROMPT, ...extensionPrompts, ...skillPrompts].join("\n\n");
  }

  private selectedSkills(): AgentSkill[] {
    if (this.skillIds.length === 0) {
      return [];
    }

    const skillsById = new Map(this.listSkills().map((skill) => [skill.id, skill]));
    return this.skillIds.map((skillId) => {
      const skill = skillsById.get(skillId);

      if (!skill) {
        throw new Error(`Skill "${skillId}" is not available. Load an extension that provides it.`);
      }

      return skill;
    });
  }

  private formatResult(response: ProviderResponse): AgentRunResult {
    return {
      content: response.content,
      provider: this.provider.name,
      toolCount: this.registry.list().length,
      raw: response.raw
    };
  }
}
