#!/usr/bin/env node

/**
 * Platform Prototype CLI
 *
 * Enterprise-grade tool for capturing web platforms and generating prototypes.
 *
 * Commands:
 *   capture   - Capture a web platform (screenshots, HTML, design tokens)
 *   validate  - Validate capture or prototype
 *   generate  - Generate prototype from capture
 *   pipeline  - Run full capture-validate-generate pipeline
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Check for required dependencies
function checkDependencies() {
  const required = ['jsdom'];
  const missing = [];

  for (const dep of required) {
    try {
      require.resolve(dep);
    } catch (e) {
      missing.push(dep);
    }
  }

  if (missing.length > 0) {
    console.log(`
\x1b[31m════════════════════════════════════════════════════════════\x1b[0m
\x1b[31m  MISSING DEPENDENCIES\x1b[0m
\x1b[31m════════════════════════════════════════════════════════════\x1b[0m

The following required packages are not installed:
  ${missing.join(', ')}

\x1b[1mTo fix, run:\x1b[0m
  cd ${__dirname} && npm install

\x1b[1mOr reinstall the skill:\x1b[0m
  npx real-prototypes-skill@latest --force
`);
    process.exit(1);
  }
}

// Run dependency check before anything else
checkDependencies();

const SKILL_DIR = __dirname;
const PROJECTS_DIR = path.resolve(SKILL_DIR, '../../../projects');
const VERSION = '1.4.0';

// Import new modules
const { detectPrototype, formatResult } = require('./scripts/detect-prototype');
const { ColorValidator, validateColors } = require('./validation/color-validator');
const { HTMLToReactConverter, convertHTMLToReact, writeComponents } = require('./scripts/html-to-react');
const { CSSExtractor, extractCSS } = require('./scripts/extract-css');
const { VisualDiffComparator } = require('./scripts/visual-diff');
const { ComponentExtractor, extractComponents } = require('./scripts/extract-components');
const { PlanGenerator, generatePlan } = require('./scripts/generate-plan');
const { ProjectStructure } = require('./scripts/project-structure');

function log(message, type = 'info') {
  const styles = {
    info: '\x1b[36m→\x1b[0m',
    success: '\x1b[32m✓\x1b[0m',
    warning: '\x1b[33m⚠\x1b[0m',
    error: '\x1b[31m✗\x1b[0m',
    title: '\x1b[1m\x1b[35m'
  };
  console.log(`${styles[type] || ''} ${message}${type === 'title' ? '\x1b[0m' : ''}`);
}

function showBanner() {
  console.log(`
\x1b[35m╔═══════════════════════════════════════════════════════════╗
║                                                           ║
║   \x1b[1mPlatform Prototype\x1b[0m\x1b[35m                                      ║
║   Capture any platform. Generate pixel-perfect prototypes.║
║                                                           ║
║   Version: ${VERSION}                                          ║
║                                                           ║
╚═══════════════════════════════════════════════════════════╝\x1b[0m
  `);
}

function showHelp() {
  showBanner();
  console.log(`
\x1b[1mUSAGE\x1b[0m
  real-prototypes-skill <command> [options]

\x1b[1mCOMMANDS\x1b[0m
  new              Create a new project
  detect           Detect existing prototype in project
  capture          Capture a web platform
  validate         Validate capture or prototype
  validate-colors  Validate colors against design tokens
  convert          Convert captured HTML to React components
  extract-css      Extract and analyze CSS from captured HTML
  extract-lib      Extract reusable component library from HTML
  visual-diff      Compare screenshots for visual accuracy
  plan             Generate implementation plan
  generate         Generate prototype from capture
  pipeline         Run full capture → validate → generate pipeline
  init             Initialize a new capture configuration
  list             List all projects

\x1b[1mPROJECT OPTIONS\x1b[0m
  --project   Project name (required for capture/validate/generate/pipeline)

\x1b[1mNEW PROJECT OPTIONS\x1b[0m
  --force-create  Required flag to create new project (blocks by default)

\x1b[1mCAPTURE OPTIONS\x1b[0m
  --url       Platform URL (required)
  --email     Login email
  --password  Login password
  --output    Output directory (default: ./references)
  --config    Path to config file
  --mode      Capture mode: auto, manual, hybrid (default: auto)

\x1b[1mVALIDATE OPTIONS\x1b[0m
  --phase     Validation phase: pre-capture, post-capture, pre-gen, post-gen, all
  --refs      References directory (default: ./references)
  --proto     Prototype directory (default: ./prototype)

\x1b[1mGENERATE OPTIONS\x1b[0m
  --refs      References directory (default: ./references)
  --output    Output directory (default: ./prototype)
  --feature   Feature to add (can be used multiple times)

\x1b[1mEXAMPLES\x1b[0m
  # Create a new project
  real-prototypes-skill new --project my-app

  # Capture a platform
  real-prototypes-skill capture --project my-app --url https://app.example.com --email user@test.com --password secret

  # Validate capture
  real-prototypes-skill validate --project my-app --phase post-capture

  # Generate prototype
  real-prototypes-skill generate --project my-app

  # Run full pipeline
  real-prototypes-skill pipeline --project my-app --url https://app.example.com --email user@test.com --password secret

  # List all projects
  real-prototypes-skill list

\x1b[1mENVIRONMENT VARIABLES\x1b[0m
  PLATFORM_EMAIL     Login email (alternative to --email)
  PLATFORM_PASSWORD  Login password (alternative to --password)
  `);
}

function parseArgs(args) {
  const options = {
    command: args[0],
    project: null,
    url: null,
    email: process.env.PLATFORM_EMAIL,
    password: process.env.PLATFORM_PASSWORD,
    output: null,
    config: null,
    mode: 'auto',
    phase: 'all',
    refs: null,
    proto: null,
    features: [],
    forceCreate: false
  };

  for (let i = 1; i < args.length; i++) {
    switch (args[i]) {
      case '--project':
        options.project = args[++i];
        break;
      case '--url':
        options.url = args[++i];
        break;
      case '--email':
        options.email = args[++i];
        break;
      case '--password':
        options.password = args[++i];
        break;
      case '--output':
        options.output = args[++i];
        break;
      case '--config':
        options.config = args[++i];
        break;
      case '--mode':
        options.mode = args[++i];
        break;
      case '--phase':
        options.phase = args[++i];
        break;
      case '--refs':
        options.refs = args[++i];
        break;
      case '--proto':
        options.proto = args[++i];
        break;
      case '--feature':
        options.features.push(args[++i]);
        break;
      case '--force-create':
        options.forceCreate = true;
        break;
      case '--help':
      case '-h':
        showHelp();
        process.exit(0);
    }
  }

  // Set project-based paths if project is specified
  if (options.project) {
    const projectDir = path.join(PROJECTS_DIR, options.project);
    options.refs = options.refs || path.join(projectDir, 'references');
    options.proto = options.proto || path.join(projectDir, 'prototype');
  } else {
    options.refs = options.refs || './references';
    options.proto = options.proto || './prototype';
  }

  return options;
}

function requireProject(options, command) {
  if (!options.project) {
    log(`--project is required for ${command} command`, 'error');
    log('Example: real-prototypes-skill ' + command + ' --project my-app', 'info');
    process.exit(1);
  }
}

function getProjectDir(projectName) {
  return path.join(PROJECTS_DIR, projectName);
}

function runNew(options) {
  showBanner();

  if (!options.project) {
    log('--project is required for new command', 'error');
    log('Example: real-prototypes-skill new --project my-app', 'info');
    process.exit(1);
  }

  // Block project creation by default - require explicit flag
  if (!options.forceCreate) {
    console.log('');
    log('═══════════════════════════════════════════', 'warning');
    log('PROJECT CREATION BLOCKED', 'warning');
    log('═══════════════════════════════════════════', 'warning');
    console.log('');
    log('This skill is for capturing EXISTING platforms, not creating new designs.', 'info');
    console.log('');
    log('If you have an existing platform to capture:', 'info');
    log(`  1. Create project: node cli.js new --project ${options.project} --force-create`, 'info');
    log(`  2. Capture it: node cli.js capture --project ${options.project} --url <URL>`, 'info');
    console.log('');
    log('Use --force-create only if you understand this creates an EMPTY project', 'warning');
    log('that must be populated by capturing an existing platform.', 'warning');
    process.exit(1);
  }

  const projectDir = getProjectDir(options.project);
  const refsDir = path.join(projectDir, 'references');
  const protoDir = path.join(projectDir, 'prototype');

  if (fs.existsSync(projectDir)) {
    log(`Project "${options.project}" already exists at ${projectDir}`, 'error');
    process.exit(1);
  }

  log(`Creating project: ${options.project}`, 'title');

  // Create directories
  fs.mkdirSync(refsDir, { recursive: true });
  fs.mkdirSync(path.join(refsDir, 'screenshots'), { recursive: true });
  fs.mkdirSync(path.join(refsDir, 'html'), { recursive: true });
  fs.mkdirSync(protoDir, { recursive: true });

  // Create project config
  const projectConfig = {
    name: options.project,
    created: new Date().toISOString(),
    platform: {
      name: '',
      baseUrl: ''
    }
  };
  fs.writeFileSync(path.join(projectDir, 'project.json'), JSON.stringify(projectConfig, null, 2));

  log(`Project created: ${projectDir}`, 'success');
  console.log(`
\x1b[1mProject Structure:\x1b[0m
  ${projectDir}/
  ├── project.json      # Project configuration
  ├── references/       # Captured platform assets
  │   ├── screenshots/
  │   └── html/
  └── prototype/        # Generated prototype

\x1b[1mNext Steps:\x1b[0m
  1. Capture a platform:
     real-prototypes-skill capture --project ${options.project} --url https://your-platform.com

  2. Or run the full pipeline:
     real-prototypes-skill pipeline --project ${options.project} --url https://your-platform.com
  `);
}

function runList() {
  showBanner();
  log('Projects:', 'title');

  if (!fs.existsSync(PROJECTS_DIR)) {
    log('No projects found. Create one with: real-prototypes-skill new --project <name>', 'info');
    return;
  }

  const projects = fs.readdirSync(PROJECTS_DIR, { withFileTypes: true })
    .filter(dirent => dirent.isDirectory())
    .map(dirent => {
      const projectDir = path.join(PROJECTS_DIR, dirent.name);
      const configPath = path.join(projectDir, 'project.json');
      const manifestPath = path.join(projectDir, 'references', 'manifest.json');

      let config = { name: dirent.name };
      let manifest = null;

      if (fs.existsSync(configPath)) {
        try { config = JSON.parse(fs.readFileSync(configPath, 'utf-8')); } catch {}
      }
      if (fs.existsSync(manifestPath)) {
        try { manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8')); } catch {}
      }

      return {
        name: dirent.name,
        platform: config.platform?.baseUrl || 'Not configured',
        pages: manifest?.pages?.length || 0,
        created: config.created || 'Unknown'
      };
    });

  if (projects.length === 0) {
    log('No projects found. Create one with: real-prototypes-skill new --project <name>', 'info');
    return;
  }

  console.log('');
  console.log('  \x1b[1mName\x1b[0m                 \x1b[1mPlatform\x1b[0m                    \x1b[1mPages\x1b[0m');
  console.log('  ' + '-'.repeat(70));

  projects.forEach(p => {
    const name = p.name.padEnd(20);
    const platform = (p.platform || '').substring(0, 27).padEnd(27);
    const pages = String(p.pages).padStart(5);
    console.log(`  ${name} ${platform} ${pages}`);
  });
  console.log('');
}

async function runCapture(options) {
  requireProject(options, 'capture');
  log(`Starting platform capture for project: ${options.project}`, 'title');

  // Build config
  const config = options.config
    ? JSON.parse(fs.readFileSync(options.config, 'utf-8'))
    : {
        platform: {
          name: options.url ? new URL(options.url).hostname : 'unknown',
          baseUrl: options.url
        },
        auth: {
          type: options.email ? 'form' : 'none',
          loginUrl: '/login',
          credentials: {
            email: options.email,
            password: options.password
          }
        },
        capture: {
          mode: options.mode,
          maxPages: 100,
          maxDepth: 5,
          viewports: [
            { name: 'desktop', width: 1920, height: 1080 }
          ],
          interactions: {
            clickButtons: true,
            clickDropdowns: true,
            clickTabs: true,
            clickTableRows: true
          }
        },
        output: {
          directory: options.output || options.refs,
          screenshots: true,
          html: true,
          designTokens: true
        },
        validation: {
          minPages: 5,
          minColors: 10,
          requireDetailPages: true
        }
      };

  if (!config.platform.baseUrl) {
    log('Missing --url parameter', 'error');
    process.exit(1);
  }

  // Write temp config
  const configPath = path.join(SKILL_DIR, '.temp-config.json');
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2));

  // Run capture engine
  try {
    const enginePath = path.join(SKILL_DIR, 'capture', 'capture-engine.js');
    execSync(`node "${enginePath}" --config "${configPath}"`, { stdio: 'inherit' });
    log('Capture completed successfully!', 'success');
    return true;
  } catch (error) {
    log('Capture failed', 'error');
    return false;
  } finally {
    if (fs.existsSync(configPath)) {
      fs.unlinkSync(configPath);
    }
  }
}

async function runValidate(options) {
  requireProject(options, 'validate');
  log(`Running ${options.phase} validation for project: ${options.project}`, 'title');

  const validatorPath = path.join(SKILL_DIR, 'validation', 'validation-engine.js');

  try {
    execSync(`node "${validatorPath}" ${options.phase} "${options.refs}" "${options.proto}"`, {
      stdio: 'inherit'
    });
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Pre-flight check - MANDATORY before any generation
 * Validates that required captures exist before proceeding
 */
