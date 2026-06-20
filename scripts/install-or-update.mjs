import { spawnSync } from "node:child_process";
import {
  access,
  copyFile,
  cp,
  mkdir,
  readFile,
  rm,
  writeFile
} from "node:fs/promises";
import { existsSync, readFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";

const args = process.argv.slice(2);
const options = {
  agentDir: process.env.PI_CODING_AGENT_DIR
    ? path.resolve(process.env.PI_CODING_AGENT_DIR)
    : path.join(os.homedir(), ".pi", "agent"),
  permissionMode: "balanced",
  source: process.cwd(),
  skipPiInstall: false,
  skipPackageInstall: false,
  skipVerify: false,
  toolDisplayPreset: "balanced"
};

for (let i = 0; i < args.length; i += 1) {
  const arg = args[i];
  if (arg === "--source") options.source = path.resolve(args[++i]);
  else if (arg === "--agent-dir") options.agentDir = path.resolve(args[++i]);
  else if (arg === "--permission-mode") options.permissionMode = args[++i];
  else if (arg === "--tool-display-preset") options.toolDisplayPreset = args[++i];
  else if (arg === "--skip-pi-install") options.skipPiInstall = true;
  else if (arg === "--skip-package-install") options.skipPackageInstall = true;
  else if (arg === "--skip-verify") options.skipVerify = true;
  else if (arg === "--help" || arg === "-h") {
    usage();
    process.exit(0);
  } else {
    throw new Error(`Unknown option: ${arg}`);
  }
}

const sourceRoot = options.source;
const agentDir = options.agentDir;
const managedName = "personal-pi-setup";
const managedDir = path.join(agentDir, managedName);
const timestamp = new Date().toISOString().replace(/[:.]/g, "-");

const sourceSettings = JSON.parse(
  await readFile(path.join(sourceRoot, ".pi", "settings.json"), "utf8")
);
const packageLock = JSON.parse(await readFile(path.join(sourceRoot, "package-lock.json"), "utf8"));
const piPackageVersion =
  packageLock.packages?.["node_modules/@earendil-works/pi-coding-agent"]?.version;

if (!piPackageVersion) {
  throw new Error("Could not resolve the pinned Pi version from package-lock.json.");
}

const setupPackages = sourceSettings.packages ?? [];
const managedPaths = {
  extensions: [`${managedName}/extensions/pi-workbench.ts`],
  skills: [`${managedName}/skills`],
  prompts: [`${managedName}/prompts`],
  themes: [`${managedName}/themes`]
};

await requirePath(".pi/settings.json");
await requirePath(".pi/extensions/pi-workbench.ts");
await requirePath(".pi/skills/plan/SKILL.md");
await requirePath(".pi/skills/review/SKILL.md");
await requirePath(".pi/prompts/provider-smoke.md");
await requirePath(".pi/themes/pi-studio-dark.json");
await requirePath(`templates/permissions/${options.permissionMode}.jsonc`);
await requirePath(`templates/tool-display/${options.toolDisplayPreset}.json`);

console.log(`Installing personal Pi setup into ${agentDir}`);
await mkdir(agentDir, { recursive: true });

if (!options.skipPiInstall) {
  run("npm", ["install", "-g", `@earendil-works/pi-coding-agent@${piPackageVersion}`]);
}

await replaceManagedDirectory();
await installPolicy();
await installToolDisplayPreset();
await mergeGlobalSettings();

if (!options.skipPackageInstall) {
  const pi = resolvePiCommand();
  for (const packageSource of setupPackages) {
    if (typeof packageSource === "string") {
      run(pi.command, [...pi.prefixArgs, "install", packageSource]);
    }
  }
}

if (!options.skipVerify) {
  await verifyInstall();
}

console.log("");
console.log("Personal Pi setup is installed.");
console.log("Run `pi` from any worktree, then use `/login` for provider auth when needed.");
console.log("Run this same command again later to update from the repo reference.");

function usage() {
  console.log(`Usage: node scripts/install-or-update.mjs [options]

Options:
  --source <path>               Source repo snapshot. Defaults to cwd.
  --agent-dir <path>            Pi agent directory. Defaults to ~/.pi/agent.
  --permission-mode <mode>      Permission template to install. Defaults to balanced.
  --tool-display-preset <name>  Tool display preset to install. Defaults to balanced.
  --skip-pi-install             Do not install the pinned Pi CLI globally.
  --skip-package-install        Do not install pinned Pi packages.
  --skip-verify                 Skip post-install verification.`);
}

async function requirePath(relativePath) {
  await access(path.join(sourceRoot, relativePath));
}

async function replaceManagedDirectory() {
  await safeRm(managedDir, agentDir);
  await mkdir(managedDir, { recursive: true });

  const copies = [
    [".pi/extensions", "extensions"],
    [".pi/skills", "skills"],
    [".pi/prompts", "prompts"],
    [".pi/themes", "themes"],
    ["templates", "templates"],
    ["docs", "docs"]
  ];

  for (const [from, to] of copies) {
    await cp(path.join(sourceRoot, from), path.join(managedDir, to), {
      recursive: true,
      force: true
    });
  }

  for (const file of ["README.md", "SECURITY.md", "LICENSE"]) {
    const source = path.join(sourceRoot, file);
    if (existsSync(source)) {
      await copyFile(source, path.join(managedDir, file));
    }
  }
}

async function installPolicy() {
  const source = path.join(sourceRoot, "templates", "permissions", `${options.permissionMode}.jsonc`);
  const target = path.join(agentDir, "pi-permissions.jsonc");
  await copyFileWithBackup(source, target);
}

async function installToolDisplayPreset() {
  const source = path.join(
    sourceRoot,
    "templates",
    "tool-display",
    `${options.toolDisplayPreset}.json`
  );
  const target = path.join(agentDir, "extensions", "pi-tool-display", "config.json");
  await copyFileWithBackup(source, target);
}

async function mergeGlobalSettings() {
  const settingsPath = path.join(agentDir, "settings.json");
  const existing = existsSync(settingsPath)
    ? JSON.parse(await readFile(settingsPath, "utf8"))
    : {};

  const next = {
    ...existing,
    defaultProvider: sourceSettings.defaultProvider,
    defaultModel: sourceSettings.defaultModel,
    defaultThinkingLevel: sourceSettings.defaultThinkingLevel,
    theme: sourceSettings.theme,
    quietStartup: sourceSettings.quietStartup,
    doubleEscapeAction: sourceSettings.doubleEscapeAction,
    treeFilterMode: sourceSettings.treeFilterMode,
    editorPaddingX: sourceSettings.editorPaddingX,
    autocompleteMaxVisible: sourceSettings.autocompleteMaxVisible,
    shellPath: sourceSettings.shellPath,
    compaction: sourceSettings.compaction,
    retry: sourceSettings.retry,
    warnings: sourceSettings.warnings,
    enableSkillCommands: sourceSettings.enableSkillCommands,
    extensions: mergeArray(existing.extensions, managedPaths.extensions),
    skills: mergeArray(existing.skills, managedPaths.skills),
    prompts: mergeArray(existing.prompts, managedPaths.prompts),
    themes: mergeArray(existing.themes, managedPaths.themes),
    packages: mergePackages(existing.packages, setupPackages)
  };

  await writeJsonWithBackup(settingsPath, next);
}

async function verifyInstall() {
  const pi = resolvePiCommand();
  run(pi.command, [...pi.prefixArgs, "--version"]);

  const settingsPath = path.join(agentDir, "settings.json");
  const settings = JSON.parse(await readFile(settingsPath, "utf8"));

  const requiredFiles = [
    path.join(managedDir, "extensions", "pi-workbench.ts"),
    path.join(managedDir, "skills", "plan", "SKILL.md"),
    path.join(managedDir, "skills", "review", "SKILL.md"),
    path.join(managedDir, "prompts", "provider-smoke.md"),
    path.join(managedDir, "themes", "pi-studio-dark.json"),
    path.join(agentDir, "pi-permissions.jsonc"),
    path.join(agentDir, "extensions", "pi-tool-display", "config.json")
  ];

  for (const file of requiredFiles) {
    if (!existsSync(file)) throw new Error(`Missing installed file: ${file}`);
  }

  for (const [key, values] of Object.entries(managedPaths)) {
    for (const value of values) {
      if (!settings[key]?.includes(value)) {
        throw new Error(`Expected ${settingsPath} ${key} to include ${value}`);
      }
    }
  }

  for (const packageSource of setupPackages) {
    if (!settings.packages?.some((entry) => packageEntrySource(entry) === packageSource)) {
      throw new Error(`Expected ${settingsPath} packages to include ${packageSource}`);
    }
  }

  run(pi.command, [...pi.prefixArgs, "list", "--no-approve"]);
}

function mergeArray(existing, additions) {
  const next = Array.isArray(existing) ? [...existing] : [];
  for (const value of additions) {
    if (!next.includes(value)) next.push(value);
  }
  return next;
}

function mergePackages(existing, additions) {
  const next = Array.isArray(existing) ? [...existing] : [];
  for (const source of additions) {
    if (!next.some((entry) => packageEntrySource(entry) === source)) next.push(source);
  }
  return next;
}

function packageEntrySource(entry) {
  if (typeof entry === "string") return entry;
  if (entry && typeof entry === "object") return entry.source;
  return undefined;
}

async function writeJsonWithBackup(file, value) {
  const content = `${JSON.stringify(value, null, 2)}\n`;
  if (existsSync(file) && readFileSync(file, "utf8") === content) return;
  await backup(file);
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, content);
  console.log(`Updated ${file}`);
}

