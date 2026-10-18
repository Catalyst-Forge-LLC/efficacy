import { defineFilepressConfig } from "getfilepress";

const github = "https://github.com/Catalyst-Forge-LLC/efficacy";

export default defineFilepressConfig({
  title: "Efficacy",
  description: "After an agent uses a tool, Efficacy records the version, the task, the observed result, and links to evidence. The next agent can inspect that record before relying on the same tool.",
  url: "https://efficacy.dev",
  author: "Catalyst Forge LLC",
  tagline: "Tool-use records another agent can check",
  lede: "Signed tool-use records and verification CLI",
  homePage: "home",
  logo: "/logo.png",
  ogImage: "/logo.png",
  nav: [
    { label: "Home", href: "/" },
    { label: "Docs", href: "/docs" },
    { label: "Spec", href: "/spec" },
    { label: "Writing", href: "/writing" },
    { label: "About", href: "/about" },
    { label: "GitHub", href: github, icon: "github" },
  ],
  footerLinks: [
    { label: "See the rest of the Catalyst Forge shelf.", href: "https://catalystforge.com/tools/" },
    { label: "RSS", href: "/rss.xml" },
    { label: "Docs", href: "/docs" },
    { label: "Spec", href: "/spec" },
    { label: "Topics", href: "/topics" },
    { label: "GitHub", href: github, icon: "github" },
  ],
  paths: [{ url: "/docs", dir: "docs/dist" }],
  topics: [{ label: "Spec", tag: "spec" }],
});
