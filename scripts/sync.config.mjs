export default {
  sources: [
    {
      repo: 'gears-rust',
      path: process.env.GEARS_RUST_PATH ?? '../gears-rust',
      sourceDir: 'docs/web-docs',
      editUrlBase: 'https://github.com/constructorfabric/gears-rust/edit/main/docs/web-docs/',
    },
    {
      repo: 'cargo-gears',
      path: process.env.CARGO_GEARS_PATH ?? '../cargo-gears',
      sourceDir: 'docs/web-docs',
      editUrlBase: 'https://github.com/constructorfabric/cargo-gears/edit/main/docs/web-docs/',
    },
  ],
  targetDir: 'src/content/docs',
  publicAssetsDir: 'public/synced',
  base: (process.env.BASE ?? '/gears-rust-web-docs').replace(/\/+$/, ''),
}
