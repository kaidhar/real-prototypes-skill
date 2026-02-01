---
name: real-prototypes-skill
description: Capture an existing web platform's visual design and generate feature prototypes that match its style. Use when a product manager or developer wants to prototype a new feature for an existing platform.
allowed-tools: Bash(agent-browser:*), Bash(npm:*), Bash(npx:*), Bash(mkdir:*), Bash(node:*)
---

## MANDATORY: EXTEND EXISTING PLATFORMS ONLY

**This skill adds features to EXISTING platforms. It does NOT create new designs.**

### Before ANY code generation, these MUST exist:
- `references/design-tokens.json` - Captured colors from existing platform
- `references/manifest.json` - Captured pages from existing platform
- `references/screenshots/` - Visual references from existing platform

### If captures don't exist:
**STOP** - Do not proceed with code generation
Run capture on the existing platform first:
```bash
node cli.js capture --project <name> --url <PLATFORM_URL>
```
NEVER create new designs, colors, or layouts from scratch

### If prototype already exists:
Use **EXTEND MODE** - Modify existing files only
NEVER replace or recreate existing pages

### CLI Enforcement:
- `new` command requires `--force-create` flag (blocks by default)
- `generate` command runs pre-flight check (blocks if captures missing)
- `plan` command validates captures exist before generating plan

---

# Platform Prototype Skill

Enterprise-grade tool for capturing web platforms and generating pixel-perfect prototypes.

---

## Prerequisites

### Required: agent-browser
This skill requires **agent-browser** for browser automation.

`agent-browser` is a **Vercel Labs npm package** for headless browser automation.

**Installation:**
```bash
# Install globally
npm install -g agent-browser

# Download Chromium (required after npm install)
agent-browser install
```

**Verify installation:**
```bash
agent-browser --version
```

**Note:** The `npx real-prototypes-skill` installer will attempt to install agent-browser automatically.

### Alternative: Manual Capture
If you can't install `agent-browser`, you can still use this skill by:
1. Manually taking screenshots and saving to `references/screenshots/`
2. Manually saving HTML to `references/html/`
3. Running `node cli.js extract-tokens` to generate design tokens from HTML
4. Then using `generate`, `plan`, and other commands

---

## 🏢 ENTERPRISE PIPELINE - MANDATORY FOR ALL PROTOTYPES

**This pipeline MUST be followed. Validation gates will BLOCK generation if prerequisites are missing.**

```
┌─────────────┐     ┌──────────────┐     ┌──────────┐     ┌──────────────┐     ┌────────┐
│   Capture   │ ──▶ │ Validate Pre │ ──▶ │ Generate │ ──▶ │ Validate Out │ ──▶ │ Output │
│  (ALL pages │     │    (GATE)    │     │   Code   │     │    (GATE)    │     │  Done  │
│  ALL states)│     │              │     │          │     │              │     │        │
└─────────────┘     └──────────────┘     └──────────┘     └──────────────┘     └────────┘
      │                   │                                      │
      ▼                   ▼                                      ▼
  Captures:           BLOCKS if:                             BLOCKS if:
  - ALL pages         - design-tokens.json missing           - Colors not in tokens
  - ALL tabs          - < 10 colors extracted                - Tailwind defaults used
  - ALL detail views  - No primary color found               - Wrong hex values
  - ALL dropdowns     - Screenshots missing
  - ALL modals        - Detail pages missing
```

---

## CRITICAL: Browser Automation Setup

**BEFORE any capture or screenshot operation, you MUST:**

1. **Invoke the agent-browser skill** using the Skill tool:
   ```
   Skill: agent-browser-skill
   ```

2. **Then use agent-browser commands** for all browser operations:
   ```bash
   agent-browser open <url>           # Navigate to page
   agent-browser snapshot -i          # Get interactive elements
   agent-browser fill @e1 "email"     # Fill form fields
   agent-browser click @e2            # Click buttons
   agent-browser screenshot path.png  # Take screenshots
   ```

3. **Do NOT** attempt to run `node cli.js capture` without first having agent-browser available

**Why this matters:** The capture engine relies on agent-browser commands. Without invoking the agent-browser skill first, screenshot and navigation commands will fail.

