import { defineConfig } from 'vitepress';

export default defineConfig({
  title: 'SMSPit',
  description: 'The Sandbox for SMS — self-hosted SMS capture, search, replay, and debug for local dev, testing, and CI/CD.',
  cleanUrls: true,
  ignoreDeadLinks: true,
  head: [['link', { rel: 'icon', href: '/assets/logo.svg' }]],

  themeConfig: {
    logo: '/assets/logo.svg',
    nav: [
      { text: 'Guide', link: '/architecture' },
      { text: 'API Reference', link: '/openapi/site/index.html', target: '_blank' },
      { text: 'SDKs', link: '/sdks' },
      { text: 'Changelog', link: '/changelog' },
    ],

    sidebar: [
      {
        text: 'Guide',
        items: [
          { text: 'Introduction', link: '/' },
          { text: 'Architecture', link: '/architecture' },
          { text: 'Local Development Setup', link: '/local-dev-setup' },
          { text: 'ADR: Tech Stack', link: '/adr/0001-tech-stack' },
        ],
      },
      {
        text: 'Services',
        items: [
          { text: 'Gateway (Go)', link: '/gateway' },
          { text: 'Auth Service (Laravel)', link: '/auth-service' },
          { text: 'SMS Service (NestJS)', link: '/sms-service' },
          { text: 'AI Service (FastAPI)', link: '/ai-service' },
          { text: 'Worker (Go)', link: '/worker' },
          { text: 'Dashboard (React)', link: '/dashboard' },
        ],
      },
      {
        text: 'API',
        items: [
          { text: 'Message Mapping', link: '/api/message-mapping' },
          { text: 'Provider Compatibility', link: '/api/provider-compatibility' },
          { text: 'OpenAPI Reference ↗', link: '/openapi/site/index.html' },
        ],
      },
      {
        text: 'SDKs',
        items: [
          { text: 'Overview', link: '/sdks' },
          { text: 'PHP', link: '/sdk-php' },
          { text: 'Go', link: '/sdk-go' },
          { text: 'Node.js', link: '/sdk-nodejs' },
          { text: 'Python', link: '/sdk-python' },
        ],
      },
      {
        text: 'Operations',
        items: [
          { text: 'Observability', link: '/observability' },
          { text: 'Security', link: '/security' },
          { text: 'Multi-tenancy', link: '/multi-tenancy' },
          { text: 'Load Testing', link: '/load-testing' },
          { text: 'Redis', link: '/redis' },
          { text: 'QA Pass (Day 98)', link: '/qa-day98' },
        ],
      },
      {
        text: 'Deployment',
        items: [
          { text: 'Production Deployment Guide', link: '/production-deployment' },
          { text: 'Container Registry', link: '/registry' },
          { text: 'Kubernetes', link: '/kubernetes' },
          { text: 'Helm Chart', link: '/helm' },
        ],
      },
      {
        text: 'Reference',
        items: [{ text: 'Changelog', link: '/changelog' }],
      },
    ],

    socialLinks: [{ icon: 'github', link: 'https://github.com/jmrashed/SMSPit' }],

    search: {
      provider: 'local',
    },

    footer: {
      message: 'Released under the MIT License.',
      copyright: 'SMSPit',
    },
  },
});
