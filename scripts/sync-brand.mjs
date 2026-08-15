import { cpSync, existsSync, mkdirSync } from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const assets = path.join(root, "assets");

function copy(from, to) {
  if (!existsSync(from)) return;
  mkdirSync(path.dirname(to), { recursive: true });
  cpSync(from, to);
}

const mark = path.join(assets, "stackglass-mark.svg");
const logo = path.join(assets, "stackglass-logo.svg");
const favicon = path.join(assets, "favicon.svg");
const og = path.join(assets, "stackglass-og.svg");

copy(logo, path.join(root, "apps/docs/public/logo.svg"));
copy(favicon, path.join(root, "apps/docs/public/favicon.svg"));
copy(og, path.join(root, "apps/docs/public/og.svg"));
copy(logo, path.join(root, "apps/dashboard/public/logo.svg"));
copy(favicon, path.join(root, "apps/dashboard/public/favicon.svg"));
copy(mark, path.join(root, "assets/logo.svg"));

console.log("brand assets synced");
