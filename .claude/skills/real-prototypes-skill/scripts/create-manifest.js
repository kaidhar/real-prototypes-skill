#!/usr/bin/env node

/**
 * create-manifest.js
 *
 * Generates a manifest.json file for platform prototype references.
 * Scans references/screenshots and references/html directories to auto-discover files.
 *
 * Usage:
 *   node create-manifest.js <platform-name> <platform-url> [output-dir]
 *
 * Arguments:
 *   platform-name  Name of the platform (e.g., "Linear", "Notion")
 *   platform-url   Base URL of the platform (e.g., "https://linear.app")
 *   output-dir     Optional output directory (defaults to current directory)
 *
 * Example:
 *   node create-manifest.js "Linear" "https://linear.app" ./references
 */

const fs = require('fs');
const path = require('path');

// Supported file extensions
const SCREENSHOT_EXTENSIONS = ['.png', '.jpg', '.jpeg', '.webp', '.gif'];
const HTML_EXTENSIONS = ['.html', '.htm'];

/**
 * Parse command line arguments
 */
function parseArgs() {
  const args = process.argv.slice(2);

  if (args.length < 2) {
    console.error('Usage: node create-manifest.js <platform-name> <platform-url> [output-dir]');
    console.error('');
    console.error('Arguments:');
    console.error('  platform-name  Name of the platform (e.g., "Linear")');
    console.error('  platform-url   Base URL of the platform (e.g., "https://linear.app")');
    console.error('  output-dir     Optional output directory (defaults to current directory)');
    process.exit(1);
  }

  return {
    platformName: args[0],
    platformUrl: args[1],
    outputDir: args[2] || process.cwd()
  };
}

/**
 * Check if a file has a matching extension
 */
function hasExtension(filename, extensions) {
  const ext = path.extname(filename).toLowerCase();
  return extensions.includes(ext);
}

/**
 * Scan a directory for files with specific extensions
 */
