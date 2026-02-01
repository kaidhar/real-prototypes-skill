#!/usr/bin/env node

/**
 * Real Prototypes - npx installer
 *
 * Installs the platform prototyping skill to your Claude Code environment.
 *
 * Usage:
 *   npx real-prototypes-skill          # Install the skill
 *   npx real-prototypes-skill --help   # Show help
 */

const fs = require('fs');
const path = require('path');
const os = require('os');
const https = require('https');

const VERSION = require('../package.json').version;
const SKILL_NAME = 'real-prototypes-skill';

/**
 * Check for newer version on npm and notify user
 */
function checkForUpdates() {
  return new Promise((resolve) => {
    const req = https.get(
      `https://registry.npmjs.org/${SKILL_NAME}/latest`,
      { timeout: 3000 },
      (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          try {
            const latest = JSON.parse(data).version;
            if (latest && latest !== VERSION) {
              const current = VERSION.split('.').map(Number);
              const remote = latest.split('.').map(Number);

              // Check if remote is newer
              const isNewer = remote[0] > current[0] ||
                (remote[0] === current[0] && remote[1] > current[1]) ||
                (remote[0] === current[0] && remote[1] === current[1] && remote[2] > current[2]);

              if (isNewer) {
                console.log(`
\x1b[33m╔═══════════════════════════════════════════════════════════╗
║  UPDATE AVAILABLE: ${VERSION} → ${latest.padEnd(43)}║
║                                                           ║
║  Run: npx ${SKILL_NAME}@latest --force            ║
╚═══════════════════════════════════════════════════════════╝\x1b[0m
`);
              }
            }
          } catch (e) { /* ignore parse errors */ }
          resolve();
        });
      }
    );
    req.on('error', () => resolve());
    req.on('timeout', () => { req.destroy(); resolve(); });
  });
}

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
║   \x1b[1mReal Prototypes\x1b[0m\x1b[35m                                         ║
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
  npx real-prototypes-skill [command] [options]

\x1b[1mCOMMANDS\x1b[0m
  install     Install the skill to your Claude Code environment (default)
  uninstall   Remove the skill from your Claude Code environment
  help        Show this help message

\x1b[1mOPTIONS\x1b[0m
  --global    Install to global Claude Code skills (~/.claude/skills/)
  --local     Install to current project (.claude/skills/)
  --force     Overwrite existing installation

\x1b[1mEXAMPLES\x1b[0m
  # Install to current project
  npx real-prototypes-skill

  # Install globally
  npx real-prototypes-skill --global

  # Force reinstall
  npx real-prototypes-skill --force

\x1b[1mAFTER INSTALLATION\x1b[0m
  1. Add platform credentials to your CLAUDE.md:

     ## Platform Credentials
     \`\`\`
     PLATFORM_URL=https://your-platform.com
     PLATFORM_EMAIL=your@email.com
     PLATFORM_PASSWORD=your-password
     \`\`\`

  2. Use the /real-prototypes-skill skill in Claude Code to capture and prototype

\x1b[1mLEARN MORE\x1b[0m
  https://github.com/kaidhar/real-prototypes-skill
  `);
}

function copyRecursive(src, dest) {
  const stat = fs.statSync(src);

  if (stat.isDirectory()) {
    if (!fs.existsSync(dest)) {
      fs.mkdirSync(dest, { recursive: true });
    }

    const files = fs.readdirSync(src);
    for (const file of files) {
      // Skip node_modules, .git, and temp files
      if (file === 'node_modules' || file === '.git' || file.startsWith('.temp')) {
        continue;
      }
      copyRecursive(path.join(src, file), path.join(dest, file));
    }
  } else {
    fs.copyFileSync(src, dest);
  }
}

function getSkillSource() {
  // When installed via npm, the skill files are in .claude/skills/real-prototypes-skill
  // relative to the package root
  const packageRoot = path.resolve(__dirname, '..');
  const skillDir = path.join(packageRoot, '.claude', 'skills', SKILL_NAME);

  if (fs.existsSync(skillDir)) {
    return skillDir;
  }

  // Fallback: check if we're in development
  const devSkillDir = path.join(packageRoot, '.claude', 'skills', SKILL_NAME);
  if (fs.existsSync(devSkillDir)) {
    return devSkillDir;
  }

  return null;
}

function install(options) {
  showBanner();

  const skillSource = getSkillSource();
  if (!skillSource) {
    log('Could not find skill source files', 'error');
    log('This might be a packaging issue. Please report at:', 'info');
    log('https://github.com/kaidhar/real-prototypes-skill/issues', 'info');
    process.exit(1);
  }

  // Determine target directory
  let targetBase;
  if (options.global) {
    targetBase = path.join(os.homedir(), '.claude', 'skills');
    log('Installing globally to ~/.claude/skills/', 'info');
  } else {
    targetBase = path.join(process.cwd(), '.claude', 'skills');
    log('Installing to current project .claude/skills/', 'info');
  }

  const targetDir = path.join(targetBase, SKILL_NAME);

  // Check if already installed
  if (fs.existsSync(targetDir) && !options.force) {
    log(`Skill already installed at ${targetDir}`, 'warning');
    log('Use --force to overwrite', 'info');
    process.exit(1);
  }

  // Create target directory
  if (!fs.existsSync(targetBase)) {
    fs.mkdirSync(targetBase, { recursive: true });
  }

  // Remove existing if force
  if (fs.existsSync(targetDir) && options.force) {
    log('Removing existing installation...', 'info');
    fs.rmSync(targetDir, { recursive: true, force: true });
  }

  // Copy skill files
  log('Copying skill files...', 'info');
  copyRecursive(skillSource, targetDir);

  log(`Skill installed to ${targetDir}`, 'success');

  // Also copy the agent-browser-skill if it exists and not already present
  const agentBrowserSource = path.join(path.dirname(skillSource), 'agent-browser-skill');
  const agentBrowserTarget = path.join(targetBase, 'agent-browser-skill');

  if (fs.existsSync(agentBrowserSource) && !fs.existsSync(agentBrowserTarget)) {
    log('Installing dependency: agent-browser-skill...', 'info');
    copyRecursive(agentBrowserSource, agentBrowserTarget);
    log('agent-browser-skill installed', 'success');
  }

  console.log(`
\x1b[1mInstallation Complete!\x1b[0m

\x1b[1mNext Steps:\x1b[0m

1. Add platform credentials to your CLAUDE.md (or copy .env.example):

   \x1b[36m## Platform Credentials
   \`\`\`
   PLATFORM_URL=https://your-platform.com
   PLATFORM_EMAIL=your@email.com
   PLATFORM_PASSWORD=your-password
   \`\`\`\x1b[0m

2. \x1b[1m(Optional)\x1b[0m Configure capture settings in CLAUDE.md:

   \x1b[36m## Capture Settings
   \`\`\`
   # Pages to capture (comma-separated paths, or "auto" for auto-discovery)
   PAGES_TO_CAPTURE=/homepage,/products,/checkout

   # Capture mode: "full" = all pages, "manual" = specified pages only
   CAPTURE_MODE=manual

   # Maximum pages to capture in auto mode
   MAX_PAGES=50

   # Viewport dimensions
   VIEWPORT_WIDTH=1920
   VIEWPORT_HEIGHT=1080

   # Wait time after page load (milliseconds)
   WAIT_AFTER_LOAD=2000
   \`\`\`\x1b[0m

3. Start Claude Code and use the skill:

   \x1b[36m/real-prototypes-skill\x1b[0m

4. Follow the prompts to capture and prototype!

\x1b[1mDocumentation:\x1b[0m
  ${targetDir}/README.md
  ${targetDir}/QUICKSTART.md

\x1b[1mExample Config:\x1b[0m
  See .claude/skills/real-prototypes-skill/examples/CLAUDE.md.example for a complete configuration template.

\x1b[1mNeed Help?\x1b[0m
  https://github.com/kaidhar/real-prototypes-skill
  `);
}

function uninstall(options) {
  showBanner();

  let targetBase;
  if (options.global) {
    targetBase = path.join(os.homedir(), '.claude', 'skills');
  } else {
    targetBase = path.join(process.cwd(), '.claude', 'skills');
  }

  const targetDir = path.join(targetBase, SKILL_NAME);

  if (!fs.existsSync(targetDir)) {
    log('Skill not found at ' + targetDir, 'warning');
    process.exit(0);
  }

  log(`Removing skill from ${targetDir}...`, 'info');
  fs.rmSync(targetDir, { recursive: true, force: true });
  log('Skill uninstalled successfully', 'success');
}

function parseArgs(args) {
  const options = {
    command: 'install',
    global: false,
    local: true,
    force: false
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    switch (arg) {
      case 'install':
      case 'uninstall':
      case 'help':
        options.command = arg;
        break;
      case '--global':
      case '-g':
        options.global = true;
        options.local = false;
        break;
      case '--local':
      case '-l':
        options.local = true;
        options.global = false;
        break;
      case '--force':
      case '-f':
        options.force = true;
        break;
      case '--help':
      case '-h':
        options.command = 'help';
        break;
      case '--version':
      case '-v':
        console.log(VERSION);
        process.exit(0);
    }
  }

  return options;
}

// Main
async function main() {
  const args = process.argv.slice(2);
  const options = parseArgs(args);

  // Check for updates (non-blocking, 3s timeout)
  await checkForUpdates();

  switch (options.command) {
    case 'install':
      install(options);
      break;
    case 'uninstall':
      uninstall(options);
      break;
    case 'help':
    default:
      showHelp();
      break;
  }
}

main();
