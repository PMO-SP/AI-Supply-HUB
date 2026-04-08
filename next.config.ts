import type { NextConfig } from "next";
import path from "path";
import { copyFileSync, mkdirSync } from "fs";

const nextConfig: NextConfig = {
  serverExternalPackages: ["sql.js"],
  webpack: (config, { isServer }) => {
    if (isServer) {
      // Copy WASM file to output directory during build
      config.plugins = config.plugins || [];
      config.plugins.push({
        apply: (compiler: { hooks: { beforeRun: { tap: (name: string, fn: () => void) => void } } }) => {
          compiler.hooks.beforeRun.tap("CopySqlWasm", () => {
            try {
              mkdirSync(path.join(process.cwd(), "public"), { recursive: true });
              copyFileSync(
                path.join(process.cwd(), "node_modules/sql.js/dist/sql-wasm.wasm"),
                path.join(process.cwd(), "public/sql-wasm.wasm")
              );
            } catch (e) {
              console.warn("Could not copy sql-wasm.wasm:", e);
            }
          });
        },
      });
    }
    return config;
  },
};

export default nextConfig;
