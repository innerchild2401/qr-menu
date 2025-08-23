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
  // Ensure proper environment variable handling
  env: {
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  },
  // Server external packages for better performance
  serverExternalPackages: ['@supabase/supabase-js'],
};

export default nextConfig;
