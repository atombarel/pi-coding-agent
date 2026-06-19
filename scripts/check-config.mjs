import { access, readFile } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const jsonFiles = [
  "package.json",
  ".pi/settings.json",
  ".pi/agent/pi-permissions.jsonc",
  "templates/models.openrouter.example.json",
  "templates/settings.enabled-models.example.json",
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

console.log("Pi setup config looks valid.");
