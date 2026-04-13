import { themes as prismThemes } from "prism-react-renderer";
import type { Config } from "@docusaurus/types";
import type * as Preset from "@docusaurus/preset-classic";

const config: Config = {
  title: "Kalshi CLI",
  tagline: "Terminal-first trading CLI on top of the official Kalshi TypeScript SDK",
  favicon: "img/favicon.ico",
  future: {
    v4: true,
  },
  url: "https://anmho.github.io",
  baseUrl: "/kalshi-cli/",
  organizationName: "anmho",
  projectName: "kalshi-cli",
  onBrokenLinks: "throw",
  i18n: {
    defaultLocale: "en",
    locales: ["en"],
  },
  presets: [
    [
      "classic",
      {
        docs: {
          routeBasePath: "/",
          sidebarPath: "./sidebars.ts",
          docItemComponent: "@theme/ApiItem",
          editUrl: "https://github.com/anmho/kalshi-cli/tree/main/website/",
        },
        blog: false,
        theme: {
          customCss: "./src/css/custom.css",
        },
      } satisfies Preset.Options,
    ],
  ],
  plugins: [
    [
      "docusaurus-plugin-openapi-docs",
      {
        id: "api",
        docsPluginId: "classic",
        config: {
          kalshi: {
            specPath: "../docs/openapi.yaml",
            outputDir: "docs/api",
            sidebarOptions: {
              groupPathsBy: "tag",
              categoryLinkSource: "tag",
            },
          },
        },
      },
    ],
  ],
  themes: ["docusaurus-theme-openapi-docs"],
  themeConfig: {
    image: "img/social-card.png",
    navbar: {
      title: "Kalshi CLI",
      items: [
        { to: "/", label: "Docs", position: "left" },
        { to: "/category/api-reference", label: "API Reference", position: "left" },
        { href: "https://docs.kalshi.com/", label: "Official Kalshi Docs", position: "right" },
        { href: "https://github.com/anmho/kalshi-cli", label: "GitHub", position: "right" },
      ],
    },
    footer: {
      style: "dark",
      links: [
        {
          title: "CLI",
          items: [
            { label: "Quickstart", to: "/quickstart" },
            { label: "Commands", to: "/cli-reference" },
            { label: "Trading Workflows", to: "/trading-workflows" },
          ],
        },
        {
          title: "References",
          items: [
            { label: "Official Kalshi Docs", href: "https://docs.kalshi.com/" },
            { label: "Kalshi TypeScript SDK", href: "https://docs.kalshi.com/sdks/typescript/quickstart" },
          ],
        },
      ],
      copyright: `Copyright © ${new Date().getFullYear()} Kalshi CLI.`,
    },
    prism: {
      theme: prismThemes.github,
      darkTheme: prismThemes.dracula,
    },
  } satisfies Preset.ThemeConfig,
};

export default config;
