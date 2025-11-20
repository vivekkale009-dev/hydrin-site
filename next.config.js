/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    unoptimized: true,   // required for static images on Vercel without next/image optimization
  },
  output: "standalone", // ensures a clean production build for Vercel
};

module.exports = nextConfig;
