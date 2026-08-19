import { defineConfig } from 'tsdown'

export default defineConfig({
  entry: { index: 'src/index.ts' },
  format: ['esm'],
  platform: 'node',
  target: 'node22',
  dts: false,
  clean: true,
  outDir: 'lib',
  outExtensions: () => ({ js: '.js' }),
  // Everything under @deepseek-ai/* is provided by the host at runtime; the
  // runtime dependency stays external and resolves from the profile's
  // node_modules.
  deps: { neverBundle: [/^@deepseek-ai\//] },
})
