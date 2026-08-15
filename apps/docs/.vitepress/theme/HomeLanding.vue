<script setup lang="ts">
import { withBase } from "vitepress";

const plugin = "https://cursor.directory/plugins/stackglass";
const github = "https://github.com/theworker02/stackglass";
const release = "https://github.com/theworker02/stackglass/releases/tag/v1.1.0";
const mcpCommand = "node ${PLUGIN_ROOT}/scripts/stackglass-mcp.mjs";

const groups = [
  {
    title: "Project intelligence",
    tools: [
      ["project_snapshot", "Observable workspace state, optional narrative"],
      ["project_activity_timeline", "Flight-recorder events, optional session"],
      ["code_context", "Source excerpt, symbols, related tests"],
      ["dependency_trace", "Imports and dependents"],
      ["change_impact", "Affected files, tests, risk, optional heat"],
    ],
  },
  {
    title: "Git and runtime",
    tools: [
      ["git_change_summary", "Structured working-tree diff"],
      ["git_history_context", "Recent commits, optional ranking"],
      ["runtime_status", "Stackglass-managed processes only"],
      ["runtime_logs", "Sanitized logs, never secret values"],
      ["error_analyze", "Parse compiler, test, or runtime errors"],
      ["error_trace", "Connect an error to source, git, and tests"],
    ],
  },
  {
    title: "GlassLab",
    tools: [
      ["test_discover", "Frameworks, files, and cases with evidence"],
      ["test_plan", "Smallest useful verification plan"],
      ["test_run", "Execute a plan; optional files or repeat"],
      ["test_failure_analyze", "History and optional clusters"],
      ["coverage_inspect", "Provider artifacts only; never invented"],
      ["mutation_test", "Isolated mutants, working tree untouched"],
      ["contract_verify", "Contracts and breaking JSON compare"],
    ],
  },
  {
    title: "Integrity",
    tools: [
      ["config_audit", "Drift, conflicts, duplicated lockfiles"],
      ["env_usage", "Variable names and locations, never values"],
      ["docs_check", "README commands and file references"],
      ["release_readiness", "Release report. Never publishes."],
    ],
  },
];
</script>

<template>
  <div class="sg-landing">
    <section>
      <span class="sg-kicker">What it is</span>
      <h2>Evidence for Cursor. Not another coding assistant.</h2>
      <p class="lead">
        Cursor writes and reasons about code. Stackglass is the local observability and verification
        layer: state, tests, failures, history, configuration, contracts, and documentation. Agents
        get evidence instead of guessing.
      </p>
      <div class="sg-split" style="margin-top: 22px">
        <article class="sg-card">
          <h3>Stackglass is</h3>
          <ul>
            <li>A local-first developer flight recorder</li>
            <li>A testing laboratory (GlassLab) that will not invent results</li>
            <li>Exactly 22 MCP tools, plus resources and prompts</li>
            <li>A CLI and a live dashboard on 127.0.0.1</li>
            <li>A Cursor plugin: rules, skills, agents, commands, hooks</li>
          </ul>
        </article>
        <article class="sg-card is-not">
          <h3>Stackglass is not</h3>
          <ul>
            <li>A coding assistant or a replacement for Cursor</li>
            <li>An npm package — there is no <code>bin</code>, no <code>npm link</code></li>
            <li>A 23rd MCP tool waiting to happen</li>
            <li>A cloud that uploads your source</li>
            <li>A publisher — <code>release_readiness</code> never ships a release</li>
          </ul>
        </article>
      </div>
    </section>

    <section>
      <span class="sg-kicker">MCP surface</span>
      <h2>Twenty-two tools. New capability is an argument, never a 23rd tool.</h2>
      <p class="lead">
        Resources such as <code>stackglass://session</code> and <code>stackglass://heat</code> are
        not tools. Optional modes (<code>narrative</code>, <code>session</code>, <code>heat</code>,
        <code>cluster</code>, <code>repeat</code>) stay on the existing names.
      </p>
      <div class="sg-tools" style="margin-top: 22px">
        <article v-for="group in groups" :key="group.title" class="sg-card sg-tool-group">
          <h3>{{ group.title }}</h3>
          <ul>
            <li v-for="[name, detail] in group.tools" :key="name">
              <code>{{ name }}</code>
              <span>{{ detail }}</span>
            </li>
          </ul>
        </article>
      </div>
    </section>

    <section>
      <span class="sg-kicker">Product surfaces</span>
      <h2>GlassLab, GlassLens, and a local dashboard.</h2>
      <div class="sg-panes" style="margin-top: 22px">
        <article class="sg-card sg-pane">
          <span class="sg-kicker">GlassLab</span>
          <h3>Testing laboratory</h3>
          <p>
            Discover frameworks, plan related tests with reasons, parse failures, store history, and
            inspect coverage, flakes, mutations, and contracts. A mixed pass/fail across repeats is
            a flake candidate. A single failure is never a flake.
          </p>
        </article>
        <article class="sg-card sg-pane">
          <span class="sg-kicker">GlassLens</span>
          <h3>Narrative over noise</h3>
          <p>
            <code>glass why</code> writes a narrative from evidence.
            <code>glass session</code> replays the timeline. <code>glass heat</code> ranks noisy
            files. Clusters group related failures. Newest commit is not assumed guilty.
          </p>
        </article>
        <article class="sg-card sg-pane">
          <span class="sg-kicker">Dashboard</span>
          <h3>Live on localhost</h3>
          <p>
            <code>glass dashboard</code> serves Why, Session, Heat, Clusters, GlassLab, and more on
            127.0.0.1. Cursor plugins do not expose a custom sidebar API; the dashboard and MCP
            resources are the UI.
          </p>
        </article>
      </div>
    </section>

    <section>
      <span class="sg-kicker">Privacy</span>
      <h2>Local-first. No account. No source upload.</h2>
      <div class="sg-split" style="margin-top: 22px">
        <article class="sg-card">
          <h3>What stays on the machine</h3>
          <ul>
            <li>
              Index, timeline, snapshots, and SQLite history live in <code>.stackglass/</code>
            </li>
            <li>Telemetry is off by default</li>
            <li>Core functionality does not require an account</li>
            <li>Source is not uploaded to a Stackglass service</li>
          </ul>
        </article>
        <article class="sg-card">
          <h3>What never comes back</h3>
          <ul>
            <li>
              Secret values are redacted from MCP, logs, timeline metadata, and doctor bundles
            </li>
            <li><code>env_usage</code> returns names and locations only</li>
            <li>
              Sensitive paths such as <code>.env</code> and <code>*.pem</code> are not indexed
            </li>
            <li>
              Missing data is <code>no_data</code> / <code>unavailable</code> — never invented
            </li>
          </ul>
        </article>
      </div>
    </section>

    <section>
      <span class="sg-kicker">Install from source</span>
      <h2>Clone, build, run. Not on npm.</h2>
      <div class="sg-install" style="margin-top: 22px">
        <article class="sg-card">
          <h3>From this repository</h3>
          <p>Requires Node.js 22.13 or later. Do not <code>npm install -g stackglass</code>.</p>
          <pre>
