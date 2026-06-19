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
  ".pi/extensions/pi-workbench.ts",
  ".pi/skills/plan/SKILL.md",
  ".pi/skills/review/SKILL.md",
  ".pi/prompts/provider-smoke.md"
];

await Promise.all(required.map((file) => access(path.join(root, file))));

const settings = JSON.parse(await readFile(path.join(root, ".pi/settings.json"), "utf8"));
if (settings.theme !== themeName) {
  throw new Error(`Expected .pi/settings.json theme to be ${themeName}, got ${settings.theme}`);
}

if (!Array.isArray(settings.themes) || !settings.themes.includes("themes")) {
  throw new Error("Expected .pi/settings.json to load the project themes directory.");
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
