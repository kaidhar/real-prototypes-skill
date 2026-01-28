#!/usr/bin/env node
/**
 * PRE-GENERATION VALIDATION
 *
 * This script MUST pass before any prototype generation can begin.
 * It validates that all required reference materials exist and are complete.
 *
 * Exit codes:
 *   0 = All validations passed, safe to proceed
 *   1 = Validation failed, DO NOT proceed with generation
 */

const fs = require('fs');
const path = require('path');

const REFERENCES_DIR = 'references';

// Minimum requirements for generation
const REQUIREMENTS = {
  minColors: 10,
  minFonts: 1,
  requiredColorCategories: ['primary', 'text', 'background', 'border'],
  requiredFiles: [
    'design-tokens.json',
    'manifest.json'
  ]
};

class ValidationError extends Error {
  constructor(message, category) {
    super(message);
    this.category = category;
  }
}

function log(type, message) {
  const icons = {
    error: '❌',
    warning: '⚠️',
    success: '✅',
    info: 'ℹ️'
  };
  console.log(`${icons[type] || '•'} ${message}`);
}

function validateFileExists(filePath, description) {
  const fullPath = path.join(REFERENCES_DIR, filePath);
  if (!fs.existsSync(fullPath)) {
    throw new ValidationError(
      `Missing required file: ${filePath}\n   ${description}`,
      'file'
    );
  }
  return fullPath;
}

function validateDesignTokens() {
  log('info', 'Validating design tokens...');

  const tokensPath = validateFileExists(
    'design-tokens.json',
    'Run comprehensive-capture.js first to extract design tokens'
  );

  const tokens = JSON.parse(fs.readFileSync(tokensPath, 'utf8'));
  const errors = [];

  // Check total colors
  const totalColors = tokens.totalColorsFound || Object.keys(tokens.rawColors || {}).length;
  if (totalColors < REQUIREMENTS.minColors) {
    errors.push(`Insufficient colors: found ${totalColors}, need at least ${REQUIREMENTS.minColors}`);
  }

  // Check required color categories
  REQUIREMENTS.requiredColorCategories.forEach(category => {
    if (!tokens.colors || !tokens.colors[category]) {
      errors.push(`Missing color category: ${category}`);
    } else if (category === 'primary' && !tokens.colors.primary) {
      errors.push('Primary color not identified');
    }
  });

  // Check fonts
  if (!tokens.fonts || !tokens.fonts.families || tokens.fonts.families.length < REQUIREMENTS.minFonts) {
    errors.push('No font families extracted');
  }

  // Check for specific critical colors
  if (!tokens.colors?.primary) {
    errors.push('Primary/accent color not identified - buttons and links will use wrong color');
  }
  if (!tokens.colors?.sidebar?.dark && !tokens.colors?.sidebar?.bg) {
    // Not an error, just a warning
    log('warning', 'Sidebar color not identified - may need manual verification');
  }

  if (errors.length > 0) {
    throw new ValidationError(
      `Design tokens incomplete:\n   ${errors.join('\n   ')}`,
      'tokens'
    );
  }

  log('success', `Design tokens valid (${totalColors} colors, ${tokens.fonts.families.length} fonts)`);
  return tokens;
}

function validateManifest() {
  log('info', 'Validating capture manifest...');

  const manifestPath = validateFileExists(
    'manifest.json',
    'Run comprehensive-capture.js first to create manifest'
  );

  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  const errors = [];

  if (!manifest.platform?.baseUrl) {
    errors.push('Missing platform baseUrl in manifest');
  }

  if (!manifest.pages || manifest.pages.length === 0) {
    errors.push('No pages captured in manifest');
  }

  // Validate each page has screenshots
  manifest.pages?.forEach(page => {
    if (!page.captures || page.captures.length === 0) {
      errors.push(`Page "${page.name}" has no captures`);
    }
  });

  if (errors.length > 0) {
    throw new ValidationError(
      `Manifest incomplete:\n   ${errors.join('\n   ')}`,
      'manifest'
    );
  }

  log('success', `Manifest valid (${manifest.pages.length} pages, ${manifest.totalScreenshots || 'unknown'} screenshots)`);
  return manifest;
}

