import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Static export → ./out, deployed as-is to Firebase Hosting. The blog pages
  // are prerendered from document-api at build (generateStaticParams); the
  // /api/subscribe proxy runs as a Firebase Function, not a Next route.
  output: "export",
  trailingSlash: false,
  images: {
    // No Next.js image optimisation server on Firebase Hosting static deploy.
    // Images are pre-optimised .webp files served via GCS.
    unoptimized: true,
    remotePatterns: [
      {
        protocol: "https",
        hostname: "storage.googleapis.com",
        pathname: "/**",
      },
    ],
  },
};

export default nextConfig;
