#!/usr/bin/env node
/**
 * ENTERPRISE PLATFORM PROTOTYPING PIPELINE
 *
 * This is the ONLY entry point for generating prototypes.
 * It enforces all validation gates and prevents bad outputs.
 *
 * Pipeline:
 * ┌─────────┐     ┌──────────────┐     ┌──────────┐     ┌──────────────┐     ┌────────┐
 * │ Capture │ ──▶ │ Validate Pre │ ──▶ │ Generate │ ──▶ │ Validate Out │ ──▶ │ Output │
 * └─────────┘     └──────────────┘     └──────────┘     └──────────────┘     └────────┘
 *      │               │                                       │
 *      │               └── BLOCKS if tokens missing            └── BLOCKS if colors wrong
 *      └── Extracts ALL colors, clicks ALL buttons
 *
 * Usage:
 *   node enterprise-pipeline.js capture --url https://app.example.com --pages /dashboard,/settings
 *   node enterprise-pipeline.js validate-pre
 *   node enterprise-pipeline.js validate-post
 *   node enterprise-pipeline.js full --url https://app.example.com
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const SCRIPTS_DIR = __dirname;
const ROOT_DIR = process.cwd();

// ANSI colors for terminal output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

function log(level, message) {
  const prefixes = {
    info: `${colors.blue}ℹ${colors.reset}`,
    success: `${colors.green}✓${colors.reset}`,
    error: `${colors.red}✗${colors.reset}`,
    warning: `${colors.yellow}⚠${colors.reset}`,
    step: `${colors.cyan}→${colors.reset}`
  };
  console.log(`${prefixes[level] || '•'} ${message}`);
}

function header(text) {
  const line = '═'.repeat(60);
  console.log(`\n${colors.bright}${line}${colors.reset}`);
  console.log(`${colors.bright}  ${text}${colors.reset}`);
  console.log(`${colors.bright}${line}${colors.reset}\n`);
}

function runScript(scriptName, args = []) {
  const scriptPath = path.join(SCRIPTS_DIR, scriptName);
  const cmd = `node "${scriptPath}" ${args.join(' ')}`;

  try {
    execSync(cmd, { stdio: 'inherit' });
    return true;
  } catch (error) {
    return false;
  }
}

// ============================================================
// CAPTURE PHASE
// ============================================================
async function runCapture(options) {
  header('PHASE 1: COMPREHENSIVE CAPTURE');

  if (!options.url) {
    log('error', 'URL is required. Use --url https://your-platform.com');
    return false;
  }

  const args = [options.url];
  if (options.pages) {
    args.push(...options.pages.split(','));
  }

  log('step', `Capturing platform: ${options.url}`);
  log('info', 'This will click all interactive elements to capture all states');

  const success = runScript('comprehensive-capture.js', args);

  if (success) {
    log('success', 'Capture completed successfully');
    return true;
  } else {
    log('error', 'Capture failed');
    return false;
  }
}

// ============================================================
// PRE-GENERATION VALIDATION
// ============================================================
async function runPreValidation(options = {}) {
  header('PHASE 2: PRE-GENERATION VALIDATION');

  log('step', 'Validating captured references...');

  const args = [];
  if (options.page) {
    args.push('--page', options.page);
  }

  const success = runScript('validate-prerequisites.js', args);

  if (success) {
    log('success', 'Pre-generation validation passed');
    return true;
  } else {
    log('error', 'Pre-generation validation FAILED');
    log('error', '>>> GENERATION BLOCKED <<<');
    log('info', 'Fix the issues above before proceeding');
    return false;
  }
}

// ============================================================
// POST-GENERATION VALIDATION
// ============================================================
async function runPostValidation(options = {}) {
  header('PHASE 4: POST-GENERATION VALIDATION');

  log('step', 'Validating generated prototype...');

  const args = [];
  if (options.prototypeDir) {
    args.push('--dir', options.prototypeDir);
  }

  const success = runScript('validate-output.js', args);

  if (success) {
    log('success', 'Post-generation validation passed');
    log('success', 'All colors match the captured design tokens');
    return true;
  } else {
    log('error', 'Post-generation validation FAILED');
    log('error', 'Generated code contains invalid colors');
    log('info', 'Fix the issues above - do NOT deliver this prototype');
    return false;
  }
}

// ============================================================
// STATUS CHECK
// ============================================================
async function runStatus() {
  header('PIPELINE STATUS CHECK');

  const checks = [
    {
      name: 'References directory',
      check: () => fs.existsSync('references'),
      fix: 'Run: node enterprise-pipeline.js capture --url <your-url>'
    },
    {
      name: 'Design tokens',
      check: () => fs.existsSync('references/design-tokens.json'),
      fix: 'Run capture phase first'
    },
    {
      name: 'Screenshots',
      check: () => {
        const dir = 'references/screenshots';
        return fs.existsSync(dir) && fs.readdirSync(dir).filter(f => f.endsWith('.png')).length > 0;
      },
      fix: 'Run capture phase first'
    },
    {
      name: 'Manifest',
      check: () => fs.existsSync('references/manifest.json'),
      fix: 'Run capture phase first'
    },
    {
      name: 'Prototype directory',
      check: () => fs.existsSync('prototype'),
      fix: 'Run: npx create-next-app@latest prototype'
    },
    {
      name: 'Prototype source',
      check: () => fs.existsSync('prototype/src'),
      fix: 'Scaffold prototype first'
    }
  ];

  let allPassed = true;
  checks.forEach(({ name, check, fix }) => {
    const passed = check();
    if (passed) {
      log('success', name);
    } else {
      log('error', `${name} - ${fix}`);
      allPassed = false;
    }
  });

  // Show design token summary if available
  if (fs.existsSync('references/design-tokens.json')) {
    console.log('\n📊 Design Token Summary:');
    const tokens = JSON.parse(fs.readFileSync('references/design-tokens.json', 'utf8'));
    console.log(`   Primary color: ${tokens.colors?.primary || 'NOT FOUND'}`);
    console.log(`   Font family: ${tokens.fonts?.primary || 'NOT FOUND'}`);
    console.log(`   Total colors: ${tokens.totalColorsFound || 'unknown'}`);
  }

  return allPassed;
}

// ============================================================
// GENERATE COLOR CONSTANTS
// ============================================================
async function generateColorConstants() {
  header('GENERATE COLOR CONSTANTS');

  if (!fs.existsSync('references/design-tokens.json')) {
    log('error', 'Design tokens not found. Run capture first.');
    return false;
  }

  const tokens = JSON.parse(fs.readFileSync('references/design-tokens.json', 'utf8'));

  // Generate TypeScript constants file
  const tsContent = `/**
 * AUTO-GENERATED DESIGN TOKENS
 * DO NOT EDIT MANUALLY
 *
 * Generated from: references/design-tokens.json
 * Generated at: ${new Date().toISOString()}
 *
 * Use these constants in your components instead of hardcoded colors.
 */

