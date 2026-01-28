#!/usr/bin/env node

/**
 * Platform Capture Orchestrator
 *
 * This script generates agent-browser commands for capturing a platform.
 * It reads configuration from CLAUDE.md and outputs a capture script.
 *
 * Usage: node capture-platform.js [claude-md-path] [output-dir]
 */

const fs = require('fs');
const path = require('path');

// Parse CLAUDE.md for platform configuration
function parseClaudeMd(filePath) {
  if (!fs.existsSync(filePath)) {
    console.error(`Error: CLAUDE.md not found at ${filePath}`);
    process.exit(1);
  }

  const content = fs.readFileSync(filePath, 'utf-8');
  const config = {};

  // Extract key=value pairs
  const patterns = {
    PLATFORM_URL: /PLATFORM_URL=(.+)/,
    PLATFORM_EMAIL: /PLATFORM_EMAIL=(.+)/,
    PLATFORM_PASSWORD: /PLATFORM_PASSWORD=(.+)/,
    PAGES_TO_CAPTURE: /PAGES_TO_CAPTURE=(.+)/,
    VIEWPORT_WIDTH: /VIEWPORT_WIDTH=(\d+)/,
    VIEWPORT_HEIGHT: /VIEWPORT_HEIGHT=(\d+)/,
    PAGE_LOAD_WAIT: /PAGE_LOAD_WAIT=(\d+)/,
  };

  for (const [key, pattern] of Object.entries(patterns)) {
    const match = content.match(pattern);
    if (match) {
      config[key] = match[1].trim();
    }
  }

  return config;
}

// Generate capture commands
function generateCaptureScript(config, outputDir) {
  const {
    PLATFORM_URL,
    PLATFORM_EMAIL,
    PLATFORM_PASSWORD,
    PAGES_TO_CAPTURE = '/dashboard',
    VIEWPORT_WIDTH = '1920',
    VIEWPORT_HEIGHT = '1080',
    PAGE_LOAD_WAIT = '2000',
  } = config;

  if (!PLATFORM_URL) {
    console.error('Error: PLATFORM_URL not found in CLAUDE.md');
    process.exit(1);
  }

  const pages = PAGES_TO_CAPTURE.split(',').map(p => p.trim());
  const commands = [];

  // Setup directories
  commands.push(`# Platform Capture Script`);
  commands.push(`# Generated for: ${PLATFORM_URL}`);
  commands.push(`# Pages: ${pages.join(', ')}`);
  commands.push('');
  commands.push('# Create directories');
  commands.push(`mkdir -p ${outputDir}/screenshots ${outputDir}/html ${outputDir}/styles`);
  commands.push('');

  // Set viewport
  commands.push('# Set viewport');
  commands.push(`agent-browser set viewport ${VIEWPORT_WIDTH} ${VIEWPORT_HEIGHT}`);
  commands.push('');

  // Authentication (if credentials provided)
  if (PLATFORM_EMAIL && PLATFORM_PASSWORD) {
    commands.push('# Authenticate');
    commands.push(`agent-browser open ${PLATFORM_URL}/login`);
    commands.push(`agent-browser wait ${PAGE_LOAD_WAIT}`);
    commands.push('agent-browser snapshot -i');
    commands.push('# Find email/password fields from snapshot and fill them:');
    commands.push(`# agent-browser fill @e<email_ref> "${PLATFORM_EMAIL}"`);
    commands.push(`# agent-browser fill @e<password_ref> "${PLATFORM_PASSWORD}"`);
    commands.push('# agent-browser click @e<submit_ref>');
    commands.push('agent-browser wait --load networkidle');
    commands.push('');
  }

  // Capture each page
  commands.push('# Capture pages');
  for (const page of pages) {
    const pageName = page.replace(/\//g, '-').replace(/^-/, '') || 'home';
    commands.push('');
    commands.push(`# Capture: ${page}`);
    commands.push(`agent-browser open ${PLATFORM_URL}${page}`);
    commands.push(`agent-browser wait ${PAGE_LOAD_WAIT}`);
    commands.push('agent-browser wait --load networkidle');
    commands.push(`agent-browser screenshot --full ${outputDir}/screenshots/${pageName}.png`);
    commands.push(`agent-browser eval "document.documentElement.outerHTML" > ${outputDir}/html/${pageName}.html`);
  }

  // Extract styles
  commands.push('');
  commands.push('# Extract computed styles');
  commands.push(`agent-browser eval "JSON.stringify(Object.fromEntries(Array.from(getComputedStyle(document.body)).map(k => [k, getComputedStyle(document.body).getPropertyValue(k)])))" > ${outputDir}/styles/body-computed.json`);

  // Close browser
  commands.push('');
  commands.push('# Close browser');
  commands.push('agent-browser close');

  return commands.join('\n');
}

// Generate manifest template
function generateManifestTemplate(config, outputDir) {
  const { PLATFORM_URL, PAGES_TO_CAPTURE = '/dashboard' } = config;
  const pages = PAGES_TO_CAPTURE.split(',').map(p => p.trim());

  const manifest = {
    platform: {
      name: new URL(PLATFORM_URL).hostname,
      baseUrl: PLATFORM_URL,
      capturedAt: new Date().toISOString(),
    },
    pages: pages.map(page => {
      const pageName = page.replace(/\//g, '-').replace(/^-/, '') || 'home';
      return {
        name: pageName,
        path: page,
        screenshot: `screenshots/${pageName}.png`,
        html: `html/${pageName}.html`,
      };
    }),
    designTokens: {
      colors: {
        primary: '#3B82F6',
        secondary: '#10B981',
        background: '#FFFFFF',
        foreground: '#1F2937',
        muted: '#F3F4F6',
        border: '#E5E7EB',
      },
      fonts: {
        heading: 'Inter',
        body: 'Inter',
      },
      spacing: {
        xs: '0.25rem',
        sm: '0.5rem',
        md: '1rem',
        lg: '1.5rem',
        xl: '2rem',
      },
      borderRadius: {
        sm: '0.25rem',
        md: '0.375rem',
        lg: '0.5rem',
      },
    },
  };

  return JSON.stringify(manifest, null, 2);
}

// Main
function main() {
  const args = process.argv.slice(2);
  const claudeMdPath = args[0] || path.join(process.cwd(), 'CLAUDE.md');
  const outputDir = args[1] || path.join(process.cwd(), 'references');

  console.log(`Reading configuration from: ${claudeMdPath}`);
  console.log(`Output directory: ${outputDir}`);
  console.log('');

  const config = parseClaudeMd(claudeMdPath);

  // Generate and output capture script
  const captureScript = generateCaptureScript(config, outputDir);
  console.log('=== CAPTURE COMMANDS ===');
  console.log(captureScript);
  console.log('');

  // Generate manifest template
  const manifest = generateManifestTemplate(config, outputDir);
  console.log('=== MANIFEST TEMPLATE ===');
  console.log(`Save to: ${outputDir}/manifest.json`);
  console.log(manifest);

  // Save manifest template
  const manifestPath = path.join(outputDir, 'manifest.template.json');
  fs.mkdirSync(outputDir, { recursive: true });
  fs.writeFileSync(manifestPath, manifest);
  console.log('');
  console.log(`Manifest template saved to: ${manifestPath}`);
}

main();
