/** @type {import('next').NextConfig} */
const API_BASE = process.env.NEXT_PUBLIC_API_BASE || 'http://127.0.0.1:3001';

const nextConfig = {
  async rewrites() {
    return {
      // `fallback` is checked after both static and dynamic filesystem
      // routes, so an explicit route (e.g. app/api/jobs/[id]/route.ts,
      // which attaches the operator bearer token) always wins over this
      // catch-all. A plain array here is treated as `afterFiles`, which
      // is checked *before* dynamic routes and would silently steal
      // requests from any dynamic API route added later.
      fallback: [
        {
          // Proxy all other API reads through Next to avoid CORS.
          source: '/api/:path*',
          destination: `${API_BASE}/api/:path*`,
        },
      ],
    };
  },
};

export default nextConfig;
