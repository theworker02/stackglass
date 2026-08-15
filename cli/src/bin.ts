#!/usr/bin/env node
import { runCli } from "./cli.ts";

const code = await runCli(process.argv, process.cwd());
process.exit(code);
