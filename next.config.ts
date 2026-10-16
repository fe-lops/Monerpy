import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { NextConfig } from "next";

// Versão exibida no app vem do package.json (fonte única; ver CONTRIBUTING.md → releases).
// Lido pelo caminho absoluto da pasta do projeto, para funcionar de qualquer diretório de trabalho.
const { version } = JSON.parse(readFileSync(join(__dirname, "package.json"), "utf8")) as { version: string };

const nextConfig: NextConfig = {
  env: { NEXT_PUBLIC_APP_VERSION: version },
};

export default nextConfig;
