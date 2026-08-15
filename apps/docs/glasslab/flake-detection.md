# Flake Detection

A test is a flake candidate only when it both passes and fails across multiple stored runs (at least three samples).

Confidence: low / moderate / high. Never from a single failure. CLI: `glass test flakes`.