function runPreflight(options) {
  const errors = [];

  // Required files
  const required = [
    { path: path.join(options.refs, 'design-tokens.json'), name: 'design-tokens.json' },
    { path: path.join(options.refs, 'manifest.json'), name: 'manifest.json' }
  ];

  for (const { path: filePath, name } of required) {
    if (!fs.existsSync(filePath)) {
      errors.push(`${name} missing - captures required before generation`);
    }
  }

  // Screenshots directory
  const screenshotsDir = path.join(options.refs, 'screenshots');
  if (!fs.existsSync(screenshotsDir)) {
    errors.push('screenshots/ directory missing - run capture first');
  } else {
    const screenshots = fs.readdirSync(screenshotsDir).filter(f => f.endsWith('.png'));
    if (screenshots.length === 0) {
      errors.push('No screenshots found - run capture first');
    }
  }

  if (errors.length > 0) {
    console.log('');
    log('═══════════════════════════════════════════', 'error');
    log('PRE-FLIGHT CHECK FAILED - CANNOT PROCEED', 'error');
    log('═══════════════════════════════════════════', 'error');
    console.log('');
    errors.forEach(e => log(e, 'error'));
    console.log('');
    log('You MUST capture the existing platform first:', 'warning');
    log(`  node cli.js capture --project ${options.project} --url <PLATFORM_URL>`, 'info');
    console.log('');
    log('This skill is for adding features to EXISTING platforms.', 'info');
    log('It does NOT create new designs from scratch.', 'info');
    process.exit(1);
  }

  log('Pre-flight check passed', 'success');
  return true;
}

