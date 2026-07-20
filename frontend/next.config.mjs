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
      { source: '/app', destination: '/proof', permanent: true },
      { source: '/app/arena', destination: '/proof', permanent: true },
      { source: '/app/ledger', destination: '/proof', permanent: true },
      { source: '/app/leaderboard', destination: '/proof', permanent: true },
      { source: '/app/actions', destination: '/proof', permanent: true },
      { source: '/app/agents', destination: '/proof', permanent: true },
      { source: '/app/:path*', destination: '/proof', permanent: true },
      {
        source: '/rwa',
        destination: '/assurance?template=invoice_delivery',
        permanent: true,
      },
      { source: '/how-it-works', destination: '/#how-it-works', permanent: true },
      { source: '/roadmap', destination: '/docs#launch', permanent: true },
      { source: '/two-agents', destination: '/#how-it-works', permanent: true },
      { source: '/leaderboard', destination: '/proof', permanent: true },
      { source: '/demo', destination: '/proof', permanent: true },
    ];
  },
};

export default nextConfig;
