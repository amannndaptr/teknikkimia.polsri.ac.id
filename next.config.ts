import type { NextConfig } from "next";

const nextConfig: NextConfig = {
   images: {
    domains: ['psnwscikbfrralawhvol.supabase.co'],
  },
  experimental: {
    serverActions: {
      bodySizeLimit: '3mb',
    }
  },
};

export default nextConfig;