async function copyFileWithBackup(source, target) {
  const next = await readFile(source, "utf8");
  if (existsSync(target) && readFileSync(target, "utf8") === next) return;
  await backup(target);
  await mkdir(path.dirname(target), { recursive: true });
  await copyFile(source, target);
  console.log(`Updated ${target}`);
}

async function backup(file) {
  if (!existsSync(file)) return;
  const backupPath = `${file}.bak-${timestamp}`;
  await copyFile(file, backupPath);
  console.log(`Backed up ${file} -> ${backupPath}`);
}

async function safeRm(target, root) {
  const relative = path.relative(root, target);
  if (!relative || relative.startsWith("..") || path.isAbsolute(relative)) {
    throw new Error(`Refusing to remove unsafe path: ${target}`);
  }
  await rm(target, { recursive: true, force: true });
}

function resolvePiCommand() {
  if (commandSucceeds("pi", ["--version"])) return { command: "pi", prefixArgs: [] };

  const npmPrefix = spawnSync("npm", ["prefix", "-g"], { encoding: "utf8" });
  const prefix = npmPrefix.stdout?.trim();
  if (npmPrefix.status === 0 && prefix) {
    const candidate = path.join(prefix, "bin", "pi");
    if (commandSucceeds(candidate, ["--version"])) return { command: candidate, prefixArgs: [] };
  }

  return {
    command: "npx",
    prefixArgs: ["-y", `@earendil-works/pi-coding-agent@${piPackageVersion}`]
  };
}

function commandSucceeds(command, commandArgs) {
  const result = spawnSync(command, commandArgs, {
    env: { ...process.env, PI_CODING_AGENT_DIR: agentDir },
    stdio: "ignore"
  });
  return result.status === 0;
}

function run(command, commandArgs) {
  console.log(`$ ${[command, ...commandArgs].join(" ")}`);
  const result = spawnSync(command, commandArgs, {
    env: { ...process.env, PI_CODING_AGENT_DIR: agentDir },
    stdio: "inherit"
  });
  if (result.status !== 0) {
    throw new Error(`Command failed: ${[command, ...commandArgs].join(" ")}`);
  }
}
