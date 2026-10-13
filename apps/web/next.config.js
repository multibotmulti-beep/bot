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
        source: '/bot/:path*',
        destination: `${apiHost}/bot/:path*`,
      },
      {
        source: '/capabilities/:path*',
        destination: `${apiHost}/capabilities/:path*`,
      },
      {
        source: '/logs',
        destination: `${apiHost}/logs`,
      },
    ];
  },
};

module.exports = nextConfig;
