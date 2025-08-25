import type { NextConfig } from "next";
const nextConfig: NextConfig = {
  eslint: { ignoreDuringBuilds: false }, // déjalo en true solo si lo necesitas
};
export default nextConfig;
