/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  trailingSlash: true,
  images: {
    unoptimized: true
  },
  env: {
    // Keep empty so the browser uses relative /api paths → hits the Next.js catch-all proxy
    // GATEWAY_URL (server-side only) is what the proxy uses to reach Railway
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || '',
  }
};

export default nextConfig;