git clone https://github.com/theworker02/stackglass.git
cd stackglass
npm install
npm run build
node cli/dist/bin.js --help</pre>
        </article>
        <article class="sg-card">
          <h3>Against another project</h3>
          <p>Point the built CLI at the workspace. MCP uses <code>STACKGLASS_ROOT</code>.</p>
          <pre>
node /path/to/stackglass/cli/dist/bin.js init
node scripts/stackglass-mcp.mjs</pre>
          <div class="sg-cta">
            <a class="sg-btn ghost" :href="withBase('/getting-started/installation')"
              >Installation</a
            >
            <a class="sg-btn ghost" :href="withBase('/getting-started/cursor-setup')"
              >Cursor setup</a
            >
          </div>
        </article>
      </div>
    </section>

    <section>
      <span class="sg-kicker">Cursor plugin</span>
      <h2>Open Plugins layout at the repository root.</h2>
      <p class="lead">
        The plugin is not a nested marketplace package. Install from
        <a :href="plugin">cursor.directory/plugins/stackglass</a>
        or load this checkout in Cursor.
      </p>
      <article class="sg-card" style="margin-top: 22px">
        <pre>
.cursor-plugin/plugin.json
mcp.json
rules/
skills/
agents/
commands/
hooks/
scripts/stackglass-mcp.mjs</pre>
        <p>
          <code>mcp.json</code> starts <code>{{ mcpCommand }}</code> and sets
          <code>STACKGLASS_ROOT</code> to the current workspace. After install, run
          <code>node cli/dist/bin.js init</code> in the project so the agent has a database and
          index.
        </p>
      </article>
    </section>

    <section class="sg-band">
      <span class="sg-kicker">Start with evidence</span>
      <h2>Install the Cursor plugin, then give the agent a workspace to observe.</h2>
      <div class="sg-cta">
        <a class="sg-btn primary" :href="plugin">Install Cursor plugin</a>
        <a class="sg-btn ghost" :href="withBase('/getting-started/introduction')">Read the guide</a>
        <a class="sg-btn ghost" :href="github">GitHub</a>
        <a class="sg-btn ghost" :href="release">Release v1.1.0</a>
      </div>
    </section>
  </div>
</template>
