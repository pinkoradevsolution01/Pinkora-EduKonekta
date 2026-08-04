import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  transpilePackages: ['@pinkora/shared'],
  /**
   * Keep browser API calls same-origin. Besides avoiding a CORS preflight for
   * every JSON mutation, this lets the browser send the session cookie through
   * the web origin. Docker uses the service hostname; non-Docker development
   * falls back to localhost.
   */
  async rewrites() {
    const api = (process.env.API_INTERNAL_URL ?? 'http://localhost:4000/api/v1').replace(/\/$/, '');
    return [{ source: '/api/v1/:path*', destination: `${api}/:path*` }];
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'Content-Security-Policy',
            value:
              "default-src 'self'; base-uri 'self'; frame-ancestors 'none'; form-action 'self'; img-src 'self' data: https:; font-src 'self' data:; style-src 'self' 'unsafe-inline'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; connect-src 'self' http://localhost:4000 https:; object-src 'none'",
          },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=(), payment=()',
          },
        ],
      },
    ];
  },
};

export default nextConfig;