async function runGenerate(options) {
  requireProject(options, 'generate');

  // MANDATORY: Pre-flight check before ANY generation
  runPreflight(options);

  // Auto-detect existing prototype
  const protoInfo = detectPrototype(options.proto);
  if (protoInfo.exists) {
    console.log('');
    log('═══════════════════════════════════════════', 'warning');
    log('EXTEND MODE ACTIVE - Existing prototype detected', 'warning');
    log('═══════════════════════════════════════════', 'warning');
    log(`Framework: ${protoInfo.framework}`, 'info');
    log('All changes MUST modify existing files only', 'warning');
    console.log('');
  }

  log(`Generating prototype for project: ${options.project}`, 'title');

  // This would integrate with your prototype generation logic
  // For now, we'll provide guidance

  const manifestPath = path.join(options.refs, 'manifest.json');
  const tokensPath = path.join(options.refs, 'design-tokens.json');

  if (!fs.existsSync(manifestPath)) {
    log('manifest.json not found - run capture first', 'error');
    return false;
  }

  if (!fs.existsSync(tokensPath)) {
    log('design-tokens.json not found - run capture first', 'error');
    return false;
  }

  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
  const tokens = JSON.parse(fs.readFileSync(tokensPath, 'utf-8'));

  console.log(`
\x1b[1m════════════════════════════════════════════════════════════\x1b[0m
\x1b[1m                    PROJECT PATHS                            \x1b[0m
\x1b[1m════════════════════════════════════════════════════════════\x1b[0m

\x1b[1mPrototype Output Directory:\x1b[0m
  ${options.proto}

\x1b[1mReference Files:\x1b[0m
  Screenshots: ${path.join(options.refs, 'screenshots')}
  HTML:        ${path.join(options.refs, 'html')}
  Tokens:      ${tokensPath}
  Manifest:    ${manifestPath}

\x1b[1m════════════════════════════════════════════════════════════\x1b[0m
\x1b[1m                    CAPTURE SUMMARY                          \x1b[0m
\x1b[1m════════════════════════════════════════════════════════════\x1b[0m

  Platform: ${manifest.platform.name}
  Pages: ${manifest.pages.length}
  Colors: ${tokens.totalColorsFound}
  Primary Color: ${tokens.colors?.primary || 'Not identified'}

\x1b[1mRequired Colors (from design-tokens.json):\x1b[0m
  Primary: ${tokens.colors?.primary || 'N/A'}
  Text: ${tokens.colors?.text?.primary || 'N/A'}
  Background: ${tokens.colors?.background?.white || 'N/A'}
  Border: ${tokens.colors?.border?.default || 'N/A'}

\x1b[1m════════════════════════════════════════════════════════════\x1b[0m
\x1b[1m                    INSTRUCTIONS                             \x1b[0m
\x1b[1m════════════════════════════════════════════════════════════\x1b[0m

\x1b[33mALL prototype files MUST be created in:\x1b[0m
  ${options.proto}

\x1b[1mGeneration Rules:\x1b[0m
  1. Use ONLY colors from design-tokens.json
  2. Match layout from screenshots exactly
  3. Use inline styles for colors (Tailwind custom colors may not work)
  4. Validate with: node cli.js validate-colors --project ${options.project}

\x1b[1mFeatures to add:\x1b[0m
${options.features.length > 0 ? options.features.map(f => `  - ${f}`).join('\n') : '  (none specified)'}
  `);

  return true;
}

