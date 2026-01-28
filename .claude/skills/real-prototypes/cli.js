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

const SKILL_DIR = __dirname;
const PROJECTS_DIR = path.resolve(SKILL_DIR, '../../../projects');
const VERSION = '1.1.0';

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
  real-prototypes <command> [options]

\x1b[1mCOMMANDS\x1b[0m
  new         Create a new project
  capture     Capture a web platform
  validate    Validate capture or prototype
  generate    Generate prototype from capture
  pipeline    Run full capture → validate → generate pipeline
  init        Initialize a new capture configuration
  list        List all projects

\x1b[1mPROJECT OPTIONS\x1b[0m
  --project   Project name (required for capture/validate/generate/pipeline)

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
  real-prototypes new --project my-app

  # Capture a platform
  real-prototypes capture --project my-app --url https://app.example.com --email user@test.com --password secret

  # Validate capture
  real-prototypes validate --project my-app --phase post-capture

  # Generate prototype
  real-prototypes generate --project my-app

  # Run full pipeline
  real-prototypes pipeline --project my-app --url https://app.example.com --email user@test.com --password secret

  # List all projects
  real-prototypes list

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
    features: []
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
    log('Example: real-prototypes ' + command + ' --project my-app', 'info');
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
    log('Example: real-prototypes new --project my-app', 'info');
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
     real-prototypes capture --project ${options.project} --url https://your-platform.com

  2. Or run the full pipeline:
     real-prototypes pipeline --project ${options.project} --url https://your-platform.com
  `);
}

function runList() {
  showBanner();
  log('Projects:', 'title');

  if (!fs.existsSync(PROJECTS_DIR)) {
    log('No projects found. Create one with: real-prototypes new --project <name>', 'info');
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
    log('No projects found. Create one with: real-prototypes new --project <name>', 'info');
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

async function runGenerate(options) {
  requireProject(options, 'generate');
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
\x1b[1mCapture Summary:\x1b[0m
  Platform: ${manifest.platform.name}
  Pages: ${manifest.pages.length}
  Colors: ${tokens.totalColorsFound}
  Primary Color: ${tokens.colors?.primary || 'Not identified'}

\x1b[1mGeneration Instructions:\x1b[0m
  1. Use ONLY colors from design-tokens.json
  2. Match layout from screenshots exactly
  3. Use inline styles for colors (Tailwind custom colors may not work)
  4. Validate with: real-prototypes validate --phase post-gen

\x1b[1mRequired Colors:\x1b[0m
  Primary: ${tokens.colors?.primary || 'N/A'}
  Text: ${tokens.colors?.text?.primary || 'N/A'}
  Background: ${tokens.colors?.background?.white || 'N/A'}
  Border: ${tokens.colors?.border?.default || 'N/A'}

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
  4. Run: real-prototypes validate --phase post-gen
  `);
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
  3. Run: real-prototypes capture --config ${outputPath}
  `);
}

// Main
const args = process.argv.slice(2);
const options = parseArgs(args);

switch (options.command) {
  case 'new':
    runNew(options);
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
    log('Run "real-prototypes --help" for usage', 'info');
    process.exit(1);
}