---

## Quick Start

### Option 1: Direct Browser Automation (Recommended)

1. **First, invoke agent-browser skill** (required before any browser operations)
2. **Then use browser commands:**

```bash
# Navigate and authenticate
agent-browser open https://app.example.com/login
agent-browser snapshot -i
agent-browser fill @e1 "user@test.com"
agent-browser fill @e2 "password"
agent-browser click @e3
agent-browser wait --url "**/dashboard"

# Capture screenshots
agent-browser screenshot projects/my-app/references/screenshots/dashboard.png
```

### Option 2: CLI Pipeline

**Note:** Requires agent-browser to already be available.

```bash
# Create a new project
node .claude/skills/real-prototypes-skill/cli.js new --project my-app

# Full Pipeline
node .claude/skills/real-prototypes-skill/cli.js pipeline \
  --project my-app \
  --url https://app.example.com \
  --email user@test.com \
  --password secret

# Or Step by Step
node cli.js capture --project my-app --url https://... --email ... --password ...
node cli.js validate --project my-app --phase post-capture
node cli.js validate --project my-app --phase pre-gen
# [Claude generates prototype]
node cli.js validate --project my-app --phase post-gen

# List all projects
node cli.js list
```

## Project Structure

All projects are stored in the `projects/` directory at the repository root:

```
<repository-root>/
└── projects/
    └── <project-name>/
        ├── project.json          # Project metadata
        ├── references/           # Captured platform assets (READ from here)
        │   ├── manifest.json
        │   ├── design-tokens.json
        │   ├── screenshots/
        │   └── html/
        └── prototype/            # Generated prototype (WRITE here)
            ├── src/
            └── package.json
```

### CRITICAL: File Output Location

**ALL generated prototype files MUST be created in:**
```
projects/<project-name>/prototype/
```

**Run `generate` command to see the exact absolute path:**
```bash
node cli.js generate --project <project-name>
```

This will output the full path where prototype files should be created.

---

## Capture Engine

The capture engine automatically discovers and captures:

### Pages
- ✅ Auto-discovers all navigation links
- ✅ Follows list → detail page patterns
- ✅ Captures all tab states
- ✅ Captures dropdown/menu states
- ✅ Multiple viewport sizes (desktop, tablet, mobile)

### Design Tokens
- ✅ Extracts ALL colors from HTML
- ✅ Categorizes colors (primary, text, background, border, status)
- ✅ Extracts font families
- ✅ Sorts by usage frequency

### Output
```
projects/<project-name>/references/
├── manifest.json           # All pages with metadata
├── design-tokens.json      # Extracted colors & fonts
├── screenshots/
│   ├── accounts-list-desktop.png
│   ├── account-details-overview-desktop.png
│   ├── account-details-tab-activity.png
│   ├── actions-dropdown.png
│   └── ...
└── html/
    ├── accounts-list.html
    ├── account-details.html
    └── ...
```

---

## Validation Gates

### Gate 1: Post-Capture Validation
Runs after capture, blocks if:
- ❌ Less than 5 pages captured
- ❌ Missing screenshots
- ❌ Less than 10 colors extracted
- ❌ No primary color identified
- ❌ List pages without detail pages

### Gate 2: Pre-Generation Validation
Runs before prototype generation, blocks if:
- ❌ manifest.json missing
- ❌ design-tokens.json missing
- ❌ Required color categories missing (primary, text, background, border)
- ❌ No screenshots available

### Gate 3: Post-Generation Validation
Runs after prototype generation, blocks if:
- ❌ Colors used that aren't in design-tokens.json
- ❌ Tailwind default colors used (e.g., `bg-blue-500`)
- ❌ Missing component files

---

## CLI Commands

### new
```bash
node cli.js new --project <name>

Creates a new project with folder structure.
```

### list
```bash
node cli.js list

Lists all projects with their status.
```

### detect
```bash
node cli.js detect --project <name>

Detects existing prototype in project.
- Identifies framework (Next.js, React, Vue, Angular)
- Detects styling approach (Tailwind, CSS modules, etc.)
- Maps captured pages to existing prototype files
- Recommends EXTEND vs CREATE mode
```

