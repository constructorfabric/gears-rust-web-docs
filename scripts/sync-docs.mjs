#!/usr/bin/env node

import { readFileSync, writeFileSync, readdirSync, mkdirSync, rmSync, copyFileSync, existsSync } from 'fs'
import { join, relative, dirname, extname } from 'path'
import config from './sync.config.mjs'

const targetBase = config.targetDir
const targetPublic = config.publicAssetsDir ?? 'public/synced'
const base = (config.base ?? '/gears-rust-web-docs').replace(/\/+$/, '')
const withBase = (p) => `${base}${p}`

const ASSET_EXT_RE = /\.(png|jpe?g|gif|svg|webp|ico|pdf|json|ya?ml|zip|tar|gz|mp4|webm|mov|mp3|ogg)$/i

function getFrontmatterBounds(content) {
  if (!content.startsWith('---')) return null
  const match = content.match(/^---(\r?\n)([\s\S]*?)\r?\n---(\r?\n?)/)
  if (!match) return null
  const eol = match[1]
  const fullMatch = match[0]
  const end = fullMatch.length
  const closeStart = fullMatch.lastIndexOf('---')
  const bodyStart = '---'.length + eol.length
  const bodyEnd = closeStart - eol.length
  return { start: 0, end, bodyStart, bodyEnd, body: match[2], eol }
}

function walkDir(dir, baseDir = dir) {
  const files = []
  const entries = readdirSync(dir, { withFileTypes: true })

  for (const entry of entries) {
    const fullPath = join(dir, entry.name)
    const relPath = relative(baseDir, fullPath)

    if (entry.isDirectory()) {
      files.push(...walkDir(fullPath, baseDir))
    } else if (entry.isFile()) {
      files.push(relPath)
    }
  }

  return files
}

function rewriteAssetPaths(content) {
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
      if (!ASSET_EXT_RE.test(file)) return `${prefix}(./${file})`
      return `${prefix}(${withBase('/synced/' + file)})`
    })
}

function copyAsset(relPath, sourceBase) {
  const srcFile = join(sourceBase, relPath)
  const tgtFile = join(targetPublic, relPath)
  mkdirSync(dirname(tgtFile), { recursive: true })
  copyFileSync(srcFile, tgtFile)
  return relPath
}

function syncFile(relPath, sourceBase, editUrlBase, repoLabel) {
  const srcFile = join(sourceBase, relPath)
  const tgtFile = join(targetBase, relPath)
  const tgtDir = dirname(tgtFile)

  // Ensure target directory exists
  mkdirSync(tgtDir, { recursive: true })

  // Copy non-markdown assets to public/ so that rewritten site-absolute URLs work.
  const ext = extname(relPath).toLowerCase()
  if (!['.md', '.mdx'].includes(ext)) {
    copyAsset(relPath, sourceBase)
    return relPath
  }

  // Read source file
  let content = readFileSync(srcFile, 'utf8')

  // Rewrite relative asset paths that climb out of the content tree.
  content = rewriteAssetPaths(content)

  const fm = getFrontmatterBounds(content)

  // Add synced comment after frontmatter if file is markdown
  if (!content.includes('synced from')) {
    const sha = process.env.GITHUB_SHA || 'local'
    // Use HTML comment for .md, MDX comment for .mdx
    const ismdx = relPath.endsWith('.mdx')
    const syncComment = ismdx ? `{/* synced from ${repoLabel} @ ${sha} */}` : `<!-- synced from ${repoLabel} @ ${sha} -->`

    // If file has frontmatter, insert comment after it
    if (fm) {
      content = content.slice(0, fm.end) + fm.eol + syncComment + fm.eol + content.slice(fm.end)
    } else {
      // No frontmatter: prepend
      content = syncComment + '\n' + content
    }
  }

  // Override Starlight's edit link so it points at the source file in the correct repo
  const editUrl = new URL(relPath, editUrlBase).href
  if (fm) {
    const editUrlPattern = /^editUrl:.*$/m
    if (editUrlPattern.test(fm.body)) {
      const newBody = content.slice(fm.bodyStart, fm.bodyEnd).replace(editUrlPattern, `editUrl: ${editUrl}`)
      content = content.slice(0, fm.bodyStart) + newBody + content.slice(fm.bodyEnd)
    } else {
      content = content.slice(0, fm.bodyEnd) + fm.eol + `editUrl: ${editUrl}` + content.slice(fm.bodyEnd)
    }
  } else {
    content = `---\neditUrl: ${editUrl}\n---\n\n${content}`
  }

  // Write to target
  writeFileSync(tgtFile, content, 'utf8')
  return relPath
}

function syncSource(source) {
  const sourceBase = join(source.path, source.sourceDir)
  console.log(`Syncing from: ${sourceBase} (${source.repo})`)

  const files = walkDir(sourceBase)
  console.log(`Found ${files.length} files in ${source.repo}`)

  const synced = files.map(relPath =>
    syncFile(relPath, sourceBase, source.editUrlBase, source.repo)
  )
  console.log(`Synced ${synced.length} files from ${source.repo}`)

  return synced
}

try {
  console.log(`Syncing to: ${targetBase}`)
  console.log(`Public assets: ${targetPublic}`)
  console.log(`Base path: ${base}`)

  // Clear target once before syncing all sources
  rmSync(targetBase, { recursive: true, force: true })
  rmSync(targetPublic, { recursive: true, force: true })

  // Sync all sources and collect file list
  const allSynced = []
  const sourcesList = []
  for (const source of config.sources) {
    const sourceBase = join(source.path, source.sourceDir)
    if (!existsSync(sourceBase)) {
      console.warn(`⚠ Skipping ${source.repo}: ${sourceBase} not found`)
      continue
    }
    const synced = syncSource(source)
    allSynced.push(...synced)
    sourcesList.push(source.repo)
  }

  console.log(`Total synced ${allSynced.length} files`)

  // Write lock file with all synced files and source list
  const lockData = {
    sha: process.env.GITHUB_SHA || 'local',
    timestamp: new Date().toISOString(),
    sources: sourcesList,
    files: allSynced.sort(),
  }
  writeFileSync('.sync-lock.json', JSON.stringify(lockData, null, 2), 'utf8')
  console.log('✓ Sync complete. Lock file written.')
} catch (err) {
  console.error('✗ Sync failed:', err.message)
  process.exit(1)
}