function validateScreenshots(pageName = null) {
  log('info', 'Validating screenshots...');

  const screenshotDir = path.join(REFERENCES_DIR, 'screenshots');
  if (!fs.existsSync(screenshotDir)) {
    throw new ValidationError(
      'Screenshots directory missing',
      'screenshots'
    );
  }

  const screenshots = fs.readdirSync(screenshotDir).filter(f => f.endsWith('.png'));

  if (screenshots.length === 0) {
    throw new ValidationError(
      'No screenshots found in references/screenshots/',
      'screenshots'
    );
  }

  // If specific page requested, check it exists
  if (pageName) {
    const pageScreenshot = screenshots.find(s =>
      s.startsWith(pageName) || s.includes(pageName)
    );
    if (!pageScreenshot) {
      throw new ValidationError(
        `No screenshot found for page: ${pageName}\n   Available: ${screenshots.join(', ')}`,
        'screenshots'
      );
    }
  }

  // Check screenshot file sizes (should be > 10KB for valid captures)
  const smallScreenshots = screenshots.filter(s => {
    const stats = fs.statSync(path.join(screenshotDir, s));
    return stats.size < 10000; // 10KB minimum
  });

  if (smallScreenshots.length > 0) {
    log('warning', `Small screenshots detected (may be incomplete): ${smallScreenshots.join(', ')}`);
  }

  log('success', `Screenshots valid (${screenshots.length} files)`);
  return screenshots;
}

function validateComponentStyles() {
  log('info', 'Validating component styles...');

  const stylesPath = path.join(REFERENCES_DIR, 'component-styles.json');

  if (!fs.existsSync(stylesPath)) {
    log('warning', 'component-styles.json not found - component matching may be less accurate');
    return null;
  }

  const styles = JSON.parse(fs.readFileSync(stylesPath, 'utf8'));
  log('success', 'Component styles found');
  return styles;
}

function generateValidationReport(results) {
  const report = {
    timestamp: new Date().toISOString(),
    passed: results.passed,
    errors: results.errors,
    warnings: results.warnings,
    summary: {
      totalColors: results.tokens?.totalColorsFound || 0,
      primaryColor: results.tokens?.colors?.primary || 'NOT FOUND',
      fontFamily: results.tokens?.fonts?.primary || 'NOT FOUND',
      pagesCaptures: results.manifest?.pages?.length || 0,
      totalScreenshots: results.screenshots?.length || 0
    }
  };

  const reportPath = path.join(REFERENCES_DIR, 'validation-report.json');
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

  return report;
}

async function runValidation(options = {}) {
  console.log('\n' + '='.repeat(60));
  console.log('🔍 PRE-GENERATION VALIDATION');
  console.log('='.repeat(60) + '\n');

  const results = {
    passed: true,
    errors: [],
    warnings: [],
    tokens: null,
    manifest: null,
    screenshots: null
  };

  try {
    // 1. Validate design tokens (CRITICAL)
    results.tokens = validateDesignTokens();
  } catch (error) {
    results.passed = false;
    results.errors.push(error.message);
    log('error', error.message);
  }

  try {
    // 2. Validate manifest (CRITICAL)
    results.manifest = validateManifest();
  } catch (error) {
    results.passed = false;
    results.errors.push(error.message);
    log('error', error.message);
  }

  try {
    // 3. Validate screenshots (CRITICAL)
    results.screenshots = validateScreenshots(options.pageName);
  } catch (error) {
    results.passed = false;
    results.errors.push(error.message);
    log('error', error.message);
  }

  try {
    // 4. Validate component styles (OPTIONAL but recommended)
    results.componentStyles = validateComponentStyles();
  } catch (error) {
    results.warnings.push(error.message);
    log('warning', error.message);
  }

  // Generate report
  const report = generateValidationReport(results);

  // Final summary
  console.log('\n' + '='.repeat(60));
  if (results.passed) {
    console.log('✅ VALIDATION PASSED - Safe to proceed with generation');
    console.log('='.repeat(60));
    console.log('\nKey values for generation:');
    console.log(`  Primary color: ${report.summary.primaryColor}`);
    console.log(`  Font family: ${report.summary.fontFamily}`);
    console.log(`  Screenshots: ${report.summary.totalScreenshots}`);
  } else {
    console.log('❌ VALIDATION FAILED - DO NOT proceed with generation');
    console.log('='.repeat(60));
    console.log('\nErrors that must be fixed:');
    results.errors.forEach((e, i) => console.log(`  ${i + 1}. ${e}`));
    console.log('\nRun comprehensive-capture.js to fix these issues.');
  }
  console.log('');

  return results;
}

// CLI interface
if (require.main === module) {
  const args = process.argv.slice(2);
  const options = {};

  // Parse arguments
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--page' && args[i + 1]) {
      options.pageName = args[i + 1];
      i++;
    }
  }

  runValidation(options).then(results => {
    process.exit(results.passed ? 0 : 1);
  });
}

module.exports = { runValidation };
