/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  experimental: {
    serverActions: {
      allowedOrigins: ["*"],
    },
  },
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: 'https://bekal-bangsa-al8lc.ondigitalocean.app/api/:path*',
      },
    ]
  },
}

export default nextConfig