export const colors = {
  // Primary/Accent color - use for buttons, links, active states
  primary: '${tokens.colors?.primary || '#1c64f2'}',

  // Sidebar colors
  sidebar: {
    background: '${tokens.colors?.sidebar?.dark || '#0e2933'}',
    text: '${tokens.colors?.sidebar?.text || '#6e7f85'}',
  },

  // Text colors
  text: {
    primary: '${tokens.colors?.text?.primary || '#191918'}',
    secondary: '${tokens.colors?.text?.secondary || '#6b7280'}',
    muted: '${tokens.colors?.text?.muted || '#9ca3af'}',
  },

  // Background colors
  background: {
    white: '${tokens.colors?.background?.white || '#ffffff'}',
    light: '${tokens.colors?.background?.light || '#f6f6f5'}',
    gray: '${tokens.colors?.background?.gray || '#f9fafb'}',
  },

  // Border colors
  border: {
    default: '${tokens.colors?.border?.default || '#e7e7e6'}',
    light: '${tokens.colors?.border?.light || '#e5e7eb'}',
  },

  // Status colors
  status: {
    success: '${tokens.colors?.status?.success || '#00913D'}',
    error: '${tokens.colors?.status?.error || '#e02424'}',
  }
} as const;

export const fonts = {
  primary: '${tokens.fonts?.primary || 'Inter, system-ui'}',
} as const;

