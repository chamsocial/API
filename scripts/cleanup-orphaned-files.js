#!/usr/bin/env node

/**
 * Orphaned File Cleanup Script
 *
 * Purpose: Find and optionally delete files in the uploads directory that have no corresponding
 * database record in the media table.
 *
 * Usage:
 *   node scripts/cleanup-orphaned-files.js              # Dry run (reports only)
 *   node scripts/cleanup-orphaned-files.js --delete     # Actually delete orphaned files
 *   node scripts/cleanup-orphaned-files.js --help       # Show help
 *
 * Output:
 *   - Console output with progress and summary
 *   - Log file: cleanup-orphaned-files-YYYYMMDD-HHMMSS.log
 */

const fs = require('fs').promises
const path = require('path')
const { Media, sequelize } = require('../models')

const { UPLOADS_DIR, THUMBNAIL_DIR } = process.env

const DELETE_MODE = process.argv.includes('--delete')
const HELP_MODE = process.argv.includes('--help')

const logEntries = []
const timestamp = new Date().toISOString().replace(/[:.]/g, '-').substring(0, 19)
const logFilePath = path.join(__dirname, `cleanup-orphaned-files-${timestamp}.log`)

function log(message, level = 'INFO') {
  const entry = `[${new Date().toISOString()}] [${level}] ${message}`
  logEntries.push(entry)
  console.log(entry)
}

