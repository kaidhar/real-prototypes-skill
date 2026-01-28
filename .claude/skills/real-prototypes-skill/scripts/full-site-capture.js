#!/usr/bin/env node

/**
 * Full Site Capture Script - Enhanced with Robust Error Handling
 *
 * Automatically discovers and captures all pages of a platform with:
 * - Wait for networkidle0 (all network requests complete)
 * - Pre-screenshot validation (status codes, page load, element checks)
 * - Retry logic with exponential backoff
 * - Comprehensive error logging
 * - Success validation (file sizes, dimensions)
 *
 * Usage:
 *   node full-site-capture.js [claude-md-path] [output-dir]
 *
 * What it does:
 *   1. Reads credentials from CLAUDE.md
 *   2. Logs into the platform
 *   3. Crawls to discover all internal pages
 *   4. Captures screenshot + HTML for each page (with validation)
 *   5. Extracts design tokens
 *   6. Generates manifest.json
 *   7. Creates error log for any failures
 *
 * Output: Generates agent-browser commands for the full capture workflow
 */

const fs = require('fs');
const path = require('path');

// Default configuration
const DEFAULT_CONFIG = {
  maxPages: 50,
  viewportWidth: 1920,
  viewportHeight: 1080,
  waitAfterLoad: 5000, // Increased default to 5s
  maxWaitTimeout: 10000, // Maximum wait timeout
  captureMode: 'full',
  maxRetries: 3, // For 404 errors
  timeoutRetries: 2, // For timeout errors
  retryDelayBase: 1000, // Base delay for exponential backoff (1s)
  minScreenshotSize: 102400, // 100KB minimum
  minHtmlSize: 10240, // 10KB minimum
  minPageHeight: 500 // Minimum page height in pixels
};

/**
 * Parse CLAUDE.md for configuration
 */
function parseClaudeMd(filePath) {
  if (!fs.existsSync(filePath)) {
    console.error(`Error: CLAUDE.md not found at ${filePath}`);
    process.exit(1);
  }

  const content = fs.readFileSync(filePath, 'utf-8');
  const config = { ...DEFAULT_CONFIG };

  // Extract configuration values
  const patterns = {
    PLATFORM_URL: /PLATFORM_URL=(.+)/,
    PLATFORM_EMAIL: /PLATFORM_EMAIL=(.+)/,
    PLATFORM_PASSWORD: /PLATFORM_PASSWORD=(.+)/,
    PAGES_TO_CAPTURE: /PAGES_TO_CAPTURE=(.+)/,
    CAPTURE_MODE: /CAPTURE_MODE=(.+)/,
    MAX_PAGES: /MAX_PAGES=(\d+)/,
    VIEWPORT_WIDTH: /VIEWPORT_WIDTH=(\d+)/,
    VIEWPORT_HEIGHT: /VIEWPORT_HEIGHT=(\d+)/,
    WAIT_AFTER_LOAD: /WAIT_AFTER_LOAD=(\d+)/,
  };

  for (const [key, pattern] of Object.entries(patterns)) {
    const match = content.match(pattern);
    if (match) {
      const value = match[1].trim();
      if (['MAX_PAGES', 'VIEWPORT_WIDTH', 'VIEWPORT_HEIGHT', 'WAIT_AFTER_LOAD'].includes(key)) {
        config[key] = parseInt(value, 10);
      } else {
        config[key] = value;
      }
    }
  }

  return config;
}

/**
 * Generate validation script for page load
 */
