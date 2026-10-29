import { defineFilepressConfig } from "getfilepress";

const github = "https://github.com/Catalyst-Forge-LLC/efficacy";

export default defineFilepressConfig({
  title: "Efficacy",
  description: "Record which tool version was used, what was observed, and the evidence behind the claim. Efficacy binds the record to signed, hashed artifacts so a later reader can catch changed files or evidence for the wrong version before relying on it.",
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
