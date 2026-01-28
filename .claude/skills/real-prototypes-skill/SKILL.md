---
name: real-prototypes-skill
description: Capture an existing web platform's visual design and generate feature prototypes that match its style. Use when a product manager or developer wants to prototype a new feature for an existing platform.
allowed-tools: Bash(agent-browser:*), Bash(npm:*), Bash(npx:*), Bash(mkdir:*), Bash(node:*)
---

# Platform Prototype Skill

Enterprise-grade tool for capturing web platforms and generating pixel-perfect prototypes.

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

## Quick Start

```bash
# Create a new project
node .claude/skills/real-prototypes-skill/cli.js new --project my-app

# Full Pipeline (recommended)
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

All projects are stored in the `projects/` directory:

```
real-prototypes-skill/
├── projects/
│   ├── my-app/
│   │   ├── project.json      # Project metadata
│   │   ├── references/       # Captured platform assets
│   │   │   ├── manifest.json
│   │   │   ├── design-tokens.json
│   │   │   ├── screenshots/
│   │   │   └── html/
│   │   └── prototype/        # Generated Next.js prototype
│   │       ├── src/
│   │       └── package.json
│   └── another-project/
│       └── ...
└── .claude/skills/real-prototypes-skill/
```

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
