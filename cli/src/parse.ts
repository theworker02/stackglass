export interface ParsedArgs {
  command: string;
  rest: string[];
  flags: Record<string, string | boolean>;
}

export function parseArgs(argv: string[]): ParsedArgs {
  const args = argv.slice(2);
  const flags: Record<string, string | boolean> = {};
  const positional: string[] = [];
  for (let i = 0; i < args.length; i++) {
    const token = args[i]!;
    if (token === "--") {
      positional.push(...args.slice(i + 1));
      break;
    }
    if (token.startsWith("--")) {
      const eq = token.indexOf("=");
      if (eq !== -1) {
        flags[token.slice(2, eq)] = token.slice(eq + 1);
      } else {
        const key = token.slice(2);
        const next = args[i + 1];
        if (next && !next.startsWith("-")) {
          flags[key] = next;
          i++;
        } else {
          flags[key] = true;
        }
      }
    } else if (token.startsWith("-") && token.length === 2) {
      flags[token.slice(1)] = true;
    } else {
      positional.push(token);
    }
  }
  const command = positional.join(" ") || "help";
  return { command, rest: positional, flags };
}

export function flag(flags: Record<string, string | boolean>, name: string): string | undefined {
  const v = flags[name];
  if (typeof v === "string") return v;
  return undefined;
}