### capture
```bash
node cli.js capture --project <name> --url <URL> [options]

Options:
  --project   Project name (required)
  --url       Platform URL (required)
  --email     Login email (or set PLATFORM_EMAIL env var)
  --password  Login password (or set PLATFORM_PASSWORD env var)
  --config    Path to JSON config file
  --mode      auto|manual|hybrid (default: auto)
```

### validate
```bash
node cli.js validate --project <name> --phase <PHASE>

Options:
  --project   Project name (required)
  --phase     Validation phase (required)

Phases:
  pre-capture      Before starting capture
  post-capture     After capture completes
  pre-generation   Before generating prototype
  post-generation  After generating prototype
  all              Run all validations
```

### validate-colors
```bash
node cli.js validate-colors --project <name>

Validates all colors in prototype against design-tokens.json.
- Scans TSX/JSX/CSS files for color values
- Reports violations with line numbers
- Suggests closest matching design token colors
- Flags Tailwind default colors (bg-blue-500, etc.)
```

### convert
```bash
node cli.js convert --project <name> --page <page>

Converts captured HTML to React components.
- Parses HTML using jsdom
- Extracts component tree structure
- Converts to JSX (class→className, for→htmlFor)
- Preserves exact class names and inline styles
- Outputs to prototype/src/components/extracted/
```

### extract-css
```bash
node cli.js extract-css --project <name> --page <page>

Extracts and analyzes CSS from captured HTML.
- Parses <style> tags and inline styles
- Detects styling paradigm (Tailwind, SLDS, Bootstrap, etc.)
- Shows most used CSS classes
- Recommends styling approach for prototype
```

### extract-lib
```bash
node cli.js extract-lib --project <name>

Extracts reusable component library from all captured HTML.
- Identifies common patterns (buttons, cards, inputs, tables)
- Detects component variants (primary, secondary, disabled)
- Generates TypeScript React components
- Creates component registry (registry.json)
- Outputs to prototype/src/components/extracted/
```

### visual-diff
```bash
node cli.js visual-diff --project <name> --page <page>
node cli.js visual-diff --project <name> --list

Compares generated screenshots with reference captures.
- Pixel-level comparison using pixelmatch
- Generates diff images highlighting differences
- Calculates similarity score (target: >95%)
- Use --list to see available reference screenshots
```

### plan
```bash
node cli.js plan --project <name> --feature "description"

Generates implementation plan with exact details.
- Analyzes existing prototype structure
- Specifies EXTEND vs CREATE mode
- Provides exact file paths for modifications
- Includes injection points with selectors
- Lists validation checkpoints
- Outputs plan.json to project directory

Options:
  --feature   Description of feature to implement
  --target    Target page for modification
  --output    Custom output path for plan.json
```

### pipeline
```bash
node cli.js pipeline --project <name> --url <URL> [options]

Runs: capture → validate → generate guidance
```

### init
```bash
node cli.js init [--output <path>]

Creates capture-config.json template
```

---

## Extended Workflow (RECOMMENDED)

For best results, follow this extended workflow that addresses common issues:

### Phase 0: Pre-Implementation
```bash
# 1. Check for existing prototype FIRST
node cli.js detect --project my-app

# 2. Generate implementation plan
node cli.js plan --project my-app --feature "Add health score widget"

# 3. Review plan.json before proceeding
```

### Phase 1: Analysis
```bash
# 4. Extract component library from captured HTML
node cli.js extract-lib --project my-app

# 5. Analyze CSS patterns
node cli.js extract-css --project my-app --page homepage

# 6. Convert specific pages to React
node cli.js convert --project my-app --page account-detail
```

