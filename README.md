# gears.dev

The documentation portal for **Gears** — a Rust runtime for composable,
secure-by-default platform components.

Built with [Astro](https://astro.build) + [Starlight](https://starlight.astro.build),
authored in Markdown/MDX, and shipped as a static site to GitHub Pages.

## How it works

**Content is ephemeral.** Documentation lives in [`gears-rust/docs/web-docs/`](https://github.com/constructorfabric/gears-rust/tree/main/docs/web-docs) (the source of truth). When you build or develop this site, a pre-step syncs the latest content:

- **Local dev**: `pnpm dev` (or `make docs-preview` from gears-rust) runs `predev` hook → syncs content from gears-rust → serves at `localhost:4321`
- **CI deploy**: `.github/workflows/deploy.yml` on merge to main (or on `docs-sync` event) → fetches gears-rust → syncs → builds → deploys to Pages

No content is committed to this repo — `src/content/docs/` is gitignored.

## Prerequisites

- **Node.js** 22.13 or newer (required by pnpm 11)
- **pnpm** 11+ — enable it with Corepack (bundled with Node):

  ```sh
  corepack enable pnpm
  ```

## Local development

### Option 1: From gears-rust (recommended)

```sh
cd gears-rust
make docs-preview
```

This clones the docs site into `.web-docs-preview/` and starts it at `localhost:4321` with your local `docs/web-docs/` content (including uncommitted edits).

### Option 2: Direct dev from this repo

With gears-rust as a sibling directory:

```sh
GEARS_RUST_PATH=../gears-rust pnpm dev
```

Or just `pnpm dev` (defaults to `../gears-rust`).

### Build and verify

```sh
pnpm install      # install dependencies
pnpm build        # build static site into ./dist
pnpm preview      # preview the production build locally
pnpm check        # type-check content and components (astro check)
pnpm lint:md      # lint Markdown content (markdownlint)
pnpm links        # check internal links in ./dist (run after build)
```

These checks also run in CI on every push (`.github/workflows/deploy.yml`).

## Project structure

```text
src/
  components/        # Astro/Starlight UI components
  content.config.ts  # content collection config
  layouts/           # page templates
astro.config.mjs     # site config, sidebar, theme
public/              # static assets (images, diagrams)
scripts/
  sync-docs.mjs      # pull docs from gears-rust
  sync.config.mjs    # sync configuration
.github/workflows/
  deploy.yml         # fetch gears-rust → sync → build → deploy
```

**Note:** `src/content/docs/` is gitignored; it's synced fresh from gears-rust.

## Content workflow

1. **Edit** documentation in [`gears-rust/docs/web-docs/`](https://github.com/constructorfabric/gears-rust)
2. **Preview** locally: `cd gears-rust && make docs-preview`
3. **Commit & push** to gears-rust main
4. **Automatic deploy**: `notify-docs.yml` (in gears-rust) dispatches a `docs-sync` event → `deploy.yml` (here) fetches, syncs, builds, and deploys to Pages

**One PR, one review, one merge → docs auto-published.**

## Translations

Translation dashboard ([Lunaria](https://lunaria.dev)) is available at `/i18n` (admin only). Content has no git history on this site (ephemeral model), so automated git-based progress tracking is not available. This is acceptable while translation volume is low; revisit if translations grow.

## License

See [LICENSE](./LICENSE).
