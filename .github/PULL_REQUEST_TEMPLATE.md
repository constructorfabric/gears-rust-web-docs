<!--
Thanks for contributing to the Gears docs! Fill in the sections below.
See the Contributor guide: https://gears.dev/contributing/contributor-guide/
-->

## What does this change?

<!-- A short description of the change and why. Link any related issue. -->

Closes #

## Type of change

- [ ] Content fix (typo, clarification, broken link)
- [ ] New / expanded documentation
- [ ] Translation (see the [Translation guide](https://gears.dev/contributing/translation-guide/))
- [ ] Site / tooling / CI

## Checklist

- [ ] I ran the local checks and they pass:
  - [ ] `pnpm check`
  - [ ] `pnpm lint:md`
  - [ ] `pnpm build`
  - [ ] `pnpm links`
- [ ] Internal links are root-relative (e.g. `/concepts/runtime-and-lifecycle/`)
- [ ] For translations: the file mirrors the English source path under `src/content/docs/<lang>/`, and frontmatter keys / code blocks / link targets are unchanged
