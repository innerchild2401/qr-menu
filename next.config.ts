import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Ensure proper image optimization
  images: {
    domains: ['nnhyuqhypzytnkkdifuk.supabase.co'],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'nnhyuqhypzytnkkdifuk.supabase.co',
        port: '',
        pathname: '/storage/v1/object/public/**',
      },
    ],
  },
  // Environment variables are automatically available to client-side code
  // No need to explicitly set them here
  // Server external packages for better performance
  serverExternalPackages: ['@supabase/supabase-js'],
};

export default nextConfig;