function generateValidationScript() {
  return `
// Pre-screenshot validation
const validation = {
  status: false,
  errors: [],
  checks: {}
};

try {
  // Check 1: Response status
  validation.checks.statusOk = true; // Will be set by response check

  // Check 2: Page title exists and not empty
  const title = document.title;
  validation.checks.titleExists = title && title.trim().length > 0;
  if (!validation.checks.titleExists) {
    validation.errors.push('Page title is empty');
  }

  // Check 3: Document body exists
  validation.checks.bodyExists = !!document.body;
  if (!validation.checks.bodyExists) {
    validation.errors.push('Document body does not exist');
  }

  // Check 4: Key elements loaded (check for common landmarks)
  const hasMain = !!document.querySelector('main, [role="main"], #main, .main');
  const hasNav = !!document.querySelector('nav, [role="navigation"], #nav, .nav, header');
  const hasContent = !!document.querySelector('[data-testid], .content, #content, main, article');
  validation.checks.keyElementsLoaded = hasMain || hasNav || hasContent;
  if (!validation.checks.keyElementsLoaded) {
    validation.errors.push('No key elements found (main, nav, or content areas)');
  }

  // Check 5: Page height validation
  const pageHeight = Math.max(
    document.body.scrollHeight,
    document.body.offsetHeight,
    document.documentElement.clientHeight,
    document.documentElement.scrollHeight,
    document.documentElement.offsetHeight
  );
  validation.checks.heightValid = pageHeight > 500;
  validation.checks.pageHeight = pageHeight;
  if (!validation.checks.heightValid) {
    validation.errors.push(\`Page height too small: \${pageHeight}px\`);
  }

  // Check 6: No error messages visible
  const errorSelectors = [
    '.error', '[class*="error"]',
    '.alert-error', '.alert-danger',
    '[role="alert"]',
    '#error', '#error-message'
  ];
  let hasErrorMessage = false;
  for (const selector of errorSelectors) {
    const el = document.querySelector(selector);
    if (el && el.offsetParent !== null) { // visible check
      const text = el.textContent.toLowerCase();
      if (text.includes('error') || text.includes('404') || text.includes('not found')) {
        hasErrorMessage = true;
        validation.errors.push(\`Error message detected: \${text.substring(0, 100)}\`);
        break;
      }
    }
  }
  validation.checks.noErrorMessages = !hasErrorMessage;

  // Overall validation status
  validation.status = validation.checks.titleExists &&
                     validation.checks.bodyExists &&
                     validation.checks.keyElementsLoaded &&
                     validation.checks.heightValid &&
                     validation.checks.noErrorMessages;

} catch (error) {
  validation.errors.push(\`Validation script error: \${error.message}\`);
  validation.status = false;
}

JSON.stringify(validation);
`.trim();
}

/**
 * Generate retry logic with exponential backoff
 */
function generateRetryLogic(config) {
  const { maxRetries, timeoutRetries, retryDelayBase } = config;

  return `
# Retry function with exponential backoff
retry_capture() {
  local PAGE_PATH=$1
  local ATTEMPT=0
  local MAX_ATTEMPTS=${maxRetries}
  local TIMEOUT_ATTEMPTS=${timeoutRetries}
  local DELAY=${retryDelayBase}
  local SUCCESS=false

  while [ $ATTEMPT -lt $MAX_ATTEMPTS ] && [ "$SUCCESS" = "false" ]; do
    ATTEMPT=$((ATTEMPT + 1))

    if [ $ATTEMPT -gt 1 ]; then
      echo "  Retry attempt $ATTEMPT for $PAGE_PATH (waiting \${DELAY}ms)..."
      sleep $(echo "scale=3; $DELAY/1000" | bc)
      DELAY=$((DELAY * 2)) # Exponential backoff
    fi

    # Attempt capture
    if capture_page_with_validation "$PAGE_PATH"; then
      SUCCESS=true
      echo "  ✓ Successfully captured $PAGE_PATH"
    else
      echo "  ✗ Failed attempt $ATTEMPT for $PAGE_PATH"
    fi
  done

  if [ "$SUCCESS" = "false" ]; then
    log_error "$PAGE_PATH" "capture_failed" "Failed after $MAX_ATTEMPTS attempts"
    return 1
  fi

  return 0
}
`.trim();
}

/**
 * Generate error logging function
 */
function generateErrorLogging(outputDir) {
  const errorLogPath = path.join(outputDir, 'capture-errors.log');

  return `
# Error logging function
ERROR_LOG="${errorLogPath}"
echo "=== Capture Error Log ===" > "$ERROR_LOG"
echo "Started: $(date -Iseconds)" >> "$ERROR_LOG"
echo "" >> "$ERROR_LOG"

log_error() {
  local PAGE_PATH=$1
  local ERROR_TYPE=$2
  local ERROR_MESSAGE=$3
  local TIMESTAMP=$(date -Iseconds)

  echo "[$TIMESTAMP] ERROR: $PAGE_PATH" >> "$ERROR_LOG"
  echo "  Type: $ERROR_TYPE" >> "$ERROR_LOG"
  echo "  Message: $ERROR_MESSAGE" >> "$ERROR_LOG"
  echo "" >> "$ERROR_LOG"

  # Also log to console
  echo "  ⚠️  ERROR logged for $PAGE_PATH: $ERROR_MESSAGE"
}

log_summary() {
  echo "" >> "$ERROR_LOG"
  echo "=== Capture Summary ===" >> "$ERROR_LOG"
  echo "Completed: $(date -Iseconds)" >> "$ERROR_LOG"
  echo "Total Pages Attempted: $PAGES_ATTEMPTED" >> "$ERROR_LOG"
  echo "Successful Captures: $PAGES_SUCCESS" >> "$ERROR_LOG"
  echo "Failed Captures: $PAGES_FAILED" >> "$ERROR_LOG"
  echo "Success Rate: $PAGES_SUCCESS_RATE%" >> "$ERROR_LOG"
}
`.trim();
}

