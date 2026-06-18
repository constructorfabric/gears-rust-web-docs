# gears.dev

The documentation portal for **Gears** — a Rust runtime for composable,
secure-by-default platform components.

Built with [Astro](https://astro.build) + [Starlight](https://starlight.astro.build),
authored in Markdown/MDX, and shipped as a static site.

> **Status:** baseline scaffold (Phase 1). The site builds and navigates, but the
> branded theme and real documentation content land in later phases. See the
> implementation plan for the full roadmap.

## Prerequisites

- **Node.js** 20 LTS or newer
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
```

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
