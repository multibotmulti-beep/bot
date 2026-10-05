/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    const apiHost = process.env.INTERNAL_API_URL || 'http://127.0.0.1:4000';
    return [
      {
        source: '/api/:path*',
        destination: `${apiHost}/api/:path*`,
      },
      {
        source: '/webhooks/:path*',
        destination: `${apiHost}/webhooks/:path*`,
      },
      {
        source: '/docs/:path*',
        destination: `${apiHost}/docs/:path*`,
      },
      {
        source: '/docs',
        destination: `${apiHost}/docs`,
      },
      {
        source: '/health',
        destination: `${apiHost}/health`,
      },
      {
        source: '/logs',
        destination: `${apiHost}/logs`,
      },
      {
        source: '/users/:path*',
        destination: `${apiHost}/users/:path*`,
      },
      {
        source: '/users',
        destination: `${apiHost}/users`,
      },
      {
        source: '/credentials/:path*',
        destination: `${apiHost}/credentials/:path*`,
      },
      {
        source: '/credentials',
        destination: `${apiHost}/credentials`,
      },
      {
        source: '/bot/:path*',
        destination: `${apiHost}/bot/:path*`,
      },
    ];
  },
};

module.exports = nextConfig;