function formatBytes(bytes) {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${parseFloat((bytes / (k ** i)).toFixed(2))} ${sizes[i]}`
}

async function writeLogFile() {
  try {
    await fs.writeFile(logFilePath, logEntries.join('\n'), 'utf8')
    console.log(`\nLog file written to: ${logFilePath}`)
  } catch (err) {
    console.error(`Failed to write log file: ${err.message}`)
  }
}

function showHelp() {
  console.log(`
Orphaned File Cleanup Script
=============================

Purpose:
  Find and optionally delete files in the uploads directory and generated
  thumbnails that have no corresponding database record in the media table.

Usage:
  node scripts/cleanup-orphaned-files.js              # Dry run (reports only)
  node scripts/cleanup-orphaned-files.js --delete     # Actually delete orphaned files
  node scripts/cleanup-orphaned-files.js --help       # Show this help

How it works:
  1. Scans all files in ${UPLOADS_DIR}
  2. Scans all generated thumbnails in ${THUMBNAIL_DIR} (if configured)
  3. For each file, checks if a corresponding media record exists
  4. Reports orphaned files (files without database records)
  5. In --delete mode, removes orphaned files from disk
  6. Generates a summary report with disk space recovered

Output:
  - Console output with progress and summary
  - Log file: cleanup-orphaned-files-YYYYMMDD-HHMMSS.log

Examples:
  # Check for orphaned files without deleting
  node scripts/cleanup-orphaned-files.js

  # Delete orphaned files
  node scripts/cleanup-orphaned-files.js --delete
`)
}

async function scanDirectory(dirPath, relativePath = '') {
  const files = []

  try {
    const entries = await fs.readdir(dirPath, { withFileTypes: true })

    for (const entry of entries) {
      const fullPath = path.join(dirPath, entry.name)
      const relPath = path.join(relativePath, entry.name)

      if (entry.isDirectory()) {
        // Recursively scan subdirectories
        const subFiles = await scanDirectory(fullPath, relPath)
        files.push(...subFiles)
      } else if (entry.isFile()) {
        files.push({
          fullPath,
          relativePath: relPath,
          filename: entry.name,
          directory: path.basename(path.dirname(fullPath)),
        })
      }
    }
  } catch (err) {
    log(`Error reading directory ${dirPath}: ${err.message}`, 'ERROR')
  }

  return files
}

async function findOrphanedFiles() {
  log('Starting orphaned file scan...')
  log(`Uploads directory: ${UPLOADS_DIR}`)
  log(`Thumbnail directory: ${THUMBNAIL_DIR || 'Not configured'}`)
  log(`Mode: ${DELETE_MODE ? 'DELETE' : 'DRY RUN'}`)
  log('')

  // Scan all files in uploads directory
  log('Scanning files in uploads directory...')
  const uploadFiles = await scanDirectory(UPLOADS_DIR)
  log(`Found ${uploadFiles.length} files in uploads`)
  log('')

  // Scan thumbnails if THUMBNAIL_DIR is configured
  let thumbnailFiles = []
  if (THUMBNAIL_DIR) {
    log('Scanning generated thumbnails...')
    thumbnailFiles = await scanDirectory(THUMBNAIL_DIR)
    log(`Found ${thumbnailFiles.length} generated thumbnails`)
    log('')
  }

  const allFiles = [...uploadFiles, ...thumbnailFiles]
  log(`Total files: ${allFiles.length}`)
  log('')

  // Load all media records from database
  log('Loading media records from database...')
  const mediaRecords = await Media.findAll({
    attributes: ['id', 'user_id', 'filename'],
    raw: true,
  })

  // Create a Set of valid filenames for fast lookup
  const validFiles = new Set(mediaRecords.map(m => m.filename))
  log(`Found ${validFiles.size} media records in database`)
  log('')

  // Find orphaned files (both original uploads and thumbnails)
  log('Identifying orphaned files...')
  const orphanedFiles = allFiles.filter(file => !validFiles.has(file.filename))

  log(`Found ${orphanedFiles.length} orphaned files (uploads + thumbnails)`)
  log('')

  if (orphanedFiles.length === 0) {
    log('No orphaned files found. Nothing to clean up!', 'SUCCESS')
    return { orphanedFiles: [], totalSize: 0, deletedCount: 0 }
  }

  // Calculate total size
  let totalSize = 0
  const filesWithSize = []

  for (const file of orphanedFiles) {
    try {
      const stats = await fs.stat(file.fullPath)
      totalSize += stats.size
      filesWithSize.push({ ...file, size: stats.size })
    } catch (err) {
      log(`Error getting file size for ${file.relativePath}: ${err.message}`, 'WARN')
    }
  }

  log(`Total size of orphaned files: ${formatBytes(totalSize)}`)
  log('')

  // Display sample of orphaned files
  log('Sample of orphaned files (first 20):')
  filesWithSize.slice(0, 20).forEach(file => {
    log(`  - ${file.relativePath} (${formatBytes(file.size)})`)
  })

  if (filesWithSize.length > 20) {
    log(`  ... and ${filesWithSize.length - 20} more files`)
  }
  log('')

  // Delete files if in delete mode
  let deletedCount = 0
  if (DELETE_MODE) {
    log('Deleting orphaned files...')

    for (const file of filesWithSize) {
      try {
        await fs.unlink(file.fullPath)
        deletedCount++
        log(`  Deleted: ${file.relativePath}`)
      } catch (err) {
        log(`  Failed to delete ${file.relativePath}: ${err.message}`, 'ERROR')
      }
    }

    log('')
    log(`Successfully deleted ${deletedCount} of ${orphanedFiles.length} orphaned files`, 'SUCCESS')
  } else {
    log('DRY RUN MODE - No files were deleted')
    log('Run with --delete flag to actually remove these files')
  }

  // Count uploads vs thumbnails
  const orphanedUploads = filesWithSize.filter(f => f.fullPath.startsWith(UPLOADS_DIR))
  const orphanedThumbnails = filesWithSize.filter(f => THUMBNAIL_DIR && f.fullPath.startsWith(THUMBNAIL_DIR))

  return {
    orphanedFiles: filesWithSize,
    orphanedUploads,
    orphanedThumbnails,
    totalSize,
    deletedCount,
  }
}

async function main() {
  if (HELP_MODE) {
    showHelp()
    process.exit(0)
  }

  if (!UPLOADS_DIR) {
    console.error('ERROR: UPLOADS_DIR environment variable is not set')
    process.exit(1)
  }

  try {
    // Test database connection
    await sequelize.authenticate()
    log('Database connection established')
    log('')

    // Run cleanup scan
    const result = await findOrphanedFiles()

    // Summary
    log('')
    log('=== CLEANUP SUMMARY ===')
    log(`Total files scanned: (see log)`)
    log(`Orphaned uploads: ${result.orphanedUploads.length}`)
    log(`Orphaned thumbnails: ${result.orphanedThumbnails.length}`)
    log(`Total orphaned files: ${result.orphanedFiles.length}`)
    log(`Total size: ${formatBytes(result.totalSize)}`)
    if (DELETE_MODE) {
      log(`Files deleted: ${result.deletedCount}`)
      log(`Disk space recovered: ${formatBytes(result.totalSize)}`)
    } else {
      log(`Potential disk space recovery: ${formatBytes(result.totalSize)}`)
    }
    log('========================')

    // Write log file
    await writeLogFile()

    // Close database connection
    await sequelize.close()

  } catch (err) {
    log(`Fatal error: ${err.message}`, 'ERROR')
    log(err.stack, 'ERROR')
    await writeLogFile()
    process.exit(1)
  }
}

main()
