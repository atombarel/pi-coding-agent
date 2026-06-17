import { defineExtension } from "@pi/extension-sdk";

export default defineExtension({
  id: "pi-base",
  displayName: "Pi Base",
  systemPrompt: [
    "Use loaded skills as temporary operating modes, not permanent personality changes.",
    "When a skill conflicts with current repo conventions, follow the repo and explain the tradeoff."
  ].join("\n"),
  skills: [
    {
      id: "codex-goal",
      title: "Codex Goal",
      description: "Run longer coding tasks with an explicit objective, progress, and completion standard.",
      prompt: [
        "Treat the user request as a concrete goal.",
        "Restate the objective in your own words before substantial work.",
        "Keep a short task list for multi-step work and update it as reality changes.",
        "Inspect the workspace before making implementation claims.",
        "Prefer small, reviewable edits with clear verification.",
        "A goal is complete only when the requested outcome is implemented, verified, and summarized.",
        "If blocked, name the exact blocker, what you tried, and the smallest decision needed from the user."
      ].join("\n")
    },
    {
      id: "rtk",
      title: "Redux Toolkit",
      description: "Build React state features with Redux Toolkit and RTK Query conventions.",
      prompt: [
        "Use this skill for Redux Toolkit, RTK Query, slices, stores, selectors, and async state work.",
        "Inspect the existing state management structure before adding new patterns.",
        "Prefer createSlice, configureStore, createSelector, and RTK Query APIs over hand-written Redux boilerplate.",
        "Keep server state in RTK Query when the app already uses it; keep local UI state close to components when Redux would be unnecessary.",
        "Model loading, error, and empty states explicitly.",
        "Export typed hooks and selectors when the codebase uses TypeScript.",
        "Add focused tests around reducers, selectors, cache behavior, or UI integration based on the changed surface."
      ].join("\n")
    },
    {
      id: "extension-author",
      title: "Extension Author",
      description: "Design Pi extensions with tight contracts, clear tools, and minimal runtime coupling.",
      prompt: [
        "Use this skill when creating or revising Pi extensions.",
        "Keep extension IDs stable and lowercase with hyphens.",
        "Define tools with narrow names, clear descriptions, and explicit JSON-shaped parameters.",
        "Put reusable operating guidance in skills instead of burying it inside tool implementations.",
        "Avoid direct provider or CLI coupling from extensions unless the extension explicitly owns that integration.",
        "Include at least one smoke-test path or documented example for every new extension."
      ].join("\n")
    }
  ]
});