async function runPipeline(options) {
  requireProject(options, 'pipeline');
  showBanner();
  log(`Running full pipeline for project: ${options.project}`, 'title');

  console.log(`
\x1b[1mPipeline Steps:\x1b[0m
  1. Pre-capture validation
  2. Platform capture
  3. Post-capture validation
  4. Pre-generation validation
  5. Prototype generation
  6. Post-generation validation
  `);

  // Step 1: Pre-capture validation
  log('Step 1: Pre-capture validation', 'info');
  // Simplified - would normally run validator

  // Step 2: Capture
  log('Step 2: Platform capture', 'info');
  const captureSuccess = await runCapture(options);
  if (!captureSuccess) {
    log('Pipeline failed at capture step', 'error');
    process.exit(1);
  }

  // Step 3: Post-capture validation
  log('Step 3: Post-capture validation', 'info');
  options.phase = 'post-capture';
  const postCaptureValid = await runValidate(options);
  if (!postCaptureValid) {
    log('Pipeline failed at post-capture validation', 'error');
    process.exit(1);
  }

  // Step 4: Pre-generation validation
  log('Step 4: Pre-generation validation', 'info');
  options.phase = 'pre-generation';
  const preGenValid = await runValidate(options);
  if (!preGenValid) {
    log('Pipeline failed at pre-generation validation', 'error');
    process.exit(1);
  }

  // Step 5: Generate
  log('Step 5: Prototype generation', 'info');
  await runGenerate(options);

  log('Pipeline completed!', 'success');
  console.log(`
\x1b[1mNext Steps:\x1b[0m
  1. Review screenshots in ${options.refs}/screenshots/
  2. Check design-tokens.json for color palette
  3. Generate prototype using the captured references
  4. Run: real-prototypes-skill validate --phase post-gen
  `);
}

