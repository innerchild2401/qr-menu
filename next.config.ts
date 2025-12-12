import type { NextConfig } from "next";

// Extract Supabase domain from URL if available
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseDomain = supabaseUrl ? new URL(supabaseUrl).hostname : undefined;

const nextConfig: NextConfig = {
  // Ensure proper image optimization
  images: {
    ...(supabaseDomain && { domains: [supabaseDomain] }),
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.supabase.co',
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
