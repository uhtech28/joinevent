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
            // Preview-friendly CSP that works in both dev and the Render
            // deploy (api on a different subdomain). Key points:
            //   • script-src 'unsafe-inline' 'unsafe-eval' — Next.js bootstrap
            //     scripts and the React hydration runtime need them.
            //   • connect-src * — the api host is on a different subdomain in
            //     production (joinevents-api.onrender.com), and Leaflet pulls
            //     OSM tiles + nominatim. Lock this down later with the actual
            //     production domain when we move off Render.
            //   • img-src http: https: — local-driver upload URLs are served
            //     over HTTP in dev; Render serves them over HTTPS.
            value:
              "default-src 'self'; " +
              "img-src 'self' data: blob: http: https:; " +
              "style-src 'self' 'unsafe-inline' https://unpkg.com; " +
              "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://unpkg.com; " +
              "connect-src *; " +
              "frame-ancestors 'none'; " +
              "base-uri 'self'; " +
              "form-action 'self'",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
