# gears-rust-web-docs

The documentation portal for **Constructor Fabric Gears** — a Rust runtime for
composable, secure-by-default platform components. Deployed as **gears.dev**.

Built with [Astro](https://astro.build) + [Starlight](https://starlight.astro.build),
authored in Markdown/MDX, and shipped as a static site.

## Prerequisites

- **Node.js** 22.13 or newer (required by pnpm 11)
- **pnpm** 11+ — enable it with Corepack (bundled with Node):

  ```sh
  corepack enable pnpm
  ```

## Local development

```sh
pnpm install      # install dependencies
pnpm dev          # start the dev server at http://localhost:4321
pnpm build        # build the static site into ./dist
pnpm preview      # preview the production build locally
pnpm check        # type-check content and components (astro check)
pnpm lint:md      # lint Markdown content (markdownlint)
pnpm links        # check internal links in ./dist (run after build)
```

These checks also run in CI on every push and pull request
(`.github/workflows/ci.yml`): install → `check` → `lint:md` → `build` → `links`.

## Project structure

```text
src/
  content/
    docs/              # all documentation pages (one folder per IA section)
      index.mdx        # homepage
      introduction/
      get-started/
      concepts/
      guides/
      architecture/
      reference/
      examples/
      contributing/
  content.config.ts    # Starlight content collection config
astro.config.mjs       # site config + sidebar
public/                # static assets (images, diagrams)
```

## Content source

The authoritative source material lives in the Gears framework repository under
`docs/`. This portal is the curated, public-facing view of that material; the
framework repo remains the source of truth.

## License

See [LICENSE](./LICENSE).
