#!/usr/bin/env node
/**
 * POST-GENERATION VALIDATION
 *
 * This script validates that the generated prototype:
 * 1. Uses ONLY colors from the extracted design tokens
 * 2. Uses the correct font families
 * 3. Doesn't contain any "made up" colors
 *
 * Exit codes:
 *   0 = All validations passed
 *   1 = Validation failed - colors don't match
 */

const fs = require('fs');
const path = require('path');

const REFERENCES_DIR = 'references';
const PROTOTYPE_DIR = 'prototype';

// Colors that are always allowed (CSS basics)
const ALLOWED_BASE_COLORS = [
  '#fff', '#ffffff', '#000', '#000000',
  'transparent', 'inherit', 'currentColor'
];

// Tailwind color classes that might sneak through
const FORBIDDEN_TAILWIND_PATTERNS = [
  /\b(teal|cyan|emerald|violet|purple|pink|rose|fuchsia|indigo)-\d{2,3}\b/,
  /\bbg-(teal|cyan|emerald|violet|purple|pink|rose|fuchsia|indigo)/,
  /\btext-(teal|cyan|emerald|violet|purple|pink|rose|fuchsia|indigo)/,
  /\bborder-(teal|cyan|emerald|violet|purple|pink|rose|fuchsia|indigo)/
];

function log(type, message) {
  const icons = {
    error: '❌',
    warning: '⚠️',
    success: '✅',
    info: 'ℹ️'
  };
  console.log(`${icons[type] || '•'} ${message}`);
}

function loadDesignTokens() {
  const tokensPath = path.join(REFERENCES_DIR, 'design-tokens.json');
  if (!fs.existsSync(tokensPath)) {
    throw new Error('design-tokens.json not found. Run validation-prerequisites.js first.');
  }
  return JSON.parse(fs.readFileSync(tokensPath, 'utf8'));
}

function getAllowedColors(tokens) {
  const allowed = new Set(ALLOWED_BASE_COLORS);

  // Add all colors from rawColors
  if (tokens.rawColors) {
    tokens.rawColors.forEach(([color]) => {
      allowed.add(color.toLowerCase());
    });
  }

  // Add all categorized colors
  function extractColors(obj) {
    if (!obj) return;
    if (typeof obj === 'string' && obj.startsWith('#')) {
      allowed.add(obj.toLowerCase());
    } else if (typeof obj === 'object') {
      Object.values(obj).forEach(extractColors);
    }
  }

  extractColors(tokens.colors);

  return allowed;
}

function extractColorsFromCode(code) {
  const colors = new Set();

  // Extract hex colors
  const hexMatches = code.match(/#[0-9a-fA-F]{3,8}/g) || [];
  hexMatches.forEach(color => colors.add(color.toLowerCase()));

  // Extract rgb/rgba colors
  const rgbMatches = code.match(/rgba?\([^)]+\)/g) || [];
  rgbMatches.forEach(color => colors.add(color.toLowerCase()));

  return colors;
}

function findForbiddenTailwindClasses(code) {
  const forbidden = [];

  FORBIDDEN_TAILWIND_PATTERNS.forEach(pattern => {
    const matches = code.match(pattern);
    if (matches) {
      forbidden.push(...matches);
    }
  });

  return [...new Set(forbidden)];
}

