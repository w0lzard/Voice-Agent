import { themes as prismThemes } from 'prism-react-renderer';
import type { Config } from '@docusaurus/types';
import type * as Preset from '@docusaurus/preset-classic';

const config: Config = {
  title: 'Voice Agent Platform',
  tagline: 'Voice calling agents with LiveKit, Vobiz, Gemini, and OpenAI',
  favicon: 'img/favicon.ico',

  future: {
    v4: true,
  },

  url: 'https://piyush-sahoo.github.io',
  baseUrl: '/Voice-AI-Platform/',

  organizationName: 'Piyush-sahoo',
  projectName: 'Voice-AI-Platform',

  onBrokenLinks: 'warn',

  i18n: {
    defaultLocale: 'en',
    locales: ['en'],
  },

  presets: [
    [
      'classic',
      {
        docs: false,
        blog: false,
        theme: {
          customCss: './src/css/custom.css',
        },
      } satisfies Preset.Options,
    ],
  ],

  themeConfig: {
    image: 'img/social-card.png',
    colorMode: {
      defaultMode: 'dark',
      respectPrefersColorScheme: true,
    },
    navbar: {
      title: 'Voice Agent Platform',
      logo: {
        alt: 'Voice Agent Platform Logo',
        src: 'img/logo.svg',
      },
      items: [
        {
          to: '/',
          label: 'Overview',
          position: 'left',
        },
        {
          href: 'https://github.com/Piyush-sahoo/Voice-AI-Platform#readme',
          label: 'README',
          position: 'left',
        },
        {
          href: 'https://github.com/Piyush-sahoo/Voice-AI-Platform',
          label: 'GitHub',
          position: 'right',
        },
      ],
    },
    footer: {
      style: 'dark',
      links: [
        {
          title: 'Project',
          items: [
            {
              label: 'README',
              href: 'https://github.com/Piyush-sahoo/Voice-AI-Platform#readme',
            },
            {
              label: 'Repository',
              href: 'https://github.com/Piyush-sahoo/Voice-AI-Platform',
            },
          ],
        },
        {
          title: 'Community',
          items: [
            {
              label: 'Issues',
              href: 'https://github.com/Piyush-sahoo/Voice-AI-Platform/issues',
            },
          ],
        },
      ],
      copyright: `Copyright © ${new Date().getFullYear()} Voice Agent Platform.`,
    },
    prism: {
      theme: prismThemes.github,
      darkTheme: prismThemes.dracula,
      additionalLanguages: ['bash', 'python', 'json'],
    },
  } satisfies Preset.ThemeConfig,
};

export default config;
