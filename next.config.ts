import type { NextConfig } from "next";
import pkg from "./package.json";

const nextConfig: NextConfig = {
  // Versão exibida no app vem do package.json (fonte única; ver CONTRIBUTING.md → releases).
  env: { NEXT_PUBLIC_APP_VERSION: pkg.version },
};

export default nextConfig;
