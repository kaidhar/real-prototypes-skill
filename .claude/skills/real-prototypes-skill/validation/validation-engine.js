#!/usr/bin/env node

/**
 * Validation Engine
 *
 * Enterprise-grade validation for platform capture and prototype generation.
 * Runs as gates before and after key operations.
 */

const fs = require('fs');
const path = require('path');

class ValidationEngine {
  constructor(options = {}) {
    this.referenceDir = options.referenceDir || './references';
    this.prototypeDir = options.prototypeDir || './prototype';
    this.errors = [];
    this.warnings = [];
  }

  log(message, type = 'info') {
    const colors = {
      info: '\x1b[36m',
      success: '\x1b[32m',
      warning: '\x1b[33m',
      error: '\x1b[31m',
      reset: '\x1b[0m'
    };
    const prefix = { info: 'ℹ', success: '✓', warning: '⚠', error: '✗' }[type] || '→';
    console.log(`${colors[type] || ''}${prefix} ${message}${colors.reset}`);
  }

  /**
   * Pre-Capture Validation
   * Validates configuration before starting capture
   */
  validatePreCapture(config) {
    this.log('Running pre-capture validation...', 'info');
    const checks = [];

    // Check platform URL
    checks.push({
      name: 'Platform URL valid',
      passed: this.isValidUrl(config.platform?.baseUrl),
      message: config.platform?.baseUrl ? `URL: ${config.platform.baseUrl}` : 'Missing platform.baseUrl'
    });

    // Check credentials available
    if (config.auth?.type === 'form') {
      const hasEmail = process.env.PLATFORM_EMAIL || config.auth?.credentials?.email;
      const hasPassword = process.env.PLATFORM_PASSWORD || config.auth?.credentials?.password;
      checks.push({
        name: 'Credentials available',
        passed: !!(hasEmail && hasPassword),
        message: hasEmail && hasPassword ? 'Credentials found' : 'Missing PLATFORM_EMAIL or PLATFORM_PASSWORD'
      });
    }

    // Check output directory writable
    const outputDir = config.output?.directory || './references';
    checks.push({
      name: 'Output directory accessible',
      passed: this.isDirectoryWritable(outputDir),
      message: `Directory: ${outputDir}`
    });

    return this.summarizeChecks('Pre-Capture', checks);
  }