function scanDirectory(dirPath, extensions) {
  const files = [];

  if (!fs.existsSync(dirPath)) {
    return files;
  }

  try {
    const entries = fs.readdirSync(dirPath, { withFileTypes: true });

    for (const entry of entries) {
      if (entry.isFile() && hasExtension(entry.name, extensions)) {
        const filePath = path.join(dirPath, entry.name);
        const stats = fs.statSync(filePath);
        files.push({
          name: entry.name,
          path: filePath,
          mtime: stats.mtime
        });
      }
    }
  } catch (err) {
    console.warn(`Warning: Could not read directory ${dirPath}: ${err.message}`);
  }

  return files.sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * Extract page ID from filename
 * Converts "my-page-name.png" to "my-page-name"
 * Handles patterns like "page-name-desktop.png" or "page-name-1.png"
 */
function extractPageId(filename) {
  // Remove extension
  let id = path.basename(filename, path.extname(filename));

  // Normalize to lowercase with hyphens
  id = id.toLowerCase().replace(/[_\s]+/g, '-');

  return id;
}

/**
 * Convert page ID to human-readable name
 * Converts "my-page-name" to "My Page Name"
 */
function pageIdToName(pageId) {
  return pageId
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/**
 * Detect viewport/variant from filename
 * Looks for patterns like "-desktop", "-mobile", "-hover", "-1920x1080"
 */
function detectScreenshotMeta(filename) {
  const basename = path.basename(filename, path.extname(filename)).toLowerCase();
  const meta = {};

  // Check for viewport indicators
  if (basename.includes('desktop') || basename.includes('-lg') || basename.includes('-large')) {
    meta.viewport = 'desktop';
  } else if (basename.includes('mobile') || basename.includes('-sm') || basename.includes('-small')) {
    meta.viewport = 'mobile';
  } else if (basename.includes('tablet') || basename.includes('-md') || basename.includes('-medium')) {
    meta.viewport = 'tablet';
  }

  // Check for resolution pattern (e.g., 1920x1080)
  const resMatch = basename.match(/(\d{3,4})x(\d{3,4})/);
  if (resMatch) {
    meta.viewport = `${resMatch[1]}x${resMatch[2]}`;
  }

  // Check for state indicators
  if (basename.includes('hover')) {
    meta.state = 'hover';
  } else if (basename.includes('active') || basename.includes('pressed')) {
    meta.state = 'active';
  } else if (basename.includes('focus')) {
    meta.state = 'focus';
  } else if (basename.includes('expanded')) {
    meta.state = 'expanded';
  } else if (basename.includes('collapsed')) {
    meta.state = 'collapsed';
  } else if (basename.includes('loading')) {
    meta.state = 'loading';
  } else if (basename.includes('empty')) {
    meta.state = 'empty';
  } else if (basename.includes('error')) {
    meta.state = 'error';
  }

  return meta;
}

/**
 * Group screenshots by base page name
 * Handles multiple screenshots per page (different viewports, states)
 */
function groupScreenshots(files) {
  const groups = new Map();

  for (const file of files) {
    const basename = path.basename(file.name, path.extname(file.name)).toLowerCase();

    // Try to extract base page name (remove viewport/state suffixes)
    let baseName = basename
      .replace(/[-_](desktop|mobile|tablet|lg|md|sm|large|medium|small)$/i, '')
      .replace(/[-_](hover|active|pressed|focus|expanded|collapsed|loading|empty|error)$/i, '')
      .replace(/[-_]\d{3,4}x\d{3,4}$/i, '')
      .replace(/[-_]\d+$/i, ''); // Remove trailing numbers

    if (!groups.has(baseName)) {
      groups.set(baseName, []);
    }
    groups.get(baseName).push(file);
  }

  return groups;
}

/**
 * Match HTML files to screenshot groups
 */
function matchHtmlFiles(htmlFiles, screenshotGroups) {
  const matches = new Map();

  for (const html of htmlFiles) {
    const basename = path.basename(html.name, path.extname(html.name)).toLowerCase();

    // Look for exact or partial match in screenshot groups
    for (const [groupName] of screenshotGroups) {
      if (basename === groupName || basename.includes(groupName) || groupName.includes(basename)) {
        matches.set(groupName, html);
        break;
      }
    }

    // If no match found, create standalone entry
    if (!matches.has(basename)) {
      matches.set(basename, html);
    }
  }

  return matches;
}

/**
 * Generate manifest from discovered files
 */
function generateManifest(platformName, platformUrl, outputDir) {
  const screenshotsDir = path.join(outputDir, 'references', 'screenshots');
  const htmlDir = path.join(outputDir, 'references', 'html');

  // Scan directories
  const screenshotFiles = scanDirectory(screenshotsDir, SCREENSHOT_EXTENSIONS);
  const htmlFiles = scanDirectory(htmlDir, HTML_EXTENSIONS);

  console.log(`Found ${screenshotFiles.length} screenshot(s) in ${screenshotsDir}`);
  console.log(`Found ${htmlFiles.length} HTML file(s) in ${htmlDir}`);

  // Group screenshots by page
  const screenshotGroups = groupScreenshots(screenshotFiles);

  // Match HTML files to groups
  const htmlMatches = matchHtmlFiles(htmlFiles, screenshotGroups);

  // Collect all unique page identifiers
  const pageIds = new Set([...screenshotGroups.keys(), ...htmlMatches.keys()]);

  // Build pages array
  const pages = [];

  for (const pageId of pageIds) {
    const page = {
      id: pageId,
      name: pageIdToName(pageId),
      path: `/${pageId}`
    };

    // Add screenshots
    const screenshots = screenshotGroups.get(pageId);
    if (screenshots && screenshots.length > 0) {
      page.screenshots = screenshots.map(file => {
        const meta = detectScreenshotMeta(file.name);
        return {
          file: file.name,
          ...meta
        };
      });
    }

    // Add HTML reference
    const html = htmlMatches.get(pageId);
    if (html) {
      page.html = {
        file: html.name,
        capturedAt: html.mtime.toISOString()
      };
    }

    pages.push(page);
  }

  // Sort pages alphabetically by ID
  pages.sort((a, b) => a.id.localeCompare(b.id));

  // Build manifest
  const manifest = {
    platform: {
      name: platformName,
      url: platformUrl,
      capturedAt: new Date().toISOString()
    },
    pages: pages,
    designTokens: {
      colors: {},
      typography: {},
      spacing: {}
    },
    metadata: {
      generatedAt: new Date().toISOString(),
      generatedBy: 'create-manifest.js'
    }
  };

  return manifest;
}

/**
 * Main execution
 */
function main() {
  const { platformName, platformUrl, outputDir } = parseArgs();

  // Resolve output directory to absolute path
  const resolvedOutputDir = path.resolve(outputDir);

  console.log(`Generating manifest for: ${platformName}`);
  console.log(`Platform URL: ${platformUrl}`);
  console.log(`Output directory: ${resolvedOutputDir}`);
  console.log('');

  // Generate manifest
  const manifest = generateManifest(platformName, platformUrl, resolvedOutputDir);

  // Write manifest file
  const manifestPath = path.join(resolvedOutputDir, 'manifest.json');

  try {
    fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), 'utf8');
    console.log('');
    console.log(`Manifest written to: ${manifestPath}`);
    console.log(`Total pages: ${manifest.pages.length}`);
  } catch (err) {
    console.error(`Error writing manifest: ${err.message}`);
    process.exit(1);
  }
}

// Run if executed directly
if (require.main === module) {
  main();
}

// Export for testing
module.exports = {
  generateManifest,
  extractPageId,
  pageIdToName,
  detectScreenshotMeta,
  groupScreenshots
};