### Phase 2: Implementation
- Read the generated plan.json
- Use EXTEND mode if prototype exists (modify, don't replace)
- Use ONLY colors from design-tokens.json
- Match styling approach detected by extract-css

### Phase 3: Validation
```bash
# 7. Validate colors
node cli.js validate-colors --project my-app

# 8. Visual comparison (if screenshots available)
node cli.js visual-diff --project my-app --page homepage

# 9. Full validation
node cli.js validate --project my-app --phase post-gen
```

---

## Critical Rules

### NEVER:
1. ❌ Create new design systems or color schemes
2. ❌ Deviate from captured design tokens
3. ❌ Use colors not in design-tokens.json
4. ❌ Create new prototype if one exists (use EXTEND mode)
5. ❌ Replace existing pages - always extend
6. ❌ Introduce new styling paradigms (don't add styled-components if using CSS modules)

### ALWAYS:
1. ✅ Run `detect` first to check for existing prototype
2. ✅ Run `plan` to get implementation guidance
3. ✅ Parse captured HTML for exact structure
4. ✅ Validate colors against design-tokens.json
5. ✅ Use screenshot for visual reference
6. ✅ Preserve 100% of existing functionality
7. ✅ Match framework and styling of existing code
8. ✅ Insert at exact location specified in plan
9. ✅ Verify visual output matches reference >95%

---

## Configuration

```json
{
  "platform": {
    "name": "My Platform",
    "baseUrl": "https://app.example.com"
  },
  "auth": {
    "type": "form",
    "loginUrl": "/login",
    "credentials": {
      "emailField": "email",
      "passwordField": "password",
      "submitButton": "Sign in"
    }
  },
  "capture": {
    "mode": "auto",
    "maxPages": 100,
    "maxDepth": 5,
    "viewports": [
      { "name": "desktop", "width": 1920, "height": 1080 },
      { "name": "tablet", "width": 768, "height": 1024 },
      { "name": "mobile", "width": 375, "height": 812 }
    ],
    "interactions": {
      "clickButtons": true,
      "clickDropdowns": true,
      "clickTabs": true,
      "clickTableRows": true,
      "clickModals": true
    },
    "exclude": ["/logout", "/delete", "/remove"]
  },
  "validation": {
    "minPages": 5,
    "minColors": 10,
    "requireDetailPages": true,
    "requireAllTabs": true
  }
}
```

---

## For Claude: Prototype Generation Rules

### MANDATORY: Color Usage
```typescript
// ✅ CORRECT: Use exact hex from design-tokens.json
style={{ backgroundColor: "#1c64f2" }}
style={{ color: "#111928" }}
style={{ borderColor: "#e7e7e6" }}

// ❌ WRONG: Tailwind default colors
className="bg-blue-500"
className="text-gray-900"
className="border-gray-200"

// ❌ WRONG: Custom Tailwind colors (may not compile)
className="bg-primary"
className="text-text-heading"
```

### MANDATORY: Before Generating
1. Read `projects/<project>/references/manifest.json` - understand all captured pages
2. Read `projects/<project>/references/design-tokens.json` - get exact colors
3. View screenshots in `projects/<project>/references/screenshots/` - match layout exactly
4. Use ONLY colors from design-tokens.json

### MANDATORY: After Generating
```bash
node .claude/skills/real-prototypes-skill/cli.js validate --project <project> --phase post-gen
```

---

## Checklist: What Gets Captured

### Pages
- [ ] All sidebar/navigation pages
- [ ] All detail pages (click into list items)
- [ ] All tabs within pages
- [ ] All dropdown/menu states
- [ ] All modal dialogs
- [ ] Multiple viewports (if configured)

### Design Tokens
- [ ] Primary color
- [ ] Text colors (primary, secondary, muted)
- [ ] Background colors (white, light, gray)
- [ ] Border colors
- [ ] Status colors (success, error, warning)
- [ ] Font families

### Validation
- [ ] Minimum pages captured
- [ ] All screenshots exist
- [ ] Design tokens extracted
- [ ] List-detail pattern complete
- [ ] All tabs captured

---

## Troubleshooting

### "Capture missed detail pages"
- Increase `maxDepth` in config
- Enable `clickTableRows` in interactions
- Use `hybrid` mode with manual includes

### "Colors don't match"
- Run post-generation validation
- Use inline styles, not Tailwind classes
- Verify design-tokens.json has correct colors

### "Tailwind colors not working"
- Use inline `style={{ }}` for all colors
- Tailwind custom colors may not compile correctly on Windows/WSL

### "Login failed"
- Check credentials in env vars
- Verify loginUrl in config
- Check for CAPTCHA/2FA