function validateGeneratedFile(filePath, allowedColors, tokens) {
  const code = fs.readFileSync(filePath, 'utf8');
  const result = {
    file: filePath,
    passed: true,
    invalidColors: [],
    forbiddenClasses: [],
    warnings: []
  };

  // Check for colors not in design tokens
  const usedColors = extractColorsFromCode(code);
  usedColors.forEach(color => {
    // Normalize 3-digit hex to 6-digit
    let normalizedColor = color;
    if (/^#[0-9a-f]{3}$/i.test(color)) {
      normalizedColor = `#${color[1]}${color[1]}${color[2]}${color[2]}${color[3]}${color[3]}`;
    }

    if (!allowedColors.has(normalizedColor) && !allowedColors.has(color)) {
      result.invalidColors.push(color);
      result.passed = false;
    }
  });

  // Check for forbidden Tailwind classes
  const forbiddenClasses = findForbiddenTailwindClasses(code);
  if (forbiddenClasses.length > 0) {
    result.forbiddenClasses = forbiddenClasses;
    result.passed = false;
  }

  // Check if primary color is being used
  const primaryColor = tokens.colors?.primary;
  if (primaryColor && !code.includes(primaryColor)) {
    result.warnings.push(`Primary color ${primaryColor} not found in file - buttons/links may have wrong color`);
  }

  // Check for font family usage
  const fontFamily = tokens.fonts?.primary;
  if (fontFamily && !code.toLowerCase().includes(fontFamily.toLowerCase().split(',')[0])) {
    result.warnings.push(`Primary font "${fontFamily}" not found in file`);
  }

  return result;
}

function findPrototypeFiles(dir, files = []) {
  const items = fs.readdirSync(dir);

  items.forEach(item => {
    const fullPath = path.join(dir, item);
    const stat = fs.statSync(fullPath);

    if (stat.isDirectory()) {
      // Skip node_modules and .next
      if (item !== 'node_modules' && item !== '.next') {
        findPrototypeFiles(fullPath, files);
      }
    } else if (
      item.endsWith('.tsx') ||
      item.endsWith('.jsx') ||
      item.endsWith('.ts') ||
      item.endsWith('.css')
    ) {
      files.push(fullPath);
    }
  });

  return files;
}

function generateReport(results, tokens) {
  const report = {
    timestamp: new Date().toISOString(),
    passed: results.every(r => r.passed),
    summary: {
      filesChecked: results.length,
      filesPassed: results.filter(r => r.passed).length,
      filesFailed: results.filter(r => !r.passed).length,
      totalInvalidColors: results.reduce((sum, r) => sum + r.invalidColors.length, 0),
      totalForbiddenClasses: results.reduce((sum, r) => sum + r.forbiddenClasses.length, 0)
    },
    allowedPrimaryColor: tokens.colors?.primary,
    allowedFontFamily: tokens.fonts?.primary,
    results: results
  };

  const reportPath = path.join(REFERENCES_DIR, 'output-validation-report.json');
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

  return report;
}

function suggestFixes(results, tokens) {
  const allInvalidColors = [...new Set(results.flatMap(r => r.invalidColors))];
  const allForbiddenClasses = [...new Set(results.flatMap(r => r.forbiddenClasses))];

  if (allInvalidColors.length === 0 && allForbiddenClasses.length === 0) {
    return null;
  }

  console.log('\n📝 SUGGESTED FIXES:\n');

  if (allInvalidColors.length > 0) {
    console.log('Invalid colors found - replace with these design token colors:');
    console.log('');

    allInvalidColors.forEach(invalidColor => {
      const suggestion = findClosestColor(invalidColor, tokens);
      console.log(`  ${invalidColor} → ${suggestion.color} (${suggestion.category})`);
    });
  }

  if (allForbiddenClasses.length > 0) {
    console.log('\nForbidden Tailwind classes - use inline styles with hex values:');
    console.log('');

    allForbiddenClasses.forEach(cls => {
      console.log(`  "${cls}" → style={{ color: "${tokens.colors?.primary || '#1c64f2'}" }}`);
    });
  }

  return { invalidColors: allInvalidColors, forbiddenClasses: allForbiddenClasses };
}

