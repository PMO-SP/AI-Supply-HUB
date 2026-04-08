 import type { NextConfig } from "next";
  import path from "path";

  const nextConfig: NextConfig = {
    serverExternalPackages: ["sql.js"],
    outputFileTracingIncludes: {
      "/api/**/*": ["./node_modules/sql.js/dist/sql-wasm.wasm"],
    },
  };

  export default nextConfig;
