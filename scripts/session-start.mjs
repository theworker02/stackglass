#!/usr/bin/env node
import { stdin } from "node:process";

const chunks = [];
for await (const chunk of stdin) chunks.push(chunk);
const input = Buffer.concat(chunks).toString("utf8");
try {
  JSON.parse(input || "{}");
} catch {
  /* ignore */
}
process.stdout.write(JSON.stringify({ continue: true, permission: "allow" }));