function findClosestColor(targetColor, tokens) {
  // Simple suggestion based on color characteristics
  const hex = targetColor.startsWith('#') ? targetColor : null;
  if (!hex) return { color: tokens.colors?.primary || '#1c64f2', category: 'primary' };

  const rgb = hexToRgb(hex);
  if (!rgb) return { color: tokens.colors?.primary || '#1c64f2', category: 'primary' };

  const brightness = (rgb.r * 299 + rgb.g * 587 + rgb.b * 114) / 1000;

  // Suggest based on brightness
  if (brightness > 240) {
    return { color: tokens.colors?.background?.white || '#ffffff', category: 'background.white' };
  } else if (brightness > 200) {
    return { color: tokens.colors?.background?.light || '#f6f6f5', category: 'background.light' };
  } else if (brightness > 150) {
    return { color: tokens.colors?.border?.default || '#e7e7e6', category: 'border' };
  } else if (brightness > 100) {
    return { color: tokens.colors?.text?.secondary || '#6b7280', category: 'text.secondary' };
  } else if (brightness > 50) {
    return { color: tokens.colors?.text?.primary || '#191918', category: 'text.primary' };
  } else {
    return { color: tokens.colors?.sidebar?.dark || '#0e2933', category: 'sidebar' };
  }
}

function hexToRgb(hex) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : null;
}

async function runValidation(options = {}) {
  console.log('\n' + '='.repeat(60));
  console.log('🔍 POST-GENERATION VALIDATION');
  console.log('='.repeat(60) + '\n');

  // Load design tokens
  let tokens;
  try {
    tokens = loadDesignTokens();
    log('success', `Loaded design tokens (${tokens.totalColorsFound || 'unknown'} colors)`);
  } catch (error) {
    log('error', error.message);
    return { passed: false, errors: [error.message] };
  }

  // Get allowed colors
  const allowedColors = getAllowedColors(tokens);
  log('info', `${allowedColors.size} colors in allowed palette`);

  // Find all prototype files
  const prototypeDir = options.prototypeDir || PROTOTYPE_DIR;
  if (!fs.existsSync(prototypeDir)) {
    log('error', `Prototype directory not found: ${prototypeDir}`);
    return { passed: false, errors: ['Prototype directory not found'] };
  }

  const files = findPrototypeFiles(path.join(prototypeDir, 'src'));
  log('info', `Found ${files.length} source files to validate`);

  // Validate each file
  const results = [];
  files.forEach(file => {
    const result = validateGeneratedFile(file, allowedColors, tokens);
    results.push(result);

    if (!result.passed) {
      log('error', `${path.relative(prototypeDir, file)}`);
      if (result.invalidColors.length > 0) {
        console.log(`     Invalid colors: ${result.invalidColors.join(', ')}`);
      }
      if (result.forbiddenClasses.length > 0) {
        console.log(`     Forbidden classes: ${result.forbiddenClasses.join(', ')}`);
      }
    } else if (result.warnings.length > 0) {
      log('warning', `${path.relative(prototypeDir, file)}`);
      result.warnings.forEach(w => console.log(`     ${w}`));
    } else {
      log('success', `${path.relative(prototypeDir, file)}`);
    }
  });

  // Generate report
  const report = generateReport(results, tokens);

  // Show fixes if needed
  if (!report.passed) {
    suggestFixes(results, tokens);
  }

  // Final summary
  console.log('\n' + '='.repeat(60));
  if (report.passed) {
    console.log('✅ OUTPUT VALIDATION PASSED');
    console.log('   All colors match the captured design tokens');
  } else {
    console.log('❌ OUTPUT VALIDATION FAILED');
    console.log(`   ${report.summary.totalInvalidColors} invalid colors found`);
    console.log(`   ${report.summary.totalForbiddenClasses} forbidden Tailwind classes found`);
    console.log('\n   Fix the issues above and run validation again.');
  }
  console.log('='.repeat(60) + '\n');

  return {
    passed: report.passed,
    report: report
  };
}

// CLI interface
if (require.main === module) {
  const args = process.argv.slice(2);
  const options = {};

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--dir' && args[i + 1]) {
      options.prototypeDir = args[i + 1];
      i++;
    }
  }

  runValidation(options).then(result => {
    process.exit(result.passed ? 0 : 1);
  });
}

module.exports = { runValidation };
