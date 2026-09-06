/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack(config, { isServer }) {
    if (isServer)
      config.externals.push({ 'node:sqlite': 'commonjs node:sqlite' });
    return config;
  },
};
export default nextConfig;
