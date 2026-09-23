# Buyer evaluation â€” stackglass

## Goal

In 15â€“45 minutes, verify the Product builds or runs as documented and that proprietary notices are present.

## Steps

1. Confirm root `LICENSE` is proprietary and `ACQUISITION.md` exists.
2. Skim `README.md` install/run claims.
3. Execute:

````
```text
Developer flight recorder
+ Testing laboratory (GlassLab)
+ Change inspector
+ Debugging assistant
+ Project status console
+ MCP server
+ Cursor agent toolkit
+ GlassLens (narrative, session, heat, clusters)
````

```text
token.ts edited Ã¢â€ â€™ typecheck fails Ã¢â€ â€™ two auth tests fail Ã¢â€ â€™ contract drifts Ã¢â€ â€™ README example goes stale
```

```bash
git clone https://github.com/theworker02/stackglass.git
cd stackglass
npm install
npm run build
node cli/dist/bin.js --help
```

```bash
node /path/to/stackglass/cli/dist/bin.js init
```

```bash
cd your-project
glass init
glass status
glass why
glass test related
glass dashboard
```

```bash
glass test related
glass test changed
glass test failed
glass test flakes
glass test repeat 5
glass test mutation src/auth/token.ts
glass test coverage
glass test contracts
```

4. Run tests if present (`npm test`, `pytest`, `cargo test`, `go test ./...`, etc.).
5. Record README vs observed behavior gaps in workpapers.

## Pass criteria

- [ ] Clone succeeds
- [ ] Documented happy path works **or** failure is explained
- [ ] Minimal path needs no surprise secrets
- [ ] License notices intact

_Updated: 2026-09-22_
