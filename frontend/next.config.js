/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Pass public env vars at build time (server-side vars like GATEWAY_URL are automatic)
  env: {
    NEXT_PUBLIC_WS_SERVER:    process.env.NEXT_PUBLIC_WS_SERVER    || 'http://localhost:8090',
    NEXT_PUBLIC_LIVEKIT_URL:  process.env.NEXT_PUBLIC_LIVEKIT_URL  || '',
    NEXT_PUBLIC_API_BASE:     process.env.NEXT_PUBLIC_API_BASE      || '',
  },
};

module.exports = nextConfig;