function runValidateColors(options) {
  requireProject(options, 'validate-colors');
  showBanner();
  log(`Validating colors for project: ${options.project}`, 'title');

  const tokensPath = path.join(options.refs, 'design-tokens.json');

  if (!fs.existsSync(tokensPath)) {
    log('design-tokens.json not found - run capture first', 'error');
    process.exit(1);
  }

  if (!fs.existsSync(options.proto)) {
    log('Prototype directory not found', 'error');
    process.exit(1);
  }

  try {
    const validator = validateColors(options.proto, tokensPath);
    console.log('');
    console.log(validator.formatViolations());

    const summary = validator.getSummary();
    if (summary.passed) {
      log('All colors validated successfully!', 'success');
    } else {
      log(`Found ${summary.total} color violation(s)`, 'error');
      process.exit(1);
    }
  } catch (error) {
    log(`Validation failed: ${error.message}`, 'error');
    process.exit(1);
  }
}

function runConvert(options, args) {
  requireProject(options, 'convert');
  showBanner();

  // Get page name from args
  let pageName = null;
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--page') {
      pageName = args[++i];
    }
  }

  if (!pageName) {
    log('--page is required for convert command', 'error');
    log('Example: real-prototypes-skill convert --project my-app --page homepage', 'info');
    process.exit(1);
  }

  log(`Converting HTML to React for: ${pageName}`, 'title');

  const htmlPath = path.join(options.refs, 'html', `${pageName}.html`);
  const outputDir = path.join(options.proto, 'src', 'components', 'extracted');

  if (!fs.existsSync(htmlPath)) {
    log(`HTML file not found: ${htmlPath}`, 'error');
    process.exit(1);
  }

  try {
    const result = convertHTMLToReact(htmlPath);

    console.log(`\n\x1b[1mDetected Components (${result.boundaries.length}):\x1b[0m`);
    for (const boundary of result.boundaries.slice(0, 10)) {
      console.log(`  ${boundary.suggestedName} (${boundary.type})`);
    }

    console.log(`\n\x1b[1mExtracted Components (${result.components.length}):\x1b[0m`);
    for (const comp of result.components) {
      console.log(`  ${comp.name}`);
    }

    // Write components
    const written = writeComponents(result.components, outputDir);
    console.log(`\n\x1b[32m✓ Wrote ${written.length} components to: ${outputDir}\x1b[0m`);

  } catch (error) {
    log(`Conversion failed: ${error.message}`, 'error');
    process.exit(1);
  }
}

