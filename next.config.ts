import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  // evita warning "turbopack filesystem tracing" em ambiente de produção
  // quando o db-sqlite.ts roda fs.existsSync no cold start.
  // Em prod (DATABASE_URL setada) o dispatcher nem entra em db-sqlite.ts.
  experimental: {
    // mantém defaults; sem useExperimentalReactCompiler para não inflar o bundle
  },
};

export default nextConfig;