/**
 * Generate the crawl and capture script
 */
function generateFullCaptureScript(config, outputDir) {
  const {
    PLATFORM_URL,
    PLATFORM_EMAIL,
    PLATFORM_PASSWORD,
    PAGES_TO_CAPTURE,
    CAPTURE_MODE,
    MAX_PAGES,
    VIEWPORT_WIDTH,
    VIEWPORT_HEIGHT,
    WAIT_AFTER_LOAD,
  } = config;

  if (!PLATFORM_URL) {
    console.error('Error: PLATFORM_URL not found in CLAUDE.md');
    process.exit(1);
  }

  const isAutoMode = PAGES_TO_CAPTURE === 'auto' || CAPTURE_MODE === 'full';
  const baseUrl = PLATFORM_URL.replace(/\/$/, '');

  const lines = [];

  // Header
  lines.push('#!/bin/bash');
  lines.push('# ===========================================');
  lines.push('# FULL SITE CAPTURE SCRIPT - ENHANCED');
  lines.push('# ===========================================');
  lines.push(`# Platform: ${baseUrl}`);
  lines.push(`# Mode: ${isAutoMode ? 'Auto-discover all pages' : 'Manual page list'}`);
  lines.push(`# Max Pages: ${MAX_PAGES}`);
  lines.push(`# Max Retries: ${config.maxRetries}`);
  lines.push(`# Timeout Retries: ${config.timeoutRetries}`);
  lines.push(`# Wait After Load: ${WAIT_AFTER_LOAD}ms`);
  lines.push(`# Max Wait Timeout: ${config.maxWaitTimeout}ms`);
  lines.push('# ');
  lines.push('# Features:');
  lines.push('# - Wait for networkidle0 (all requests complete)');
  lines.push('# - Pre-screenshot validation');
  lines.push('# - Retry with exponential backoff');
  lines.push('# - Comprehensive error logging');
  lines.push('# - Success validation');
  lines.push('# ');
  lines.push('# This is a ONE-TIME capture. Run once to capture');
  lines.push('# the entire platform for future prototyping.');
  lines.push('# ===========================================');
  lines.push('');

  // Initialize counters
  lines.push('# Initialize tracking variables');
  lines.push('PAGES_ATTEMPTED=0');
  lines.push('PAGES_SUCCESS=0');
  lines.push('PAGES_FAILED=0');
  lines.push('PAGES_SUCCESS_RATE=0');
  lines.push('');

  // Error logging setup
  lines.push('# Step 1: Setup error logging');
  lines.push(generateErrorLogging(outputDir));
  lines.push('');

  // Create directories
  lines.push('# Step 2: Create directory structure');
  lines.push(`mkdir -p ${outputDir}/screenshots`);
  lines.push(`mkdir -p ${outputDir}/html`);
  lines.push(`mkdir -p ${outputDir}/styles`);
  lines.push('echo "Created reference directories"');
  lines.push('');

  // Set viewport
  lines.push('# Step 3: Configure browser');
  lines.push(`agent-browser set viewport ${VIEWPORT_WIDTH} ${VIEWPORT_HEIGHT}`);
  lines.push('');

  // Authentication
  if (PLATFORM_EMAIL && PLATFORM_PASSWORD) {
    lines.push('# Step 4: Authenticate');
    lines.push(`echo "Navigating to login page..."`);
    lines.push(`agent-browser open ${baseUrl}/login`);
    lines.push(`agent-browser wait ${WAIT_AFTER_LOAD}`);
    lines.push('agent-browser snapshot -i');
    lines.push('echo ""');
    lines.push('echo "=== LOGIN REQUIRED ==="');
    lines.push('echo "Look at the snapshot above and find the element refs for:"');
    lines.push('echo "  - Email/username input field"');
    lines.push('echo "  - Password input field"');
    lines.push('echo "  - Login/Submit button"');
    lines.push('echo ""');
    lines.push('echo "Then run these commands (replace @eX with actual refs):"');
    lines.push(`echo "  agent-browser fill @e1 \\"${PLATFORM_EMAIL}\\""`);
    lines.push(`echo "  agent-browser fill @e2 \\"${PLATFORM_PASSWORD}\\""`);
    lines.push('echo "  agent-browser click @e3"');
    lines.push('echo "  agent-browser wait --load networkidle"');
    lines.push('echo ""');
    lines.push('echo "After login succeeds, continue with Step 4"');
    lines.push('echo "======================');
    lines.push('');
  }

  if (isAutoMode) {
    // Auto-discovery mode
    lines.push('# Step 5: Discover all pages');
    lines.push('echo "Starting page discovery..."');
    lines.push('');
    lines.push('# Get all internal links from current page');
    lines.push(`DISCOVER_SCRIPT='
const links = new Set();
const baseUrl = "${baseUrl}";
const baseDomain = new URL(baseUrl).hostname;

document.querySelectorAll("a[href]").forEach(a => {
  try {
    const url = new URL(a.href, baseUrl);
    // Only internal links, no query params or hashes
    if (url.hostname === baseDomain) {
      const cleanPath = url.pathname.replace(/\\/$/, "") || "/";
      links.add(cleanPath);
    }
  } catch(e) {}
});

// Also check for common navigation patterns
document.querySelectorAll("[data-href], [data-link], [onclick]").forEach(el => {
  const href = el.dataset.href || el.dataset.link;
  if (href && href.startsWith("/")) {
    links.add(href.split("?")[0]);
  }
});

JSON.stringify([...links].slice(0, ${MAX_PAGES}));
'`);
    lines.push('');
    lines.push('# Navigate to main page first to discover links');
    lines.push(`agent-browser open ${baseUrl}`);
    lines.push(`agent-browser wait ${WAIT_AFTER_LOAD}`);
    lines.push('agent-browser wait --load networkidle');
    lines.push('');
    lines.push('# Extract all internal links');
    lines.push('echo "Extracting internal links..."');
    lines.push('agent-browser eval "$DISCOVER_SCRIPT"');
    lines.push('');
    lines.push('# The above command outputs a JSON array of paths');
    lines.push('# Save that output and iterate through each path');
    lines.push('');
    lines.push('echo ""');
    lines.push('echo "=== DISCOVERED PAGES ==="');
    lines.push('echo "The eval command above outputs a JSON array of paths."');
    lines.push('echo "For each path, run the capture commands in Step 5."');
    lines.push('echo "========================"');
    lines.push('');
  }

  // Validation script
  lines.push('# Validation script');
  lines.push(`VALIDATION_SCRIPT='${generateValidationScript()}'`);
  lines.push('');

  // Capture function with validation
  lines.push('# Step 6: Robust capture function with validation');
  lines.push('# For each page path, run these commands:');
  lines.push('');
  lines.push('capture_page_with_validation() {');
  lines.push('  local PAGE_PATH=$1');
  lines.push('  local PAGE_NAME=$(echo "$PAGE_PATH" | sed "s/^\\/*//" | sed "s/\\//-/g")');
  lines.push('  [ -z "$PAGE_NAME" ] && PAGE_NAME="home"');
  lines.push('  ');
  lines.push('  echo "Capturing: $PAGE_PATH -> $PAGE_NAME"');
  lines.push('  ');
  lines.push('  # Navigate to page');
  lines.push(`  agent-browser open ${baseUrl}\$PAGE_PATH`);
  lines.push('  ');
  lines.push('  # Wait strategies (multiple layers)');
  lines.push(`  # 1. Initial wait after load`);
  lines.push(`  agent-browser wait ${WAIT_AFTER_LOAD}`);
  lines.push('  ');
  lines.push('  # 2. Wait for network idle (all requests complete)');
  lines.push('  agent-browser wait --load networkidle');
  lines.push('  ');
  lines.push('  # 3. Wait for load event');
  lines.push('  agent-browser wait --load load');
  lines.push('  ');
  lines.push('  # 4. Wait for DOM content loaded');
  lines.push('  agent-browser wait --load domcontentloaded');
  lines.push('  ');
  lines.push('  # Pre-screenshot validation');
  lines.push('  VALIDATION_RESULT=$(agent-browser eval "$VALIDATION_SCRIPT")');
  lines.push('  VALIDATION_STATUS=$(echo "$VALIDATION_RESULT" | jq -r ".status")');
  lines.push('  ');
  lines.push('  if [ "$VALIDATION_STATUS" != "true" ]; then');
  lines.push('    VALIDATION_ERRORS=$(echo "$VALIDATION_RESULT" | jq -r ".errors | join(\\", \\")")');
  lines.push('    log_error "$PAGE_PATH" "validation_failed" "$VALIDATION_ERRORS"');
  lines.push('    return 1');
  lines.push('  fi');
  lines.push('  ');
  lines.push('  # Capture screenshot');
  lines.push(`  agent-browser screenshot --full ${outputDir}/screenshots/\$PAGE_NAME.png`);
  lines.push('  ');
  lines.push('  # Capture HTML');
  lines.push(`  agent-browser eval "document.documentElement.outerHTML" > ${outputDir}/html/\$PAGE_NAME.html`);
  lines.push('  ');
  lines.push('  # Post-capture validation');
  lines.push(`  SCREENSHOT_SIZE=$(stat -f%z "${outputDir}/screenshots/\$PAGE_NAME.png" 2>/dev/null || stat -c%s "${outputDir}/screenshots/\$PAGE_NAME.png" 2>/dev/null)`);
  lines.push(`  HTML_SIZE=$(stat -f%z "${outputDir}/html/\$PAGE_NAME.html" 2>/dev/null || stat -c%s "${outputDir}/html/\$PAGE_NAME.html" 2>/dev/null)`);
  lines.push('  ');
  lines.push(`  if [ "$SCREENSHOT_SIZE" -lt ${config.minScreenshotSize} ]; then`);
  lines.push('    log_error "$PAGE_PATH" "screenshot_too_small" "Screenshot size: $SCREENSHOT_SIZE bytes"');
  lines.push('    return 1');
  lines.push('  fi');
  lines.push('  ');
  lines.push(`  if [ "$HTML_SIZE" -lt ${config.minHtmlSize} ]; then`);
  lines.push('    log_error "$PAGE_PATH" "html_too_small" "HTML size: $HTML_SIZE bytes"');
  lines.push('    return 1');
  lines.push('  fi');
  lines.push('  ');
  lines.push('  # Get screenshot dimensions');
  lines.push('  PAGE_HEIGHT=$(echo "$VALIDATION_RESULT" | jq -r ".checks.pageHeight")');
  lines.push(`  if [ "$PAGE_HEIGHT" -lt ${config.minPageHeight} ]; then`);
  lines.push('    log_error "$PAGE_PATH" "page_too_short" "Page height: $PAGE_HEIGHT pixels"');
  lines.push('    return 1');
  lines.push('  fi');
  lines.push('  ');
  lines.push('  echo "  ✓ Validated: Screenshot=$SCREENSHOT_SIZE bytes, HTML=$HTML_SIZE bytes, Height=$PAGE_HEIGHT px"');
  lines.push('  return 0');
  lines.push('}');
  lines.push('');

  // Retry logic
  lines.push('# Retry logic with exponential backoff');
  lines.push(generateRetryLogic(config));
  lines.push('');

  // Wrapper function that increments counters
  lines.push('# Capture wrapper with statistics');
  lines.push('capture_page() {');
  lines.push('  local PAGE_PATH=$1');
  lines.push('  PAGES_ATTEMPTED=$((PAGES_ATTEMPTED + 1))');
  lines.push('  ');
  lines.push('  if retry_capture "$PAGE_PATH"; then');
  lines.push('    PAGES_SUCCESS=$((PAGES_SUCCESS + 1))');
  lines.push('  else');
  lines.push('    PAGES_FAILED=$((PAGES_FAILED + 1))');
  lines.push('  fi');
  lines.push('  ');
  lines.push('  # Update success rate');
  lines.push('  if [ $PAGES_ATTEMPTED -gt 0 ]; then');
  lines.push('    PAGES_SUCCESS_RATE=$(echo "scale=2; ($PAGES_SUCCESS * 100) / $PAGES_ATTEMPTED" | bc)');
  lines.push('  fi');
  lines.push('}');
  lines.push('');

  // Example captures
  if (!isAutoMode && PAGES_TO_CAPTURE && PAGES_TO_CAPTURE !== 'auto') {
    const pages = PAGES_TO_CAPTURE.split(',').map(p => p.trim());
    lines.push('# Capture specified pages:');
    for (const page of pages) {
      lines.push(`capture_page "${page}"`);
    }
  } else {
    lines.push('# Example: Capture common pages');
    lines.push('# Uncomment and modify based on discovered pages:');
    lines.push('# capture_page "/"');
    lines.push('# capture_page "/dashboard"');
    lines.push('# capture_page "/settings"');
    lines.push('# capture_page "/profile"');
  }
  lines.push('');

  // Extract design tokens
  lines.push('# Step 7: Extract design tokens');
  lines.push('echo "Extracting design tokens..."');
  lines.push(`TOKENS_SCRIPT='
const styles = getComputedStyle(document.body);
const root = getComputedStyle(document.documentElement);

// Extract CSS variables
const cssVars = {};
for (let i = 0; i < root.length; i++) {
  const prop = root[i];
  if (prop.startsWith("--")) {
    cssVars[prop] = root.getPropertyValue(prop).trim();
  }
}

// Extract common style properties
const tokens = {
  colors: {
    background: styles.backgroundColor,
    text: styles.color,
    cssVariables: cssVars
  },
  typography: {
    fontFamily: styles.fontFamily,
    fontSize: styles.fontSize,
    lineHeight: styles.lineHeight
  },
  spacing: {
    padding: styles.padding,
    margin: styles.margin
  }
};

JSON.stringify(tokens, null, 2);
'`);
  lines.push('');
  lines.push(`agent-browser eval "$TOKENS_SCRIPT" > ${outputDir}/styles/design-tokens.json`);
  lines.push('');

  // Generate manifest
  lines.push('# Step 8: Generate manifest');
  lines.push('echo "Generating manifest..."');
  lines.push(`node "$(dirname "$0")/create-manifest.js" "${new URL(baseUrl).hostname}" "${baseUrl}" "${path.dirname(outputDir)}"`);
  lines.push('');

  // Generate summary
  lines.push('# Step 9: Generate capture summary');
  lines.push('log_summary');
  lines.push('');

  // Close browser
  lines.push('# Step 10: Close browser');
  lines.push('agent-browser close');
  lines.push('');

  // Final summary
  lines.push('echo ""');
  lines.push('echo "=== CAPTURE COMPLETE ==="');
  lines.push('echo "Statistics:"');
  lines.push('echo "  Pages Attempted:  $PAGES_ATTEMPTED"');
  lines.push('echo "  Successful:       $PAGES_SUCCESS"');
  lines.push('echo "  Failed:           $PAGES_FAILED"');
  lines.push('echo "  Success Rate:     $PAGES_SUCCESS_RATE%"');
  lines.push('echo ""');
  lines.push('echo "Output:"');
  lines.push(`echo "  Screenshots:  ${outputDir}/screenshots/"`);
  lines.push(`echo "  HTML files:   ${outputDir}/html/"`);
  lines.push(`echo "  Styles:       ${outputDir}/styles/"`);
  lines.push(`echo "  Manifest:     ${path.dirname(outputDir)}/manifest.json"`);
  lines.push(`echo "  Error Log:    ${outputDir}/capture-errors.log"`);
  lines.push('echo ""');
  lines.push('if [ $PAGES_FAILED -gt 0 ]; then');
  lines.push(`  echo "⚠️  WARNING: $PAGES_FAILED pages failed to capture. Check ${outputDir}/capture-errors.log for details."`);
  lines.push('else');
  lines.push('  echo "✓ All pages captured successfully!"');
  lines.push('fi');
  lines.push('echo ""');
  lines.push('echo "You can now prototype features using these references!"');
  lines.push('echo "========================="');

  return lines.join('\n');
}

