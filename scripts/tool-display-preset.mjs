import { copyFile, mkdir, readdir } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

const preset = process.argv[2];
const root = process.cwd();
const templatesDir = path.join(root, "templates", "tool-display");
const agentDir = process.env.PI_CODING_AGENT_DIR
  ? path.resolve(process.env.PI_CODING_AGENT_DIR)
  : path.join(os.homedir(), ".pi", "agent");
const target = path.join(agentDir, "extensions", "pi-tool-display", "config.json");

if (!preset) {
  const presets = (await readdir(templatesDir))
    .filter((file) => file.endsWith(".json"))
    .map((file) => file.replace(/\.json$/, ""))
    .sort();

  console.log(`Usage: npm run tool-display:preset -- <${presets.join("|")}>`);
  process.exit(1);
}

const source = path.join(templatesDir, `${preset}.json`);
await mkdir(path.dirname(target), { recursive: true });
await copyFile(source, target);
console.log(`Tool display preset set to ${preset}: ${target}`);
console.log("Restart Pi or run /reload.");