  /**
   * Post-Capture Validation
   * Validates capture completeness
   */
  validatePostCapture(config = {}) {
    this.log('Running post-capture validation...', 'info');
    const checks = [];

    // Check manifest exists
    const manifestPath = path.join(this.referenceDir, 'manifest.json');
    const manifestExists = fs.existsSync(manifestPath);
    checks.push({
      name: 'Manifest exists',
      passed: manifestExists,
      message: manifestExists ? manifestPath : 'manifest.json not found'
    });

    if (!manifestExists) {
      return this.summarizeChecks('Post-Capture', checks);
    }

    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));

    // Check minimum pages
    const minPages = config.validation?.minPages || 5;
    checks.push({
      name: 'Minimum pages captured',
      passed: manifest.pages?.length >= minPages,
      message: `${manifest.pages?.length || 0} pages (minimum: ${minPages})`
    });

    // Check screenshots exist
    const missingScreenshots = [];
    manifest.pages?.forEach(page => {
      if (page.screenshot) {
        const screenshotPath = path.join(this.referenceDir, page.screenshot);
        if (!fs.existsSync(screenshotPath)) {
          missingScreenshots.push(page.screenshot);
        }
      }
    });
    checks.push({
      name: 'All screenshots exist',
      passed: missingScreenshots.length === 0,
      message: missingScreenshots.length === 0
        ? `${manifest.pages?.length || 0} screenshots verified`
        : `Missing: ${missingScreenshots.slice(0, 3).join(', ')}${missingScreenshots.length > 3 ? '...' : ''}`
    });

    // Check design tokens
    const tokensPath = path.join(this.referenceDir, 'design-tokens.json');
    const tokensExist = fs.existsSync(tokensPath);
    checks.push({
      name: 'Design tokens extracted',
      passed: tokensExist,
      message: tokensExist ? 'design-tokens.json found' : 'design-tokens.json missing'
    });

    if (tokensExist) {
      const tokens = JSON.parse(fs.readFileSync(tokensPath, 'utf-8'));
      const minColors = config.validation?.minColors || 10;
      checks.push({
        name: 'Sufficient colors extracted',
        passed: tokens.totalColorsFound >= minColors,
        message: `${tokens.totalColorsFound} colors (minimum: ${minColors})`
      });

      // Check primary color exists
      checks.push({
        name: 'Primary color identified',
        passed: !!tokens.colors?.primary,
        message: tokens.colors?.primary || 'Primary color not identified'
      });
    }

    // Validate page entries have required fields
    const pagesWithMissingNames = (manifest.pages || []).filter(p => !p.name);
    if (pagesWithMissingNames.length > 0) {
      checks.push({
        name: 'Page entries have names',
        passed: false,
        message: `${pagesWithMissingNames.length} pages missing 'name' field. Check manifest.json structure.`
      });
      this.warnings.push(
        'Pages missing name field - manifest.json may be malformed. ' +
        'Each page entry requires: { name: "page-name", url: "/path", screenshot: "screenshots/file.png" }'
      );
    }

    // Check for common page patterns (safely handle missing names)
    const pageNames = (manifest.pages || [])
      .filter(p => p && p.name)
      .map(p => p.name.toLowerCase());

    // List pages should have detail pages
    const listPages = pageNames.filter(n => n.includes('list') || n.includes('accounts') || n.includes('contacts'));
    const detailPages = pageNames.filter(n => n.includes('detail'));

    if (listPages.length > 0) {
      checks.push({
        name: 'List-Detail pattern complete',
        passed: detailPages.length > 0,
        message: detailPages.length > 0
          ? `${listPages.length} list pages, ${detailPages.length} detail pages`
          : `${listPages.length} list pages found but no detail pages captured`
      });
    }

    // Check for common pages
    const commonPages = ['settings', 'search'];
    commonPages.forEach(pageName => {
      const found = pageNames.some(n => n.includes(pageName));
      if (!found) {
        this.warnings.push(`Common page '${pageName}' not found - may be missing`);
      }
    });

    // Check HTML files if configured
    if (config.output?.html !== false) {
      const htmlDir = path.join(this.referenceDir, 'html');
      const htmlCount = fs.existsSync(htmlDir)
        ? fs.readdirSync(htmlDir).filter(f => f.endsWith('.html')).length
        : 0;
      checks.push({
        name: 'HTML files captured',
        passed: htmlCount > 0,
        message: `${htmlCount} HTML files`
      });
    }

    return this.summarizeChecks('Post-Capture', checks);
  }

  /**
   * Pre-Generation Validation
   * Validates prerequisites before prototype generation
   */
  validatePreGeneration() {
    this.log('Running pre-generation validation...', 'info');
    const checks = [];

    // Check manifest
    const manifestPath = path.join(this.referenceDir, 'manifest.json');
    checks.push({
      name: 'Manifest exists',
      passed: fs.existsSync(manifestPath),
      message: fs.existsSync(manifestPath) ? 'Found' : 'Missing - run capture first'
    });

    // Check design tokens
    const tokensPath = path.join(this.referenceDir, 'design-tokens.json');
    const tokensExist = fs.existsSync(tokensPath);
    checks.push({
      name: 'Design tokens exist',
      passed: tokensExist,
      message: tokensExist ? 'Found' : 'Missing - colors will be incorrect'
    });

    if (tokensExist) {
      const tokens = JSON.parse(fs.readFileSync(tokensPath, 'utf-8'));

      // Validate required color categories
      const requiredColors = ['primary', 'text', 'background', 'border'];
      const missingColors = requiredColors.filter(c => !tokens.colors?.[c]);

      checks.push({
        name: 'Required color categories',
        passed: missingColors.length === 0,
        message: missingColors.length === 0
          ? 'All required colors present'
          : `Missing: ${missingColors.join(', ')}`
      });
    }

    // Check screenshots directory
    const screenshotsDir = path.join(this.referenceDir, 'screenshots');
    const screenshotCount = fs.existsSync(screenshotsDir)
      ? fs.readdirSync(screenshotsDir).filter(f => f.endsWith('.png')).length
      : 0;

    checks.push({
      name: 'Screenshots available',
      passed: screenshotCount > 0,
      message: `${screenshotCount} screenshots found`
    });

    return this.summarizeChecks('Pre-Generation', checks);
  }

  /**
   * Post-Generation Validation
   * Validates generated prototype for accuracy
   */
  validatePostGeneration() {
    this.log('Running post-generation validation...', 'info');
    const checks = [];

    // Check prototype directory exists
    checks.push({
      name: 'Prototype directory exists',
      passed: fs.existsSync(this.prototypeDir),
      message: this.prototypeDir
    });

    if (!fs.existsSync(this.prototypeDir)) {
      return this.summarizeChecks('Post-Generation', checks);
    }

    // Check package.json
    const packagePath = path.join(this.prototypeDir, 'package.json');
    checks.push({
      name: 'package.json exists',
      passed: fs.existsSync(packagePath),
      message: fs.existsSync(packagePath) ? 'Found' : 'Missing'
    });

    // Check Tailwind config
    const tailwindPath = path.join(this.prototypeDir, 'tailwind.config.js');
    const tailwindTsPath = path.join(this.prototypeDir, 'tailwind.config.ts');
    checks.push({
      name: 'Tailwind config exists',
      passed: fs.existsSync(tailwindPath) || fs.existsSync(tailwindTsPath),
      message: fs.existsSync(tailwindPath) || fs.existsSync(tailwindTsPath) ? 'Found' : 'Missing'
    });

    // Validate colors in generated code
    const colorValidation = this.validateGeneratedColors();
    checks.push({
      name: 'Colors match design tokens',
      passed: colorValidation.passed,
      message: colorValidation.message
    });

    // Check for Tailwind default colors (should not be used)
    const defaultColorCheck = this.checkForDefaultColors();
    checks.push({
      name: 'No Tailwind default colors',
      passed: defaultColorCheck.passed,
      message: defaultColorCheck.message
    });

    // Check component files exist
    const componentsDir = path.join(this.prototypeDir, 'src', 'components');
    const componentCount = fs.existsSync(componentsDir)
      ? fs.readdirSync(componentsDir).filter(f => f.endsWith('.tsx')).length
      : 0;

    checks.push({
      name: 'Components generated',
      passed: componentCount > 0,
      message: `${componentCount} components`
    });

    return this.summarizeChecks('Post-Generation', checks);
  }

  /**
   * Validate that generated colors match design tokens
   */
  validateGeneratedColors() {
    const tokensPath = path.join(this.referenceDir, 'design-tokens.json');
    if (!fs.existsSync(tokensPath)) {
      return { passed: false, message: 'Design tokens not found' };
    }

    const tokens = JSON.parse(fs.readFileSync(tokensPath, 'utf-8'));
    const allowedColors = new Set();

    // Add all colors from tokens
    const addColors = (obj) => {
      Object.values(obj).forEach(value => {
        if (typeof value === 'string' && value.startsWith('#')) {
          allowedColors.add(value.toLowerCase());
        } else if (typeof value === 'object') {
          addColors(value);
        }
      });
    };
    addColors(tokens.colors || {});
    tokens.rawColors?.forEach(([color]) => allowedColors.add(color.toLowerCase()));

    // Add common acceptable colors
    ['#fff', '#ffffff', '#000', '#000000', 'transparent', 'inherit', 'currentColor'].forEach(c =>
      allowedColors.add(c.toLowerCase())
    );

    // Scan generated files for colors
    const srcDir = path.join(this.prototypeDir, 'src');
    if (!fs.existsSync(srcDir)) {
      return { passed: false, message: 'Source directory not found' };
    }

    const invalidColors = new Set();
    this.scanFilesForColors(srcDir, allowedColors, invalidColors);

    if (invalidColors.size === 0) {
      return { passed: true, message: 'All colors from design tokens' };
    } else {
      return {
        passed: false,
        message: `Invalid colors found: ${[...invalidColors].slice(0, 5).join(', ')}${invalidColors.size > 5 ? '...' : ''}`
      };
    }
  }

  scanFilesForColors(dir, allowedColors, invalidColors) {
    const files = fs.readdirSync(dir);

    for (const file of files) {
      const filePath = path.join(dir, file);
      const stat = fs.statSync(filePath);

      if (stat.isDirectory()) {
        this.scanFilesForColors(filePath, allowedColors, invalidColors);
      } else if (file.endsWith('.tsx') || file.endsWith('.ts') || file.endsWith('.css')) {
        const content = fs.readFileSync(filePath, 'utf-8');

        // Find hex colors
        const hexColors = content.match(/#[0-9a-fA-F]{3,8}\b/g) || [];
        hexColors.forEach(color => {
          const normalized = color.toLowerCase();
          if (!allowedColors.has(normalized)) {
            invalidColors.add(normalized);
          }
        });
      }
    }
  }

  /**
   * Check for Tailwind default color classes
   */
  checkForDefaultColors() {
    const srcDir = path.join(this.prototypeDir, 'src');
    if (!fs.existsSync(srcDir)) {
      return { passed: true, message: 'Source directory not found' };
    }

    // Tailwind default color patterns that shouldn't be used
    const defaultColorPatterns = [
      /\b(bg|text|border|ring)-(red|blue|green|yellow|purple|pink|indigo|gray|slate|zinc|neutral|stone|orange|amber|lime|emerald|teal|cyan|sky|violet|fuchsia|rose)-\d{2,3}\b/g
    ];

    const foundDefaults = new Set();
    this.scanFilesForPatterns(srcDir, defaultColorPatterns, foundDefaults);

    if (foundDefaults.size === 0) {
      return { passed: true, message: 'No default Tailwind colors used' };
    } else {
      return {
        passed: false,
        message: `Default colors found: ${[...foundDefaults].slice(0, 5).join(', ')}`
      };
    }
  }

  scanFilesForPatterns(dir, patterns, matches) {
    const files = fs.readdirSync(dir);

    for (const file of files) {
      const filePath = path.join(dir, file);
      const stat = fs.statSync(filePath);

      if (stat.isDirectory()) {
        this.scanFilesForPatterns(filePath, patterns, matches);
      } else if (file.endsWith('.tsx') || file.endsWith('.ts')) {
        const content = fs.readFileSync(filePath, 'utf-8');

        patterns.forEach(pattern => {
          const found = content.match(pattern) || [];
          found.forEach(match => matches.add(match));
        });
      }
    }
  }

  /**
   * Helper methods
   */
  isValidUrl(url) {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }

  isDirectoryWritable(dir) {
    try {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      const testFile = path.join(dir, '.write-test');
      fs.writeFileSync(testFile, 'test');
      fs.unlinkSync(testFile);
      return true;
    } catch {
      return false;
    }
  }

  summarizeChecks(phase, checks) {
    console.log(`\n${phase} Validation Results:`);
    console.log('─'.repeat(50));

    let allPassed = true;
    checks.forEach(check => {
      const icon = check.passed ? '✓' : '✗';
      const color = check.passed ? '\x1b[32m' : '\x1b[31m';
      console.log(`${color}${icon}\x1b[0m ${check.name}`);
      console.log(`  ${check.message}`);
      if (!check.passed) allPassed = false;
    });

    if (this.warnings.length > 0) {
      console.log('\nWarnings:');
      this.warnings.forEach(w => console.log(`\x1b[33m⚠\x1b[0m ${w}`));
    }

    console.log('─'.repeat(50));
    console.log(`Status: ${allPassed ? '\x1b[32mPASSED\x1b[0m' : '\x1b[31mFAILED\x1b[0m'}`);

    return {
      passed: allPassed,
      checks,
      warnings: this.warnings,
      errors: this.errors
    };
  }
}

