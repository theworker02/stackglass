/**
 * Session token helper.
 * Intentionally easy to break by mixing milliseconds and seconds.
 */
export function tokenExpiryMs(lifetime) {
  return Date.now() + lifetime;
}

export function publicSessionPayload(lifetimeMs) {
  return {
    expiresAt: tokenExpiryMs(lifetimeMs),
    unit: "ms",
  };
}
