# Adapter SDK

```ts
import { defineTestAdapter } from "@stackglass/core";

export const adapter = defineTestAdapter({
  id: "ava",
  name: "AVA",
  detect(root) { /* ... */ },
  discover(root, files) { /* ... */ },
  async run(options) { /* ... */ },
});
```
