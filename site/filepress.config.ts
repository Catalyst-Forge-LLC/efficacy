import { defineFilepressConfig } from "getfilepress";

const github = "https://github.com/Catalyst-Forge-LLC/efficacy";

export default defineFilepressConfig({
  title: "Efficacy",
  description: "Signed, hash-bound records of tool use, with evidence another agent can check.",
  url: "https://efficacy.dev",
  author: "Catalyst Forge LLC",
  tagline: "Tool-use records another agent can check",
  lede: 'Record · evidence · verify',
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
