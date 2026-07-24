import { defineConfig } from 'vitepress';

export default defineConfig({
  title: 'SMSPit',
  description: 'The Sandbox for SMS — self-hosted SMS capture, search, replay, and debug for local dev, testing, and CI/CD.',
  cleanUrls: true,
  ignoreDeadLinks: [
    // Absolute links out to the GitHub repo (mirrored-file source links,
    // CONTRIBUTING.md, raw example files) -- these 404 in a local `vitepress
    // dev`/`build` check since they're real network requests, not local
    // files, but they're correct once deployed. Everything else is a real
    // local link and must resolve, or the build fails.
    /^https:\/\/github\.com\//,
  ],
  head: [['link', { rel: 'icon', href: '/assets/logo.svg' }]],

  themeConfig: {
    logo: '/assets/logo.svg',
    nav: [
      { text: 'Getting Started', link: '/getting-started' },
      { text: 'Services', link: '/gateway' },
      { text: 'API Reference', link: '/openapi/site/index.html', target: '_blank' },
      { text: 'SDKs', link: '/sdks' },
      { text: 'Operations', link: '/production-deployment' },
      { text: 'Changelog', link: '/changelog' },
    ],

    sidebar: [
      {
        text: 'Getting Started',
        items: [
          { text: 'Getting Started', link: '/getting-started' },
          { text: 'Local Development Reference', link: '/local-dev-setup' },
          { text: 'FAQ', link: '/faq' },
          { text: 'Troubleshooting', link: '/troubleshooting' },
        ],
      },
      {
        text: 'Core Concepts',
        items: [
          { text: 'Architecture', link: '/architecture' },
          { text: 'Multi-tenancy', link: '/multi-tenancy' },
          { text: 'Redis and Queues', link: '/redis' },
          { text: 'Glossary', link: '/glossary' },
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
        text: 'API Reference',
        items: [
          { text: 'OpenAPI Reference ↗', link: '/openapi/site/index.html' },
          { text: 'OpenAPI Implementation Notes', link: '/openapi/README' },
          { text: 'Message Mapping', link: '/api/message-mapping' },
          { text: 'Provider Compatibility', link: '/api/provider-compatibility' },
          { text: 'WebSocket API', link: '/websocket' },
          { text: 'Templates', link: '/templates' },
          { text: 'Export', link: '/export' },
          { text: 'API Key Rotation', link: '/api-key-rotation' },
          { text: 'Organizations and Teams', link: '/organizations-and-teams' },
          { text: 'Rate Limiting', link: '/rate-limiting' },
          { text: 'Generate Test Data', link: '/generate-test-data' },
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
          { text: 'Production Deployment', link: '/production-deployment' },
          { text: 'Kubernetes', link: '/kubernetes' },
          { text: 'Helm Chart', link: '/helm' },
          { text: 'Security', link: '/security' },
          { text: 'Observability', link: '/observability' },
          { text: 'Load Testing', link: '/load-testing' },
          { text: 'Testing', link: '/testing' },
          { text: 'Upgrading', link: '/upgrading' },
        ],
      },
      {
        text: 'Project',
        items: [
          { text: 'Changelog', link: '/changelog' },
          { text: 'Container Registry', link: '/registry' },
          { text: 'QA Pass', link: '/qa-pass' },
          { text: 'ADR: Tech Stack', link: '/adr/0001-tech-stack' },
          { text: 'Contributing ↗', link: 'https://github.com/jmrashed/SMSPit/blob/main/CONTRIBUTING.md' },
          { text: 'Docs Index', link: '/README' },
        ],
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
