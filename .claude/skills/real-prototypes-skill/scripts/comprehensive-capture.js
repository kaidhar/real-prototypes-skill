#!/usr/bin/env node
/**
 * COMPREHENSIVE PLATFORM CAPTURE
 *
 * This script captures ALL states of a platform by:
 * 1. Capturing every page
 * 2. Clicking every interactive element (buttons, tabs, dropdowns)
 * 3. Capturing each state change
 * 4. Extracting design tokens from ALL captured HTML
 *
 * Output Structure:
 * references/
 * ├── screenshots/
 * │   ├── page-name.png              # Base state
 * │   ├── page-name--button-1.png    # After clicking button 1
 * │   ├── page-name--modal-open.png  # Modal state
 * │   └── ...
 * ├── html/
 * │   └── (same structure as screenshots)
 * ├── design-tokens.json             # Extracted colors, fonts, spacing
 * ├── component-styles.json          # Button, input, card styles
 * ├── interactions.json              # Map of all interactive elements
 * └── manifest.json                  # Complete capture manifest
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Configuration
const CONFIG = {
  outputDir: 'references',
  screenshotDir: 'references/screenshots',
  htmlDir: 'references/html',
  waitAfterClick: 1000,
  waitAfterLoad: 2000,
  maxInteractionsPerPage: 50,
  viewport: { width: 1920, height: 1080 }
};

// Agent-browser wrapper
function browser(cmd) {
  try {
    const result = execSync(`agent-browser ${cmd}`, {
      encoding: 'utf8',
      maxBuffer: 50 * 1024 * 1024 // 50MB buffer for large outputs
    });
    return result.trim();
  } catch (error) {
    console.error(`Browser command failed: ${cmd}`);
    console.error(error.message);
    return null;
  }
}

// Ensure directories exist
function ensureDirectories() {
  [CONFIG.outputDir, CONFIG.screenshotDir, CONFIG.htmlDir].forEach(dir => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  });
}

// Extract all interactive elements from current page
function getInteractiveElements() {
  const snapshot = browser('snapshot -i --json');
  if (!snapshot) return [];

  try {
    const data = JSON.parse(snapshot);
    const elements = [];

    // Recursively find all interactive elements
    function traverse(node, path = []) {
      if (!node) return;

      const isInteractive =
        node.role === 'button' ||
        node.role === 'link' ||
        node.role === 'tab' ||
        node.role === 'menuitem' ||
        node.role === 'checkbox' ||
        node.role === 'radio' ||
        node.role === 'combobox' ||
        node.role === 'switch' ||
        (node.tag === 'button') ||
        (node.tag === 'a' && node.attributes?.href) ||
        (node.attributes?.onclick) ||
        (node.attributes?.['data-action']);

      if (isInteractive && node.ref) {
        elements.push({
          ref: node.ref,
          role: node.role,
          name: node.name || node.text || `${node.role}-${elements.length}`,
          tag: node.tag,
          path: [...path, node.role || node.tag]
        });
      }

      // Traverse children
      if (node.children) {
        node.children.forEach((child, i) => {
          traverse(child, [...path, `${node.role || node.tag}[${i}]`]);
        });
      }
    }

    traverse(data);
    return elements;
  } catch (e) {
    console.error('Failed to parse snapshot:', e.message);
    return [];
  }
}

// Capture current state (screenshot + HTML)
function captureState(name) {
  const screenshotPath = path.join(CONFIG.screenshotDir, `${name}.png`);
  const htmlPath = path.join(CONFIG.htmlDir, `${name}.html`);

  // Capture screenshot
  browser(`screenshot --full "${screenshotPath}"`);

  // Capture HTML
  const html = browser('eval "document.documentElement.outerHTML"');
  if (html) {
    fs.writeFileSync(htmlPath, html);
  }

  console.log(`  ✓ Captured: ${name}`);

  return {
    screenshot: screenshotPath,
    html: htmlPath,
    timestamp: new Date().toISOString()
  };
}

// Extract colors from HTML content
function extractColorsFromHTML(htmlContent) {
  const colors = new Map();

  // Match hex colors
  const hexMatches = htmlContent.match(/#[0-9a-fA-F]{3,8}/g) || [];
  hexMatches.forEach(color => {
    const normalized = color.toLowerCase();
    colors.set(normalized, (colors.get(normalized) || 0) + 1);
  });

  // Match rgb/rgba colors
  const rgbMatches = htmlContent.match(/rgba?\([^)]+\)/g) || [];
  rgbMatches.forEach(color => {
    colors.set(color, (colors.get(color) || 0) + 1);
  });

  return colors;
}

// Extract font information from HTML
function extractFontsFromHTML(htmlContent) {
  const fonts = new Set();

  // Match font-family declarations
  const fontMatches = htmlContent.match(/font-family:\s*([^;}"]+)/gi) || [];
  fontMatches.forEach(match => {
    const font = match.replace(/font-family:\s*/i, '').trim();
    fonts.add(font);
  });

  return Array.from(fonts);
}

