#!/usr/bin/env node
import { startStdio } from "./server.ts";

const root = process.env.STACKGLASS_ROOT?.trim() || process.cwd();
await startStdio(root);