function runExtractCSS(options, args) {
  requireProject(options, 'extract-css');
  showBanner();

  let pageName = null;
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--page') {
      pageName = args[++i];
    }
  }

  if (!pageName) {
    log('--page is required for extract-css command', 'error');
    log('Example: real-prototypes-skill extract-css --project my-app --page homepage', 'info');
    process.exit(1);
  }

  log(`Extracting CSS from: ${pageName}`, 'title');

  const htmlPath = path.join(options.refs, 'html', `${pageName}.html`);

  if (!fs.existsSync(htmlPath)) {
    log(`HTML file not found: ${htmlPath}`, 'error');
    process.exit(1);
  }

  try {
    const extractor = new CSSExtractor();
    extractor.loadFromFile(htmlPath);

    console.log('');
    console.log(extractor.formatResults());

  } catch (error) {
    log(`Extraction failed: ${error.message}`, 'error');
    process.exit(1);
  }
}

function runVisualDiff(options, args) {
  requireProject(options, 'visual-diff');
  showBanner();

  let pageName = null;
  let listMode = false;
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--page') {
      pageName = args[++i];
    }
    if (args[i] === '--list') {
      listMode = true;
    }
  }

  const screenshotsDir = path.join(options.refs, 'screenshots');

  if (listMode) {
    log('Available reference screenshots:', 'title');
    if (fs.existsSync(screenshotsDir)) {
      const files = fs.readdirSync(screenshotsDir).filter(f => f.endsWith('.png'));
      for (const file of files) {
        console.log(`  ${file.replace('.png', '')}`);
      }
    } else {
      log('No screenshots found', 'warning');
    }
    return;
  }

  if (!pageName) {
    log('--page is required (or use --list to see available)', 'error');
    log('Example: real-prototypes-skill visual-diff --project my-app --page homepage', 'info');
    process.exit(1);
  }

  log(`Visual diff for: ${pageName}`, 'title');

  // Find reference screenshot
  const refScreenshots = fs.existsSync(screenshotsDir)
    ? fs.readdirSync(screenshotsDir).filter(f => f.toLowerCase().includes(pageName.toLowerCase()) && f.endsWith('.png'))
    : [];

  if (refScreenshots.length === 0) {
    log(`No reference screenshot found for: ${pageName}`, 'error');
    log('Use --list to see available screenshots', 'info');
    process.exit(1);
  }

  const refPath = path.join(screenshotsDir, refScreenshots[0]);
  console.log(`  Reference: ${refScreenshots[0]}`);

  // Look for generated screenshot
  const genScreenshotsDir = path.join(options.proto, 'screenshots');
  const genScreenshots = fs.existsSync(genScreenshotsDir)
    ? fs.readdirSync(genScreenshotsDir).filter(f => f.toLowerCase().includes(pageName.toLowerCase()) && f.endsWith('.png'))
    : [];

  if (genScreenshots.length === 0) {
    log('No generated screenshot found to compare', 'warning');
    console.log(`
\x1b[1mTo generate a screenshot:\x1b[0m
  1. Start your prototype: npm run dev
  2. Take a screenshot of the page
  3. Save it to: ${genScreenshotsDir}/${pageName}.png
    `);
    return;
  }

  const genPath = path.join(genScreenshotsDir, genScreenshots[0]);
  console.log(`  Generated: ${genScreenshots[0]}`);

  // Run comparison
  (async () => {
    try {
      const comparator = new VisualDiffComparator({ minSimilarity: 95 });
      const diffPath = path.join(options.refs, 'diff', `${pageName}-diff.png`);

      const result = await comparator.compare(refPath, genPath, diffPath);

      console.log('');
      console.log(comparator.formatResults());

    } catch (error) {
      log(`Visual diff failed: ${error.message}`, 'error');
      process.exit(1);
    }
  })();
}

