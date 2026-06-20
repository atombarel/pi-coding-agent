import { spawnSync } from "node:child_process";
import { access, readFile } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const themeName = "pi-studio-dark";
const themePath = ".pi/themes/pi-studio-dark.json";
const jsonFiles = [
  "package.json",
  ".pi/settings.json",
  ".pi/agent/pi-permissions.jsonc",
  themePath,
  "templates/models.openrouter.example.json",
  "templates/settings.enabled-models.example.json",
  "templates/tool-display/balanced.json",
  "templates/permissions/balanced.jsonc",
  "templates/permissions/review.jsonc",
  "templates/permissions/yolo.jsonc"
];

for (const file of jsonFiles) {
  const fullPath = path.join(root, file);
  const content = await readFile(fullPath, "utf8");
  JSON.parse(content);
}

const required = [
  "AGENTS.md",
  "SECURITY.md",
  "docs/architecture.md",
  "docs/enterprise-readiness.md",
  ".github/CODEOWNERS",
  ".github/dependabot.yml",
  ".github/workflows/ci.yml",
  ".pi/extensions/pi-workbench.ts",
  ".pi/skills/plan/SKILL.md",
  ".pi/skills/review/SKILL.md",
  ".pi/prompts/provider-smoke.md",
  "scripts/install-or-update.mjs",
  "scripts/install-or-update.zsh"
];

await Promise.all(required.map((file) => access(path.join(root, file))));

const settings = JSON.parse(await readFile(path.join(root, ".pi/settings.json"), "utf8"));
if (settings.theme !== themeName) {
  throw new Error(`Expected .pi/settings.json theme to be ${themeName}, got ${settings.theme}`);
}

if (!Array.isArray(settings.themes) || !settings.themes.includes("themes")) {
  throw new Error("Expected .pi/settings.json to load the project themes directory.");
}

const enabledModelsTemplate = JSON.parse(
  await readFile(path.join(root, "templates/settings.enabled-models.example.json"), "utf8")
);
const expectedEnabledModels = [
  "openai-codex/gpt-5.5:high",
  "openai-codex/gpt-5.4:high",
  "openai-codex/gpt-5.4-mini:high",
  "openai-codex/gpt-5.3-codex-spark:high",
  "openai/gpt-5.5:high",
  "openai/gpt-5.5-pro:high",
  "openai/gpt-5.4:high",
  "openai/gpt-5.4-mini:high",
  "openai/gpt-5.4-nano:low"
];

for (const modelPattern of expectedEnabledModels) {
  if (!enabledModelsTemplate.enabledModels?.includes(modelPattern)) {
    throw new Error(`Expected enabled model template to include ${modelPattern}`);
  }
}

const expectedPackages = [
  "npm:@sherif-fanous/pi-rtk@0.6.0",
  "npm:@narumitw/pi-plan-mode@0.5.0",
  "npm:pi-permission-system@0.7.1",
  "npm:pi-tool-display@0.4.3"
];

const packages = settings.packages ?? [];
for (const packageName of expectedPackages) {
  if (!packages.includes(packageName)) {
    throw new Error(`Expected .pi/settings.json packages to include ${packageName}`);
  }
}

const floatingPackages = packages.filter((packageName) => {
  const spec = packageName.replace(/^npm:/, "");
  const nameStart = spec.startsWith("@") ? spec.indexOf("/", 1) + 1 : 0;
  return !spec.slice(nameStart).includes("@");
});

if (floatingPackages.length > 0) {
  throw new Error(`Project Pi packages must be pinned: ${floatingPackages.join(", ")}`);
}

const gitignore = await readFile(path.join(root, ".gitignore"), "utf8");
const requiredIgnoredPaths = [
  "node_modules/",
  ".pi/npm/",
  ".pi/sessions/",
  ".pi/agent/auth.json",
  ".pi/agent/models.json",
  ".env",
  ".env.*",
  "!.env.example"
];

for (const ignoredPath of requiredIgnoredPaths) {
  if (!gitignore.split(/\r?\n/).includes(ignoredPath)) {
    throw new Error(`Expected .gitignore to include ${ignoredPath}`);
  }
}

const trackedSensitive = spawnSync(
  "git",
  [
    "ls-files",
    "--",
    ".env",
    ".pi/sessions",
    ".pi/npm",
    ".pi/agent/auth.json",
    ".pi/agent/models.json"
  ],
  { cwd: root, encoding: "utf8" }
);

if (trackedSensitive.status === 0 && trackedSensitive.stdout.trim()) {
  throw new Error(`Sensitive runtime files are tracked:\n${trackedSensitive.stdout.trim()}`);
}

const builtInDark = JSON.parse(
  await readFile(
    path.join(
      root,
      "node_modules/@earendil-works/pi-coding-agent/dist/modes/interactive/theme/dark.json"
    ),
    "utf8"
  )
);
const projectTheme = JSON.parse(await readFile(path.join(root, themePath), "utf8"));
const missingColors = Object.keys(builtInDark.colors).filter((key) => !(key in projectTheme.colors));

if (projectTheme.name !== themeName) {
  throw new Error(`Expected ${themePath} name to be ${themeName}, got ${projectTheme.name}`);
}

if (missingColors.length > 0) {
  throw new Error(`Project theme is missing colors: ${missingColors.join(", ")}`);
}

console.log("Pi setup config looks valid.");
