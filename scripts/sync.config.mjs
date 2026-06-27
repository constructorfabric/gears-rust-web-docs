export default {
  source: process.env.GEARS_RUST_PATH ?? '../gears-rust',
  sourceDir: 'docs/web-docs',
  targetDir: 'src/content/docs',
  publicAssetsDir: 'public/synced',
  base: (process.env.BASE ?? '/gears-rust-web-docs').replace(/\/+$/, ''),
}
