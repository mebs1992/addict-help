/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      // Supabase Storage public buckets (future-self / goal images)
      { protocol: 'https', hostname: '*.supabase.co' },
    ],
  },
};

export default nextConfig;
