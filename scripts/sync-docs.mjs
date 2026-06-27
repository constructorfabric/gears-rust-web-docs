#!/usr/bin/env node

import { readFileSync, writeFileSync, readdirSync, mkdirSync, rmSync, copyFileSync } from 'fs'
import { join, relative, dirname, extname } from 'path'
import config from './sync.config.mjs'

const sourceBase = join(config.source, config.sourceDir)
const targetBase = config.targetDir
const targetPublic = config.publicAssetsDir ?? 'public/synced'
const base = (config.base ?? '/gears-rust-web-docs').replace(/\/+$/, '')
const withBase = (p) => `${base}${p}`

const ASSET_EXT_RE = /\.(png|jpe?g|gif|svg|webp|ico|pdf|json|ya?ml|zip|tar|gz|mp4|webm|mov|mp3|ogg)$/i

function walkDir(dir) {
  const files = []
  const entries = readdirSync(dir, { withFileTypes: true })

  for (const entry of entries) {
    const fullPath = join(dir, entry.name)
    const relPath = relative(sourceBase, fullPath)

    if (entry.isDirectory()) {
      files.push(...walkDir(fullPath))
    } else if (entry.isFile()) {
      files.push(relPath)
    }
  }

  return files
}

function rewriteAssetPaths(content, fileDir) {
  // Rewrite relative references to shared asset directories so they resolve
  // under the site's base path (e.g. GitHub Pages subfolder).
  //
  // NOTE: the (../)+img/ patterns assume assets live at the ROOT of docs/web-docs
  // (e.g. docs/web-docs/img/). copyAsset() preserves the full relPath, so if an
  // image is at guides/img/hero.png the copy lands at public/synced/guides/img/hero.png
  // but these regexes would produce /synced/img/hero.png — a mismatch. Currently
  // harmless (no images in the docs), but fix both the regexes and the copy path
  // before adding images to subdirectories.
  return content
    .replace(/(!?\[[^\]]*\])\((\.\.\/)+img\/([^)]+)\)/g, (_, prefix, _dots, file) => {
      return `${prefix}(${withBase('/synced/img/' + file)})`
    })
    .replace(/(!?\[[^\]]*\])\((\.\.\/)+assets\/([^)]+)\)/g, (_, prefix, _dots, file) => {
      return `${prefix}(${withBase('/synced/assets/' + file)})`
    })
    .replace(/(!?\[[^\]]*\])\((\.\.\/)+images\/([^)]+)\)/g, (_, prefix, _dots, file) => {
      return `${prefix}(${withBase('/synced/images/' + file)})`
    })
    .replace(/(!?\[[^\]]*\])\(\.\/([^)]+)\)/g, (_, prefix, file) => {
      // Only rewrite same-directory asset links; leave page links as-is.
      if (!ASSET_EXT_RE.test(file)) return `${prefix}(./${file})`
      const dir = fileDir || ''
      return `${prefix}(${withBase('/synced/' + (dir ? dir + '/' : '') + file)})`
    })
}

function copyAsset(relPath) {
  const srcFile = join(sourceBase, relPath)
  const tgtFile = join(targetPublic, relPath)
  mkdirSync(dirname(tgtFile), { recursive: true })
  copyFileSync(srcFile, tgtFile)
  return relPath
}

function syncFile(relPath) {
  const srcFile = join(sourceBase, relPath)
  const tgtFile = join(targetBase, relPath)
  const tgtDir = dirname(tgtFile)
  const fileDir = dirname(relPath)

  // Ensure target directory exists
  mkdirSync(tgtDir, { recursive: true })

  // Copy non-markdown assets to public/ so that rewritten site-absolute URLs work.
  const ext = extname(relPath).toLowerCase()
  if (!['.md', '.mdx'].includes(ext)) {
    copyAsset(relPath)
    return relPath
  }

  // Read source file
  let content = readFileSync(srcFile, 'utf8')

  // Rewrite relative asset paths that climb out of the content tree.
  content = rewriteAssetPaths(content, fileDir)

  // Add synced comment after frontmatter if file is markdown
  if (!content.includes('synced from')) {
    const sha = process.env.GITHUB_SHA || 'local'
    // Use HTML comment for .md, MDX comment for .mdx
    const ismdx = relPath.endsWith('.mdx')
    const syncComment = ismdx ? `{/* synced from gears-rust @ ${sha} */}` : `<!-- synced from gears-rust @ ${sha} -->`

    // If file has frontmatter, insert comment after it
    if (content.startsWith('---')) {
      const closeIdx = content.indexOf('\n---\n', 3)
      if (closeIdx !== -1) {
        // Insert after the closing ---
        const insertPos = closeIdx + 5 // length of '\n---\n'
        content = content.slice(0, insertPos) + '\n' + syncComment + '\n' + content.slice(insertPos)
      } else {
        // Fallback: prepend if closing --- not found
        content = syncComment + '\n' + content
      }
    } else {
      // No frontmatter: prepend
      content = syncComment + '\n' + content
    }
  }

  // Write to target
  writeFileSync(tgtFile, content, 'utf8')
  return relPath
}

try {
  console.log(`Syncing from: ${sourceBase}`)
  console.log(`Syncing to: ${targetBase}`)
  console.log(`Public assets: ${targetPublic}`)
  console.log(`Base path: ${base}`)

  // Clear target so files deleted upstream don't linger between syncs.
  rmSync(targetBase, { recursive: true, force: true })

  // Clear synced assets so deleted upstream files don't linger.
  rmSync(targetPublic, { recursive: true, force: true })

  const files = walkDir(sourceBase)
  console.log(`Found ${files.length} files`)

  const synced = files.map(syncFile)
  console.log(`Synced ${synced.length} files`)

  // Write lock file
  const lockData = {
    sha: process.env.GITHUB_SHA || 'local',
    timestamp: new Date().toISOString(),
    files: synced.sort(),
  }
  writeFileSync('.sync-lock.json', JSON.stringify(lockData, null, 2), 'utf8')
  console.log('✓ Sync complete. Lock file written.')
} catch (err) {
  console.error('✗ Sync failed:', err.message)
  process.exit(1)
}