// Type exports for TypeScript
export type ColorKey = keyof typeof colors;
export type FontKey = keyof typeof fonts;
`;

  // Ensure prototype src directory exists
  const outputDir = 'prototype/src/styles';
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const outputPath = path.join(outputDir, 'design-tokens.ts');
  fs.writeFileSync(outputPath, tsContent);

  log('success', `Generated: ${outputPath}`);
  log('info', 'Import this file in your components:');
  console.log(`\n   import { colors, fonts } from '@/styles/design-tokens';\n`);

  return true;
}

// ============================================================
// MAIN CLI
// ============================================================
async function main() {
  const args = process.argv.slice(2);
  const command = args[0];

  // Parse options
  const options = {};
  for (let i = 1; i < args.length; i++) {
    if (args[i] === '--url' && args[i + 1]) {
      options.url = args[i + 1];
      i++;
    } else if (args[i] === '--pages' && args[i + 1]) {
      options.pages = args[i + 1];
      i++;
    } else if (args[i] === '--page' && args[i + 1]) {
      options.page = args[i + 1];
      i++;
    } else if (args[i] === '--dir' && args[i + 1]) {
      options.prototypeDir = args[i + 1];
      i++;
    }
  }

  switch (command) {
    case 'capture':
      const captureSuccess = await runCapture(options);
      process.exit(captureSuccess ? 0 : 1);
      break;

    case 'validate-pre':
    case 'validate:pre':
      const preSuccess = await runPreValidation(options);
      process.exit(preSuccess ? 0 : 1);
      break;

    case 'validate-post':
    case 'validate:post':
      const postSuccess = await runPostValidation(options);
      process.exit(postSuccess ? 0 : 1);
      break;

    case 'generate-tokens':
    case 'tokens':
      const tokensSuccess = await generateColorConstants();
      process.exit(tokensSuccess ? 0 : 1);
      break;

    case 'status':
      const statusOk = await runStatus();
      process.exit(statusOk ? 0 : 1);
      break;

    case 'full':
      // Full pipeline
      header('ENTERPRISE PROTOTYPING PIPELINE');
      console.log('Running full pipeline with validation gates...\n');

      // Step 1: Capture
      if (!await runCapture(options)) {
        log('error', 'Pipeline STOPPED at capture phase');
        process.exit(1);
      }

      // Step 2: Pre-validation (GATE)
      if (!await runPreValidation(options)) {
        log('error', 'Pipeline BLOCKED at pre-validation gate');
        process.exit(1);
      }

      // Step 3: Generate tokens
      await generateColorConstants();

      log('success', '\nPipeline ready for prototype generation');
      log('info', 'Generate your prototype, then run:');
      console.log('   node enterprise-pipeline.js validate-post\n');
      break;

    default:
      console.log(`
${colors.bright}Enterprise Platform Prototyping Pipeline${colors.reset}

Usage:
  node enterprise-pipeline.js <command> [options]

Commands:
  ${colors.cyan}capture${colors.reset}         Capture platform (screenshots, HTML, tokens)
                    --url <url>       Platform URL (required)
                    --pages <paths>   Comma-separated paths (optional)

  ${colors.cyan}validate-pre${colors.reset}    Validate before generation (GATE)
                    --page <name>     Specific page to validate

  ${colors.cyan}validate-post${colors.reset}   Validate after generation (GATE)
                    --dir <path>      Prototype directory (default: prototype)

  ${colors.cyan}tokens${colors.reset}          Generate TypeScript color constants

  ${colors.cyan}status${colors.reset}          Check pipeline status

  ${colors.cyan}full${colors.reset}            Run full capture + validation pipeline
                    --url <url>       Platform URL (required)

Examples:
  # Capture a platform
  node enterprise-pipeline.js capture --url https://app.sprouts.ai --pages /dashboard,/settings

  # Check if ready for generation
  node enterprise-pipeline.js validate-pre

  # After generating code, validate output
  node enterprise-pipeline.js validate-post

  # Full pipeline
  node enterprise-pipeline.js full --url https://app.sprouts.ai
`);
  }
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});
