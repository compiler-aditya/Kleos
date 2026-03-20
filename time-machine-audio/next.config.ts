import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: [
    '@ffmpeg-installer/ffmpeg',
    'fluent-ffmpeg',
  ],
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
