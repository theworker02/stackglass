import { describe, expect, it } from "vitest";
import * as fc from "fast-check";
import { toPosix, normalizePath, fingerprintText, redactSecrets } from "./index.ts";
import { stackglassConfigSchema } from "./config.ts";

describe("property: path normalization", () => {
  it("never leaves backslashes in posix form", () => {
    fc.assert(
      fc.property(fc.string({ minLength: 1, maxLength: 80 }), (s) => {
        expect(toPosix(s).includes("\\")).toBe(false);
      }),
    );
  });

  it("normalizePath is idempotent", () => {
    fc.assert(
      fc.property(
        fc.array(fc.constantFrom("src", "auth", "token.ts", "a", "b"), {
          minLength: 1,
          maxLength: 5,
        }),
        (parts) => {
          const joined = parts.join("/");
          expect(normalizePath(normalizePath(joined))).toBe(normalizePath(joined));
        },
      ),
    );
  });
});

describe("property: fingerprints", () => {
  it("digits do not change the fingerprint", () => {
    fc.assert(
      fc.property(fc.integer({ min: 0, max: 99999 }), (n) => {
        expect(fingerprintText(["err", `line ${n}`])).toBe(fingerprintText(["err", "line 0"]));
      }),
    );
  });
});

describe("property: config merge", () => {
  it("empty object parses to defaults", () => {
    const parsed = stackglassConfigSchema.parse({});
    expect(parsed.history.retentionDays).toBe(30);
    expect(parsed.telemetry.enabled).toBe(false);
  });
});

describe("property: secret redaction", () => {
  it("never emits ghp tokens", () => {
    fc.assert(
      fc.property(fc.string({ minLength: 20, maxLength: 40 }), (suffix) => {
        const token = `ghp_${suffix.replace(/[^A-Za-z0-9]/g, "a")}aaaaaaaaaa`;
        expect(redactSecrets(`x=${token}`)).not.toContain("ghp_");
      }),
    );
  });
});
