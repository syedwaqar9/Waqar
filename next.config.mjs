/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // @resvg/resvg-js is a native module, keep it out of the bundle.
  serverExternalPackages: ["@resvg/resvg-js"],
};

export default nextConfig;
