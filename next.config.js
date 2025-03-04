/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    domains: ['ipfs.io']
  }
}

module.exports = {
  typescript: {
    ignoreBuildErrors: true,
  },
};

module.exports = nextConfig 