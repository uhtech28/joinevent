import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Standalone output → tiny Docker image (only the bits we need).
  output: 'standalone',
  // Silence the "multiple lockfiles" warning by pinning the workspace root.
  outputFileTracingRoot: path.join(__dirname, '../../'),
  poweredByHeader: false,
  productionBrowserSourceMaps: false,

  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'images.unsplash.com' },
      { protocol: 'https', hostname: 'cdn.joinevents.in' },
    ],
    formats: ['image/avif', 'image/webp'],
    minimumCacheTTL: 60,
  },

  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(self)' },
          {
            key: 'Content-Security-Policy',
            value:
              process.env.NODE_ENV === 'production'
                ? "default-src 'self'; img-src 'self' data: blob: https: https://*.tile.openstreetmap.org; style-src 'self' 'unsafe-inline' https://unpkg.com; script-src 'self' https://unpkg.com; connect-src 'self' https://*.joinevents.in https://api.joinevents.in; frame-ancestors 'none'; base-uri 'self'; form-action 'self'"
                // Dev: allow images and connections from the local API on a
                // different port (http://localhost:4000) so uploaded media
                // and XHR calls aren't blocked by CSP. Also allow Leaflet
                // assets from unpkg + OSM tile servers.
                : "default-src 'self'; img-src 'self' data: blob: http: https:; style-src 'self' 'unsafe-inline' https://unpkg.com; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://unpkg.com; connect-src *; frame-ancestors 'none'",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