function runDetect(options) {
  requireProject(options, 'detect');
  showBanner();
  log(`Detecting existing prototype for project: ${options.project}`, 'title');

  const projectDir = getProjectDir(options.project);
  const protoDir = path.join(projectDir, 'prototype');
  const manifestPath = path.join(projectDir, 'references', 'manifest.json');

  // First check if prototype directory exists
  if (!fs.existsSync(protoDir)) {
    log('No prototype directory found', 'warning');
    log(`Expected at: ${protoDir}`, 'info');
    console.log(`
\x1b[1mTo create a prototype:\x1b[0m
  1. Run capture first: real-prototypes-skill capture --project ${options.project} --url <URL>
  2. Then generate: real-prototypes-skill generate --project ${options.project}
    `);
    return { exists: false };
  }

  // Run detection
  const result = detectPrototype(protoDir);

  // Try to map pages if manifest exists
  if (fs.existsSync(manifestPath)) {
    try {
      const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
      const { mapPages } = require('./scripts/detect-prototype');
      result.mappedPages = mapPages(protoDir, manifest);
    } catch (e) {
      log(`Could not load manifest: ${e.message}`, 'warning');
    }
  }

  console.log('');
  console.log(formatResult(result));
  console.log('');

  if (result.exists) {
    log('Existing prototype detected - use EXTEND mode', 'success');
    console.log(`
\x1b[1mRecommendation:\x1b[0m
  When generating new features, modify existing files instead of creating new ones.

\x1b[1mExisting prototype details:\x1b[0m
  Framework: ${result.framework || 'Unknown'}
  Styling: ${result.styling.join(', ')}
  Pages: ${result.pages.length}
  Components: ${result.components.length}
    `);
  } else {
    log('No existing prototype found - safe to CREATE new', 'info');
  }

  return result;
}

function runExtractLib(options) {
  requireProject(options, 'extract-lib');
  showBanner();
  log(`Extracting component library for project: ${options.project}`, 'title');

  const htmlDir = path.join(options.refs, 'html');
  const outputDir = path.join(options.proto, 'src', 'components', 'extracted');

  if (!fs.existsSync(htmlDir)) {
    log('HTML directory not found - run capture first', 'error');
    process.exit(1);
  }

  try {
    const extractor = new ComponentExtractor();
    extractor.analyzeDirectory(htmlDir);

    console.log('');
    console.log(extractor.formatSummary());

    // Write components
    const written = extractor.writeComponents(outputDir);
    console.log(`\n\x1b[32m✓ Wrote ${written.length} files to: ${outputDir}\x1b[0m`);
    for (const file of written) {
      console.log(`  ${path.basename(file)}`);
    }

  } catch (error) {
    log(`Extraction failed: ${error.message}`, 'error');
    process.exit(1);
  }
}