// Extract component styles
function extractComponentStyles(htmlContent) {
  const styles = {
    buttons: [],
    inputs: [],
    cards: [],
    tables: []
  };

  // This would be more sophisticated in production
  // For now, extract inline styles from specific element types

  // Button styles
  const buttonStyleMatches = htmlContent.match(/<button[^>]*style="([^"]+)"/gi) || [];
  buttonStyleMatches.forEach(match => {
    const style = match.match(/style="([^"]+)"/);
    if (style) styles.buttons.push(style[1]);
  });

  // Input styles
  const inputStyleMatches = htmlContent.match(/<input[^>]*style="([^"]+)"/gi) || [];
  inputStyleMatches.forEach(match => {
    const style = match.match(/style="([^"]+)"/);
    if (style) styles.inputs.push(style[1]);
  });

  return styles;
}

// Generate design tokens from all captured HTML
function generateDesignTokens(htmlFiles) {
  console.log('\n📊 Extracting design tokens from captured HTML...');

  const allColors = new Map();
  const allFonts = new Set();
  const allComponentStyles = {
    buttons: [],
    inputs: [],
    cards: [],
    tables: []
  };

  htmlFiles.forEach(htmlPath => {
    if (fs.existsSync(htmlPath)) {
      const content = fs.readFileSync(htmlPath, 'utf8');

      // Extract colors
      const colors = extractColorsFromHTML(content);
      colors.forEach((count, color) => {
        allColors.set(color, (allColors.get(color) || 0) + count);
      });

      // Extract fonts
      const fonts = extractFontsFromHTML(content);
      fonts.forEach(font => allFonts.add(font));

      // Extract component styles
      const compStyles = extractComponentStyles(content);
      Object.keys(compStyles).forEach(key => {
        allComponentStyles[key].push(...compStyles[key]);
      });
    }
  });

  // Sort colors by frequency
  const sortedColors = Array.from(allColors.entries())
    .sort((a, b) => b[1] - a[1]);

  // Categorize colors
  const categorizedColors = categorizeColors(sortedColors);

  const tokens = {
    extractedAt: new Date().toISOString(),
    totalColorsFound: sortedColors.length,
    colors: categorizedColors,
    fonts: {
      families: Array.from(allFonts),
      primary: Array.from(allFonts)[0] || 'Inter, system-ui'
    },
    rawColors: sortedColors.slice(0, 100) // Top 100 colors with counts
  };

  // Write design tokens
  const tokensPath = path.join(CONFIG.outputDir, 'design-tokens.json');
  fs.writeFileSync(tokensPath, JSON.stringify(tokens, null, 2));
  console.log(`  ✓ Written: ${tokensPath}`);

  // Write component styles
  const stylesPath = path.join(CONFIG.outputDir, 'component-styles.json');
  fs.writeFileSync(stylesPath, JSON.stringify(allComponentStyles, null, 2));
  console.log(`  ✓ Written: ${stylesPath}`);

  return tokens;
}

