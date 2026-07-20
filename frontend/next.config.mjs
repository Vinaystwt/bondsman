/** @type {import('next').NextConfig} */
const API_BASE = process.env.NEXT_PUBLIC_API_BASE || 'http://127.0.0.1:3001';

const nextConfig = {
  async rewrites() {
    return [
      {
        // Proxy backend read paths through Next to avoid CORS.
        source: '/api/:path*',
        destination: `${API_BASE}/api/:path*`,
      },
      {
        // Proxy the paid HTTP surface so the live quote probe can call
        // /v1/actions/quote from the browser without CORS.
        source: '/v1/:path*',
        destination: `${API_BASE}/v1/:path*`,
      },
      {
        // Well known agent card, proxied for the browser build.
        source: '/.well-known/:path*',
        destination: `${API_BASE}/.well-known/:path*`,
      },
    ];
  },
  async redirects() {
    return [
      { source: '/app/arena', destination: '/proof/27', permanent: true },
      { source: '/app/ledger', destination: '/app', permanent: true },
      { source: '/app/leaderboard', destination: '/proof', permanent: true },
      { source: '/app/agents', destination: '/app', permanent: true },
      {
        source: '/rwa',
        destination: '/app/new?template=invoice_delivery',
        permanent: true,
      },
      { source: '/assurance', destination: '/app/new', permanent: true },
      { source: '/how-it-works', destination: '/#product-loop', permanent: true },
      { source: '/roadmap', destination: '/docs#launch', permanent: true },
      { source: '/two-agents', destination: '/#developer-integration', permanent: true },
      { source: '/leaderboard', destination: '/proof', permanent: true },
      { source: '/demo', destination: '/proof/27', permanent: true },
    ];
  },
};

export default nextConfig;
