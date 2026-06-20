import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";

export default function piWorkbench(pi: ExtensionAPI) {
  pi.on("session_start", async (_event, ctx) => {
    ctx.ui.setStatus("pi-workbench", "Pi setup loaded");
  });

  pi.on("tool_call", async (event, ctx) => {
    if (event.toolName !== "bash") return;

    const input = event.input as { command?: string };
    const command = input.command ?? "";

    if (/\brm\s+-rf\b/.test(command) || /\bsudo\b/.test(command)) {
      const ok = await ctx.ui.confirm("Sensitive shell command", `Allow this command?\n\n${command}`);
      if (!ok) return { block: true, reason: "Blocked by pi-workbench." };
    }
  });

  pi.registerCommand("pi-status", {
    description: "Show the active personal Pi setup hints",
    handler: async (_args, ctx) => {
      ctx.ui.notify(
        [
          "Personal Pi setup is active.",
          "Main lanes: openai-codex, github-copilot, openrouter.",
          "Thinking level is shown in the footer next to the model; Shift+Tab cycles it.",
          "Use /model for switching and /login for subscription/API auth."
        ].join("\n"),
        "info"
      );
    }
  });
}
