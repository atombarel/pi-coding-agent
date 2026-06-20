import { existsSync, readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import os from "node:os";
import path from "node:path";

const checks = [];

function add(name, ok, detail, required = true) {
  checks.push({ name, ok, detail, required });
}

function commandOutput(result, fallback) {
  return result.stdout?.trim() || result.stderr?.trim() || fallback;
}

const localPi = path.join(process.cwd(), "node_modules", ".bin", "pi");
const piCommand = existsSync(localPi) ? localPi : "pi";
const themeName = "pi-studio-dark";
const themePath = ".pi/themes/pi-studio-dark.json";
const pi = spawnSync(piCommand, ["--version"], { encoding: "utf8" });
add("pi binary", pi.status === 0, commandOutput(pi, "not found"));

const rtk = spawnSync("rtk", ["--version"], { encoding: "utf8" });
add("rtk binary", rtk.status === 0, commandOutput(rtk, "not found"), false);

add("project settings", existsSync(".pi/settings.json"), ".pi/settings.json");
add("permission policy", existsSync(".pi/agent/pi-permissions.jsonc"), ".pi/agent/pi-permissions.jsonc");
add("project theme", existsSync(themePath), themePath);
add("plan mode package", existsSync(".pi/npm/node_modules/@narumitw/pi-plan-mode"), ".pi/npm/node_modules/@narumitw/pi-plan-mode", false);
add("project extension", existsSync(".pi/extensions/pi-workbench.ts"), ".pi/extensions/pi-workbench.ts");
add("project skills", existsSync(".pi/skills"), ".pi/skills");

if (existsSync(".pi/settings.json")) {
  const settings = JSON.parse(readFileSync(".pi/settings.json", "utf8"));
  const themeEnabled = settings.theme === themeName && settings.themes?.includes("themes");
  add("active theme", themeEnabled, settings.theme ?? "unset");
}

const authPath = path.join(os.homedir(), ".pi", "agent", "auth.json");
add("auth file", existsSync(authPath), authPath, false);

const modelsPath = path.join(os.homedir(), ".pi", "agent", "models.json");
add("global models", existsSync(modelsPath), modelsPath, false);

const toolDisplayConfigPath = path.join(os.homedir(), ".pi", "agent", "extensions", "pi-tool-display", "config.json");
add("tool display config", existsSync(toolDisplayConfigPath), toolDisplayConfigPath, false);

add("OPENROUTER_API_KEY", Boolean(process.env.OPENROUTER_API_KEY), process.env.OPENROUTER_API_KEY ? "set" : "not set", false);

if (existsSync(".gitignore")) {
  const gitignore = readFileSync(".gitignore", "utf8").split(/\r?\n/);
  const requiredIgnoredPaths = [
    ".env",
    ".env.*",
    ".pi/sessions/",
    ".pi/npm/",
    ".pi/agent/auth.json",
    ".pi/agent/models.json"
  ];
  const missingIgnores = requiredIgnoredPaths.filter((entry) => !gitignore.includes(entry));
  add(
    "sensitive path ignores",
    missingIgnores.length === 0,
    missingIgnores.length === 0 ? "configured" : `missing ${missingIgnores.join(", ")}`
  );
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
  { encoding: "utf8" }
);

if (trackedSensitive.status === 0) {
  const tracked = trackedSensitive.stdout?.trim() ?? "";
  add(
    "tracked sensitive runtime files",
    tracked.length === 0,
    tracked.length === 0 ? "none" : tracked
  );
}

for (const check of checks) {
  console.log(`${check.ok ? "ok " : "!! "} ${check.name}: ${check.detail}`);
}

const failed = checks.filter((check) => check.required && !check.ok);
if (failed.length > 0) {
  process.exitCode = 1;
}
