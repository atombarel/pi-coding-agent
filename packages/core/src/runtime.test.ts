import { describe, expect, it } from "vitest";
import { defineExtension } from "@pi/extension-sdk";
import { AgentRuntime, EchoProvider } from "./index.js";

describe("AgentRuntime", () => {
  it("merges extension prompts and tools", async () => {
    const runtime = new AgentRuntime({
      cwd: process.cwd(),
      provider: new EchoProvider(),
      extensions: [
        defineExtension({
          id: "test",
          systemPrompt: "Use the test extension.",
          tools: [
            {
              name: "test_tool",
              description: "A test tool.",
              execute: async () => ({ content: "ok" })
            }
          ]
        })
      ]
    });

    const result = await runtime.run("hello");

    expect(result.toolCount).toBe(1);
    expect(result.content).toContain("Use the test extension.");
    expect(result.content).toContain("test_tool");
  });

  it("adds selected skill prompts", async () => {
    const runtime = new AgentRuntime({
      cwd: process.cwd(),
      provider: new EchoProvider(),
      skillIds: ["codex-goal"],
      extensions: [
        defineExtension({
          id: "base",
          skills: [
            {
              id: "codex-goal",
              title: "Codex Goal",
              description: "Manage a long-running goal.",
              prompt: "Track objective, progress, verification, and completion."
            }
          ]
        })
      ]
    });

    const result = await runtime.run("ship it");

    expect(result.content).toContain("Skill: Codex Goal (codex-goal)");
    expect(result.content).toContain("Track objective");
  });
});