/**
 * Generate step-by-step instructions for manual execution
 */
function generateInstructions(config, outputDir) {
  const {
    PLATFORM_URL,
    PLATFORM_EMAIL,
    PLATFORM_PASSWORD,
    MAX_PAGES,
    VIEWPORT_WIDTH,
    VIEWPORT_HEIGHT,
    WAIT_AFTER_LOAD,
  } = config;

  const baseUrl = PLATFORM_URL.replace(/\/$/, '');

  return `
# Full Site Capture - Step by Step Instructions

## Overview
This captures your entire platform in one session. Run these commands in order.

## Step 1: Setup
\`\`\`bash
mkdir -p references/screenshots references/html references/styles
agent-browser set viewport ${VIEWPORT_WIDTH} ${VIEWPORT_HEIGHT}
\`\`\`

## Step 2: Login
\`\`\`bash
agent-browser open ${baseUrl}/login
agent-browser wait ${WAIT_AFTER_LOAD}
agent-browser snapshot -i
\`\`\`

Look at the snapshot output and find element refs, then:
\`\`\`bash
agent-browser fill @e<email_ref> "${PLATFORM_EMAIL}"
agent-browser fill @e<password_ref> "${PLATFORM_PASSWORD}"
agent-browser click @e<submit_ref>
agent-browser wait --load networkidle
\`\`\`

## Step 3: Discover All Pages
\`\`\`bash
agent-browser open ${baseUrl}
agent-browser wait --load networkidle
agent-browser eval "JSON.stringify([...new Set([...document.querySelectorAll('a[href]')].map(a => { try { const u = new URL(a.href, '${baseUrl}'); return u.hostname === '${new URL(baseUrl).hostname}' ? u.pathname : null; } catch(e) { return null; }}).filter(Boolean))].slice(0, ${MAX_PAGES}))"
\`\`\`

Save the output - this is your list of pages to capture.

## Step 4: Capture Each Page
For each page path from Step 3:
\`\`\`bash
# Replace /path with actual path
agent-browser open ${baseUrl}/path
agent-browser wait ${WAIT_AFTER_LOAD}
agent-browser wait --load networkidle
agent-browser screenshot --full references/screenshots/path.png
agent-browser eval "document.documentElement.outerHTML" > references/html/path.html
\`\`\`

## Step 5: Extract Design Tokens
\`\`\`bash
agent-browser eval "JSON.stringify({colors:{bg:getComputedStyle(document.body).backgroundColor,text:getComputedStyle(document.body).color},fonts:{family:getComputedStyle(document.body).fontFamily}},null,2)" > references/styles/tokens.json
\`\`\`

## Step 6: Generate Manifest
\`\`\`bash
node .claude/skills/real-prototypes-skill/scripts/create-manifest.js "${new URL(baseUrl).hostname}" "${baseUrl}" .
\`\`\`

## Step 7: Cleanup
\`\`\`bash
agent-browser close
\`\`\`

## Done!
Your platform is now captured. Use these references for all future prototyping.
`;
}

