import { type NextConfig } from 'next';

// Turbopack (Next 16's default bundler) doesn't fall back to Webpack's
// behavior of silently transpiling .ts files pulled in via node_modules
// symlinks — that includes our bun-workspace package `@1router/models`,
// which exports `./src/index.ts` directly. Without explicit opt-in, page
// data collection crashes with:
//     PageNotFoundError: Cannot find module for page: /models
// Listing the package here forces the Next compiler to transpile it.
// (Next 16 also no longer types `eslint` in NextConfig; the previous
// `ignoreDuringBuilds: true` block was removed since Next no longer auto-
// runs ESLint during `next build` either.)
const config: NextConfig = {
  transpilePackages: ['@1router/models'],
};

export default config;
