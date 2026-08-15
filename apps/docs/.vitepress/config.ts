import { defineConfig } from "vitepress";

const base = process.env.DOCS_BASE || "/";
const site = "https://theworker02.github.io/stackglass/";

export default defineConfig({
  title: "Stackglass",
  description: "See what your project is actually doing.",
  base,
  lang: "en-US",
  lastUpdated: true,
  appearance: "dark",
  cleanUrls: true,
  head: [
    ["link", { rel: "icon", href: `${base}favicon.svg` }],
    ["meta", { property: "og:title", content: "Stackglass" }],
    [
      "meta",
      {
        property: "og:description",
        content: "See what your project is actually doing.",
      },
    ],
    ["meta", { property: "og:image", content: `${site}og.svg` }],
    ["meta", { name: "twitter:card", content: "summary_large_image" }],
  ],
  themeConfig: {
    logo: "/logo.svg",
    siteTitle: "STACKGLASS",
    nav: [
      { text: "Guide", link: "/getting-started/introduction" },
      { text: "GlassLab", link: "/glasslab/overview" },
      { text: "MCP", link: "/mcp/setup" },
      { text: "CLI", link: "/reference/cli" },
      { text: "GitHub", link: "https://github.com/theworker02/stackglass" },
    ],
    search: { provider: "local" },
    sidebar: [
      {
        text: "Getting Started",
        items: [
          { text: "Introduction", link: "/getting-started/introduction" },
          { text: "Installation", link: "/getting-started/installation" },
          { text: "Quick Start", link: "/getting-started/quick-start" },
          { text: "Cursor Setup", link: "/getting-started/cursor-setup" },
        ],
      },
      {
        text: "Concepts",
        items: [
          { text: "Project State", link: "/concepts/project-state" },
          { text: "Timeline", link: "/concepts/timeline" },
          { text: "Snapshots", link: "/concepts/snapshots" },
          { text: "Failures", link: "/concepts/failures" },
          { text: "Test Relationships", link: "/concepts/test-relationships" },
        ],
      },
      {
        text: "GlassLab",
        items: [
          { text: "Overview", link: "/glasslab/overview" },
          { text: "Discovery", link: "/glasslab/discovery" },
          { text: "Test Plans", link: "/glasslab/test-plans" },
          { text: "Test Runs", link: "/glasslab/test-runs" },
          { text: "Coverage", link: "/glasslab/coverage" },
          { text: "Flake Detection", link: "/glasslab/flake-detection" },
          { text: "Mutation Testing", link: "/glasslab/mutation-testing" },
          { text: "Contracts", link: "/glasslab/contracts" },
          { text: "Snapshots", link: "/glasslab/snapshots" },
          { text: "Benchmarks", link: "/glasslab/benchmarks" },
          { text: "History", link: "/glasslab/history" },
        ],
      },
      {
        text: "MCP",
        items: [
          { text: "Setup", link: "/mcp/setup" },
          { text: "Tools", link: "/mcp/tools" },
          { text: "Tool reference", link: "/mcp/tools-reference" },
          { text: "Resources", link: "/mcp/resources" },
          { text: "Prompts", link: "/mcp/prompts" },
          { text: "Security", link: "/mcp/security" },
        ],
      },
      {
        text: "Developer Tools",
        items: [
          { text: "Runtime", link: "/tools/runtime" },
          { text: "Configuration", link: "/tools/configuration" },
          { text: "Documentation", link: "/tools/documentation" },
          { text: "Git", link: "/tools/git" },
          { text: "Releases", link: "/tools/releases" },
        ],
      },
      {
        text: "Extending",
        items: [
          { text: "Adapter SDK", link: "/extending/adapter-sdk" },
          { text: "Test Adapters", link: "/extending/test-adapters" },
          { text: "Error Adapters", link: "/extending/error-adapters" },
          { text: "Contract Adapters", link: "/extending/contract-adapters" },
        ],
      },
      {
        text: "Reference",
        items: [
          { text: "CLI", link: "/reference/cli" },
          { text: "Configuration", link: "/reference/configuration" },
          { text: "Events", link: "/reference/events" },
          { text: "Architecture", link: "/reference/architecture" },
          { text: "Troubleshooting", link: "/reference/troubleshooting" },
        ],
      },
    ],
    socialLinks: [{ icon: "github", link: "https://github.com/theworker02/stackglass" }],
    footer: {
      message: "Local-first developer observability. Distributed from GitHub, not npm.",
      copyright: "MIT License",
    },
  },
});
