import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Use standalone output only in production (Railway)
  output: process.env.NODE_ENV === "production" ? "standalone" : undefined,
  experimental: {
    serverActions: {
      bodySizeLimit: "10mb",
    },
  },
  // Optimize images in production
  images: {
    unoptimized: process.env.NODE_ENV === "development",
  },
  // Ensure proper hostname binding for Railway
  ...(process.env.PORT && {
    port: parseInt(process.env.PORT, 10),
  }),
};

export default nextConfig;