function runPlan(options, args) {
  requireProject(options, 'plan');
  showBanner();

  let feature = '';
  let targetPage = null;
  let outputPath = null;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--feature') {
      feature = args[++i];
    } else if (args[i] === '--target') {
      targetPage = args[++i];
    } else if (args[i] === '--output' || args[i] === '-o') {
      outputPath = args[++i];
    }
  }

  log(`Generating implementation plan for project: ${options.project}`, 'title');

  const projectDir = getProjectDir(options.project);

  try {
    const generator = new PlanGenerator(projectDir, {
      featureDescription: feature,
      targetPage
    });

    generator.generate();
    console.log('');
    console.log(generator.formatPlan());

    if (outputPath) {
      generator.writePlan(outputPath);
      console.log(`\n\x1b[32m✓ Plan written to: ${outputPath}\x1b[0m`);
    } else {
      // Write to project directory by default
      const defaultPath = path.join(projectDir, 'plan.json');
      generator.writePlan(defaultPath);
      console.log(`\n\x1b[32m✓ Plan written to: ${defaultPath}\x1b[0m`);
    }

  } catch (error) {
    log(`Plan generation failed: ${error.message}`, 'error');
    process.exit(1);
  }
}

function runInit(options) {
  showBanner();
  log('Initializing capture configuration...', 'title');

  const configTemplate = {
    platform: {
      name: 'My Platform',
      baseUrl: 'https://app.example.com'
    },
    auth: {
      type: 'form',
      loginUrl: '/login',
      credentials: {
        emailField: 'email',
        passwordField: 'password',
        submitButton: 'Sign in'
      }
    },
    capture: {
      mode: 'auto',
      maxPages: 100,
      maxDepth: 5,
      viewports: [
        { name: 'desktop', width: 1920, height: 1080 },
        { name: 'tablet', width: 768, height: 1024 },
        { name: 'mobile', width: 375, height: 812 }
      ],
      interactions: {
        clickButtons: true,
        clickDropdowns: true,
        clickTabs: true,
        clickTableRows: true,
        clickModals: true,
        hoverElements: true
      },
      exclude: ['/logout', '/signout', '/delete', '/remove']
    },
    output: {
      directory: './references',
      screenshots: true,
      html: true,
      designTokens: true
    },
    validation: {
      minPages: 5,
      minColors: 10,
      requireDetailPages: true,
      requireAllTabs: true
    }
  };

  const outputPath = options.output || './capture-config.json';
  fs.writeFileSync(outputPath, JSON.stringify(configTemplate, null, 2));

  log(`Configuration created: ${outputPath}`, 'success');
  console.log(`
\x1b[1mNext Steps:\x1b[0m
  1. Edit ${outputPath} with your platform details
  2. Set environment variables:
     export PLATFORM_EMAIL=your@email.com
     export PLATFORM_PASSWORD=yourpassword
  3. Run: real-prototypes-skill capture --config ${outputPath}
  `);
}

// Main
const args = process.argv.slice(2);
const options = parseArgs(args);

switch (options.command) {
  case 'new':
    runNew(options);
    break;
  case 'detect':
    runDetect(options);
    break;
  case 'list':
    runList();
    break;
  case 'capture':
    runCapture(options);
    break;
  case 'validate':
    runValidate(options);
    break;
  case 'validate-colors':
    runValidateColors(options);
    break;
  case 'convert':
    runConvert(options, args);
    break;
  case 'extract-css':
    runExtractCSS(options, args);
    break;
  case 'extract-lib':
    runExtractLib(options);
    break;
  case 'visual-diff':
    runVisualDiff(options, args);
    break;
  case 'plan':
    runPlan(options, args);
    break;
  case 'generate':
    runGenerate(options);
    break;
  case 'pipeline':
    runPipeline(options);
    break;
  case 'init':
    runInit(options);
    break;
  case 'help':
  case '--help':
  case '-h':
  case undefined:
    showHelp();
    break;
  default:
    log(`Unknown command: ${options.command}`, 'error');
    log('Run "real-prototypes-skill --help" for usage', 'info');
    process.exit(1);
}