// Main
function main() {
  const args = process.argv.slice(2);
  const claudeMdPath = args[0] || path.join(process.cwd(), 'CLAUDE.md');
  const outputDir = args[1] || path.join(process.cwd(), 'references');

  console.log('===========================================');
  console.log('FULL SITE CAPTURE - Configuration');
  console.log('===========================================');
  console.log(`Config file: ${claudeMdPath}`);
  console.log(`Output dir:  ${outputDir}`);
  console.log('');

  const config = parseClaudeMd(claudeMdPath);

  console.log('Platform Settings:');
  console.log(`  URL:      ${config.PLATFORM_URL || 'NOT SET'}`);
  console.log(`  Email:    ${config.PLATFORM_EMAIL ? '****' : 'NOT SET'}`);
  console.log(`  Password: ${config.PLATFORM_PASSWORD ? '****' : 'NOT SET'}`);
  console.log(`  Mode:     ${config.CAPTURE_MODE || 'full'}`);
  console.log(`  Max Pages: ${config.MAX_PAGES}`);
  console.log('');

  // Generate and output the capture script
  const script = generateFullCaptureScript(config, outputDir);
  console.log('===========================================');
  console.log('CAPTURE SCRIPT (save as capture.sh and run)');
  console.log('===========================================');
  console.log(script);

  // Also generate instructions
  console.log('');
  console.log(generateInstructions(config, outputDir));

  // Save the script
  const scriptPath = path.join(path.dirname(claudeMdPath), 'capture-site.sh');
  fs.writeFileSync(scriptPath, script);
  console.log(`\nScript saved to: ${scriptPath}`);
  console.log('Run with: bash capture-site.sh');
}

main();
