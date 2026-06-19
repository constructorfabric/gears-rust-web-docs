# Contributing to the Gears docs

Thanks for contributing! This is the [Gears](https://gears.dev) documentation site,
built with Astro + Starlight.

The full guides live on the site:

- **[Contributor guide](https://gears.dev/contributing/contributor-guide/)** — ways
  to contribute, git workflow, and writing style.
- **[Translation guide](https://gears.dev/contributing/translation-guide/)** — how
  localization works.
- **[Translation status](https://gears.dev/i18n/)** — per-language progress.

## Quick start

```bash
pnpm install
pnpm dev        # http://localhost:4321
```

Three ways to contribute:

1. **Edit on GitHub** — use the **Edit page** link at the bottom of any page.
2. **Codespaces** — open the repo in a Codespace; the [dev container](.devcontainer/)
   is preconfigured.
3. **Local** — fork, clone, branch off `main`, and open a pull request.

Before pushing, run the same checks CI does:

```bash
pnpm check     # Astro type & content validation
pnpm lint:md   # markdownlint
pnpm build     # production build (also emits the /i18n dashboard)
pnpm links     # dead-link check
```
