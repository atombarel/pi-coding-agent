import { copyFile, mkdir, readdir } from "node:fs/promises";
import path from "node:path";

const mode = process.argv[2];
const root = process.cwd();
const templatesDir = path.join(root, "templates", "permissions");
const target = path.join(root, ".pi", "agent", "pi-permissions.jsonc");

if (!mode) {
  const modes = (await readdir(templatesDir))
    .filter((file) => file.endsWith(".jsonc"))
    .map((file) => file.replace(/\.jsonc$/, ""))
    .sort();

  console.log(`Usage: npm run permissions:mode -- <${modes.join("|")}>`);
  process.exit(1);
}

const source = path.join(templatesDir, `${mode}.jsonc`);
await mkdir(path.dirname(target), { recursive: true });
await copyFile(source, target);
console.log(`Permission mode set to ${mode}. Restart Pi or run /reload.`);
