#!/usr/bin/env node

import { readFileSync, writeFileSync, readdirSync, mkdirSync, rmSync } from 'fs'
import { join, relative, dirname } from 'path'
import config from './sync.config.mjs'

const sourceBase = join(config.source, config.sourceDir)
const targetBase = config.targetDir

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

function syncFile(relPath) {
  const srcFile = join(sourceBase, relPath)
  const tgtFile = join(targetBase, relPath)
  const tgtDir = dirname(tgtFile)

  // Ensure target directory exists
  mkdirSync(tgtDir, { recursive: true })

  // Read source file
  let content = readFileSync(srcFile, 'utf8')

  // Add synced comment after frontmatter if file is markdown
  if ((relPath.endsWith('.md') || relPath.endsWith('.mdx')) && !content.includes('synced from')) {
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

  // Clear target so files deleted upstream don't linger between syncs.
  rmSync(targetBase, { recursive: true, force: true })

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
