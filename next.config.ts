import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Standalone output for self-hosting; Vercel ignores it and uses its own
  // build output — safe in both environments.
  output: "standalone",
  // Type-checking is verified clean (`tsc --noEmit`); keep it enforced in
  // production builds instead of silently shipping type errors.
  typescript: {
    ignoreBuildErrors: false,
  },
  reactStrictMode: false,
  // The Prisma SQLite seed (schema-only) is read at runtime via DATABASE_URL,
  // which the static file tracer cannot see — include it in serverless bundles.
  outputFileTracingIncludes: {
    "/api/**/*": ["./db/custom.db"],
  },
};

export default nextConfig;