// CLI
if (require.main === module) {
  const args = process.argv.slice(2);
  const phase = args[0] || 'all';

  const validator = new ValidationEngine({
    referenceDir: args[1] || './references',
    prototypeDir: args[2] || './prototype'
  });

  let result;
  switch (phase) {
    case 'pre-capture':
      const config = args[1] ? JSON.parse(fs.readFileSync(args[1], 'utf-8')) : {};
      result = validator.validatePreCapture(config);
      break;
    case 'post-capture':
      result = validator.validatePostCapture();
      break;
    case 'pre-generation':
      result = validator.validatePreGeneration();
      break;
    case 'post-generation':
      result = validator.validatePostGeneration();
      break;
    case 'all':
      console.log('\n' + '='.repeat(60));
      console.log('RUNNING ALL VALIDATIONS');
      console.log('='.repeat(60));

      const results = [];
      results.push(validator.validatePostCapture());
      results.push(validator.validatePreGeneration());
      results.push(validator.validatePostGeneration());

      result = { passed: results.every(r => r.passed) };
      break;
    default:
      console.log(`
Validation Engine

Usage:
  node validation-engine.js <phase> [referenceDir] [prototypeDir]

Phases:
  pre-capture      Validate before capture (requires config file path)
  post-capture     Validate after capture
  pre-generation   Validate before prototype generation
  post-generation  Validate after prototype generation
  all              Run all applicable validations
      `);
      process.exit(0);
  }

  process.exit(result.passed ? 0 : 1);
}

module.exports = { ValidationEngine };