// Categorize colors by their likely usage
function categorizeColors(sortedColors) {
  const colors = {
    // Will be filled based on analysis
    primary: null,
    secondary: null,
    background: {},
    text: {},
    border: {},
    status: {},
    sidebar: {},
    all: {}
  };

  sortedColors.forEach(([color, count]) => {
    // Store all colors
    colors.all[color] = count;

    // Categorize based on color characteristics
    const hex = color.startsWith('#') ? color : null;
    if (!hex) return;

    const rgb = hexToRgb(hex);
    if (!rgb) return;

    const brightness = (rgb.r * 299 + rgb.g * 587 + rgb.b * 114) / 1000;

    // Very dark colors (likely sidebar, dark text)
    if (brightness < 50) {
      if (!colors.sidebar.dark) colors.sidebar.dark = color;
      if (!colors.text.primary && count > 100) colors.text.primary = color;
    }
    // Dark colors (likely text, headings)
    else if (brightness < 100) {
      if (!colors.text.heading) colors.text.heading = color;
    }
    // Very light colors (likely backgrounds)
    else if (brightness > 240) {
      if (!colors.background.white) colors.background.white = color;
    }
    // Light colors (likely light backgrounds, borders)
    else if (brightness > 200) {
      if (!colors.background.light) colors.background.light = color;
      if (!colors.border.light) colors.border.light = color;
    }
    // Medium colors (likely borders, muted text)
    else if (brightness > 150) {
      if (!colors.border.default) colors.border.default = color;
      if (!colors.text.muted) colors.text.muted = color;
    }

    // Check for saturated colors (likely primary/accent)
    const saturation = getColorSaturation(rgb);
    if (saturation > 50 && count > 50) {
      // Blue-ish (likely primary)
      if (rgb.b > rgb.r && rgb.b > rgb.g) {
        if (!colors.primary) colors.primary = color;
      }
      // Green-ish (likely success)
      else if (rgb.g > rgb.r && rgb.g > rgb.b) {
        if (!colors.status.success) colors.status.success = color;
      }
      // Red-ish (likely error)
      else if (rgb.r > rgb.g && rgb.r > rgb.b) {
        if (!colors.status.error) colors.status.error = color;
      }
    }
  });

  return colors;
}

// Helper: hex to RGB
function hexToRgb(hex) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : null;
}

// Helper: get color saturation
function getColorSaturation(rgb) {
  const max = Math.max(rgb.r, rgb.g, rgb.b);
  const min = Math.min(rgb.r, rgb.g, rgb.b);
  const l = (max + min) / 2;

  if (max === min) return 0;

  const d = max - min;
  return l > 0.5 ? d / (510 - max - min) * 100 : d / (max + min) * 100;
}

// Capture all states of a single page
async function capturePageStates(pageUrl, pageName) {
  console.log(`\n📸 Capturing page: ${pageName}`);

  const captures = [];
  const interactions = [];

  // Navigate to page
  browser(`open "${pageUrl}"`);
  browser(`wait ${CONFIG.waitAfterLoad}`);

  // Capture base state
  captures.push(captureState(pageName));

  // Get all interactive elements
  const elements = getInteractiveElements();
  console.log(`  Found ${elements.length} interactive elements`);

  // Track clicked elements to avoid duplicates
  const clickedElements = new Set();
  let interactionCount = 0;

  for (const element of elements) {
    if (interactionCount >= CONFIG.maxInteractionsPerPage) {
      console.log(`  ⚠ Reached max interactions limit (${CONFIG.maxInteractionsPerPage})`);
      break;
    }

    // Skip if already clicked similar element
    const elementKey = `${element.role}-${element.name}`;
    if (clickedElements.has(elementKey)) continue;
    clickedElements.add(elementKey);

    // Skip navigation links that would leave the page
    if (element.role === 'link' && element.tag === 'a') {
      continue; // Will be captured as separate pages
    }

    try {
      // Click the element
      console.log(`  → Clicking: ${element.name} (${element.ref})`);
      browser(`click ${element.ref}`);
      browser(`wait ${CONFIG.waitAfterClick}`);

      // Capture the new state
      const stateName = `${pageName}--${sanitizeFileName(element.name)}`;
      const capture = captureState(stateName);

      captures.push(capture);
      interactions.push({
        element: element,
        stateName: stateName,
        capture: capture
      });

      interactionCount++;

      // Try to close any modals/dialogs that opened
      closeAnyModals();

      // Return to base state if page changed significantly
      const currentUrl = browser('get url');
      if (currentUrl && !currentUrl.includes(pageUrl)) {
        browser(`open "${pageUrl}"`);
        browser(`wait ${CONFIG.waitAfterLoad}`);
      }

    } catch (error) {
      console.log(`  ⚠ Failed to interact with: ${element.name}`);
    }
  }

  return { captures, interactions };
}

