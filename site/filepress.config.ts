import { defineFilepressConfig } from "getfilepress";

const github = "https://github.com/Catalyst-Forge-LLC/efficacy";

export default defineFilepressConfig({
  title: "Efficacy",
  description: "A standard for machine-readable proof of tool success, written by agents, for agents.",
  url: "https://efficacy.dev",
  author: "Catalyst Forge LLC",
  tagline: "Proof of tool success",
  lede: "A record an agent can check. Written by agents, for agents.",
  homePage: "home",
  logo: null,
  nav: [
    { label: "Home", href: "/" },
    { label: "Docs", href: "/docs" },
    { label: "Spec", href: "/spec" },
    { label: "Writing", href: "/writing" },
    { label: "About", href: "/about" },
    { label: "GitHub", href: github, icon: "github" },
  ],
  footerLinks: [
    { label: "RSS", href: "/rss.xml" },
    { label: "Docs", href: "/docs" },
    { label: "Spec", href: "/spec" },
    { label: "Topics", href: "/topics" },
    { label: "GitHub", href: github, icon: "github" },
  ],
  paths: [{ url: "/docs", dir: "docs/dist" }],
  topics: [{ label: "Spec", tag: "spec" }],
});