// Try to close any open modals
function closeAnyModals() {
  // Look for common close button patterns
  const closePatterns = [
    'button[aria-label*="close"]',
    'button[aria-label*="Close"]',
    '.modal-close',
    '.dialog-close',
    '[data-dismiss="modal"]'
  ];

  // Try pressing Escape
  browser('press Escape');
  browser('wait 300');
}

// Sanitize filename
function sanitizeFileName(name) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .substring(0, 50);
}

// Main capture function
async function runCapture(config) {
  console.log('🚀 Starting Comprehensive Platform Capture\n');
  console.log('='.repeat(50));

  ensureDirectories();

  const manifest = {
    platform: {
      name: config.platformName || 'Unknown Platform',
      baseUrl: config.baseUrl,
      capturedAt: new Date().toISOString()
    },
    pages: [],
    totalScreenshots: 0,
    totalInteractions: 0
  };

  const allHtmlFiles = [];

  // Capture each page
  for (const page of config.pages) {
    const pageUrl = page.startsWith('http') ? page : `${config.baseUrl}${page}`;
    const pageName = sanitizeFileName(page.replace(config.baseUrl, '').replace(/^\//, '') || 'home');

    const { captures, interactions } = await capturePageStates(pageUrl, pageName);

    manifest.pages.push({
      name: pageName,
      url: pageUrl,
      captures: captures,
      interactions: interactions.length
    });

    manifest.totalScreenshots += captures.length;
    manifest.totalInteractions += interactions.length;

    // Collect HTML files for token extraction
    captures.forEach(c => {
      if (c.html) allHtmlFiles.push(c.html);
    });
  }

  // Generate design tokens from all captured HTML
  const tokens = generateDesignTokens(allHtmlFiles);

  // Validate tokens
  validateExtractedTokens(tokens);

  // Write manifest
  const manifestPath = path.join(CONFIG.outputDir, 'manifest.json');
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
  console.log(`\n✓ Written: ${manifestPath}`);

  // Write interactions map
  const interactionsPath = path.join(CONFIG.outputDir, 'interactions.json');
  const allInteractions = manifest.pages.flatMap(p => p.interactions || []);
  fs.writeFileSync(interactionsPath, JSON.stringify(allInteractions, null, 2));
  console.log(`✓ Written: ${interactionsPath}`);

  // Summary
  console.log('\n' + '='.repeat(50));
  console.log('📊 CAPTURE SUMMARY');
  console.log('='.repeat(50));
  console.log(`Pages captured: ${manifest.pages.length}`);
  console.log(`Total screenshots: ${manifest.totalScreenshots}`);
  console.log(`Total interactions: ${manifest.totalInteractions}`);
  console.log(`Colors extracted: ${tokens.totalColorsFound}`);
  console.log(`Font families: ${tokens.fonts.families.length}`);
  console.log('='.repeat(50));

  return manifest;
}

// Validate extracted tokens meet minimum requirements
function validateExtractedTokens(tokens) {
  const errors = [];

  if (!tokens.colors.primary) {
    errors.push('Could not identify primary color');
  }
  if (!tokens.colors.text.primary) {
    errors.push('Could not identify primary text color');
  }
  if (tokens.totalColorsFound < 10) {
    errors.push(`Only ${tokens.totalColorsFound} colors found (minimum 10 required)`);
  }
  if (tokens.fonts.families.length === 0) {
    errors.push('No font families extracted');
  }

  if (errors.length > 0) {
    console.log('\n⚠️  TOKEN EXTRACTION WARNINGS:');
    errors.forEach(e => console.log(`   - ${e}`));
  } else {
    console.log('\n✅ Token extraction passed validation');
  }

  return errors.length === 0;
}

// CLI interface
if (require.main === module) {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.log(`
Usage: node comprehensive-capture.js <base-url> [pages...]

Example:
  node comprehensive-capture.js https://app.example.com /dashboard /settings /profile

Or with config file:
  node comprehensive-capture.js --config capture-config.json
`);
    process.exit(1);
  }

  if (args[0] === '--config') {
    const config = JSON.parse(fs.readFileSync(args[1], 'utf8'));
    runCapture(config);
  } else {
    const baseUrl = args[0];
    const pages = args.slice(1).length > 0 ? args.slice(1) : ['/'];

    runCapture({
      baseUrl,
      pages,
      platformName: new URL(baseUrl).hostname
    });
  }
}

module.exports = { runCapture, generateDesignTokens, extractColorsFromHTML };
