# Platform Prototyping Skill - Product Requirements Document

## Overview

A Claude Code skill that enables product managers and developers to rapidly prototype new features for their existing platforms. The skill captures the visual and structural essence of an existing web platform (screenshots, HTML, CSS) and uses those references to build feature prototypes that seamlessly match the original platform's design language.

**Problem Solved:** Building feature prototypes that visually match an existing platform is time-consuming. Designers and developers spend significant effort recreating existing UI patterns. This skill automates the capture of platform references and uses them to generate pixel-accurate prototypes.

## Target Audience

**Primary Users:** Product Managers and Developers who:
- Need to quickly prototype new features for existing platforms
- Want prototypes that visually match their platform's design system
- May not have direct access to the platform's source code or design files
- Need to communicate feature ideas with stakeholders before full development

**Key Pain Points:**
- Manually recreating existing UI styles is tedious
- Design handoff is slow and often incomplete
- Prototypes that don't match the platform feel disconnected
- No easy way to capture and reference existing platform patterns

## Core Features

### 1. Platform Capture
**Priority: Critical**

Automated browser navigation using Playwright (via agent-browser skill) to:
- Navigate to specified URLs
- Authenticate using credentials stored in CLAUDE.md
- Capture full-page screenshots of key pages
- Extract HTML structure and inline/external CSS
- Identify UI components, colors, typography, and spacing

### 2. Reference Storage
**Priority: Critical**

Organized folder structure to store captured assets:
```
/references/
  /screenshots/       # Full-page and component screenshots
  /html/             # Extracted HTML files
  /styles/           # Extracted CSS and computed styles
  /manifest.json     # Index of all captured assets with metadata
```

### 3. Feature Discovery
**Priority: High**

Interactive questioning phase to understand the new feature:
- **Feature Description:** What does the feature do? What problem does it solve?
- **UI Location:** Where in the existing platform should this feature appear?
- **User Interactions:** What actions can users take? What's the user flow?

### 4. Prototype Builder
**Priority: High**

Generate working prototypes using:
- Next.js + Tailwind CSS as the tech stack
- shadcn/ui components for consistent UI patterns
- Extracted CSS values (colors, fonts, spacing) from captured references
- vercel-react-best-practices for performance
- web-design-guidelines for accessibility and UX

## Tech Stack

- **Skill Definition:** Markdown file (`.md`) following Claude Code skill format
- **Browser Automation:** Playwright via agent-browser skill
- **Prototype Framework:** Next.js 14+ (App Router)
- **Styling:** Tailwind CSS + shadcn/ui
- **Storage:** Local filesystem (organized folders)
- **Authentication:** Credentials from CLAUDE.md

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    Platform Prototyping Skill                    │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Phase 1: CAPTURE                                                │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐      │
│  │ Read CLAUDE.md│ -> │ agent-browser│ -> │ Store Assets │      │
│  │ (credentials) │    │ (Playwright) │    │ (/references)│      │
│  └──────────────┘    └──────────────┘    └──────────────┘      │
│                                                                  │
│  Phase 2: DISCOVER                                               │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐      │
│  │ AskUserQuestion│ -> │ Analyze Refs │ -> │ Plan Feature │      │
│  │ (feature info) │    │ (match pages)│    │ (components) │      │
│  └──────────────┘    └──────────────┘    └──────────────┘      │
│                                                                  │
│  Phase 3: BUILD                                                  │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐      │
│  │ Scaffold Next│ -> │ Generate UI  │ -> │ Apply Styles │      │
│  │ (if needed)  │    │ (shadcn/ui)  │    │ (from refs)  │      │
│  └──────────────┘    └──────────────┘    └──────────────┘      │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

## Data Model

### Reference Manifest (`/references/manifest.json`)
```json
{
  "platform": {
    "name": "Platform Name",
    "baseUrl": "https://example.com",
    "capturedAt": "2026-01-26T12:00:00Z"
  },
  "pages": [
    {
      "url": "/dashboard",
      "title": "Dashboard",
      "screenshot": "screenshots/dashboard.png",
      "html": "html/dashboard.html",
      "styles": "styles/dashboard.css"
    }
  ],
  "designTokens": {
    "colors": {
      "primary": "#3B82F6",
      "secondary": "#10B981",
      "background": "#FFFFFF",
      "text": "#1F2937"
    },
    "fonts": {
      "heading": "Inter",
      "body": "Inter"
    },
    "spacing": {
      "base": "4px"
    }
  }
}
```

## UI/UX Requirements

### Skill Invocation
- User runs `/prototype` or similar command
- Skill presents clear phase indicators (Capture -> Discover -> Build)
- Progress updates during long-running capture operations

### Generated Prototypes
- Must visually match the captured platform's design language
- Responsive by default (mobile-first)
- Accessible (WCAG 2.1 AA compliance via web-design-guidelines)
- Interactive where appropriate (hover states, transitions)

## Security Considerations

- **Credentials:** Stored in CLAUDE.md, never logged or exposed
- **Captured Assets:** Stored locally, not uploaded anywhere
- **Authentication:** Uses secure Playwright session, credentials not persisted in browser

## Third-Party Integrations

- **agent-browser skill:** For Playwright-based browser automation
- **vercel-react-best-practices skill:** For React/Next.js optimization
- **web-design-guidelines skill:** For accessibility and UX compliance
- **shadcn/ui:** Component library for consistent UI patterns

## Constraints & Assumptions

**Assumptions:**
- User has Claude Code installed and configured
- User can provide valid credentials for authenticated platforms
- Target platform is web-based and accessible via browser
- User has Node.js installed for running Next.js prototypes

**No Major Constraints:**
- Can use any necessary dependencies
- No offline requirement
- Multi-file skill structure allowed

## Success Criteria

1. **End-to-end demo:** Successfully capture a real platform and generate a working feature prototype that visually matches the original
2. **All phases functional:** Each phase (capture, store, discover, build) works independently and can be tested in isolation
3. **User testing:** A product manager can use the skill without technical assistance
4. **Documentation complete:** Clear usage instructions, examples, and troubleshooting guide provided

---

## Task List

```json
[
  {
    "category": "setup",
    "description": "Create the skill file structure and base SKILL.md definition",
    "steps": [
      "Create directory .claude/skills/real-prototypes-skill/",
      "Create SKILL.md with skill metadata and trigger patterns",
      "Define the three-phase workflow structure in the skill"
    ],
    "passes": false
  },
  {
    "category": "feature",
    "description": "Implement Phase 1: Platform Capture with agent-browser integration",
    "steps": [
      "Add instructions to read CLAUDE.md for platform URL and credentials",
      "Add instructions to invoke agent-browser skill for navigation",
      "Define capture workflow: navigate, screenshot, extract HTML/CSS",
      "Add instructions for authenticated page capture"
    ],
    "passes": false
  },
  {
    "category": "feature",
    "description": "Implement Reference Storage with organized folder structure",
    "steps": [
      "Create folder structure: /references/screenshots, /html, /styles",
      "Define manifest.json schema for indexing captured assets",
      "Add instructions to extract and store design tokens (colors, fonts, spacing)",
      "Implement asset organization and naming conventions"
    ],
    "passes": false
  },
  {
    "category": "feature",
    "description": "Implement Phase 2: Feature Discovery with interactive questions",
    "steps": [
      "Add AskUserQuestion calls for feature description",
      "Add questions for UI location within the platform",
      "Add questions for user interactions and flow",
      "Add logic to match feature location to captured reference pages"
    ],
    "passes": false
  },
  {
    "category": "feature",
    "description": "Implement Phase 3: Prototype Builder with Next.js + Tailwind",
    "steps": [
      "Add instructions to scaffold Next.js project if not exists",
      "Add shadcn/ui component initialization",
      "Implement design token extraction from captured CSS",
      "Add tailwind.config.js generation with extracted tokens"
    ],
    "passes": false
  },
  {
    "category": "feature",
    "description": "Implement prototype generation using captured references",
    "steps": [
      "Add instructions to read reference screenshots for visual context",
      "Implement component generation matching platform patterns",
      "Add responsive design implementation",
      "Integrate vercel-react-best-practices for optimization"
    ],
    "passes": false
  },
  {
    "category": "integration",
    "description": "Integrate web-design-guidelines for accessibility",
    "steps": [
      "Add instructions to invoke web-design-guidelines skill",
      "Ensure generated components meet WCAG 2.1 AA",
      "Add semantic HTML requirements",
      "Include keyboard navigation support"
    ],
    "passes": false
  },
  {
    "category": "testing",
    "description": "Create end-to-end test workflow",
    "steps": [
      "Document test scenario with a sample platform",
      "Create test credentials setup in CLAUDE.md",
      "Run full capture -> discover -> build cycle",
      "Verify prototype visually matches captured platform"
    ],
    "passes": false
  },
  {
    "category": "documentation",
    "description": "Write comprehensive usage documentation",
    "steps": [
      "Write README.md with installation and setup instructions",
      "Document CLAUDE.md credential format",
      "Add usage examples for common scenarios",
      "Create troubleshooting guide for common issues"
    ],
    "passes": false
  }
]
```

---

## Agent Instructions

1. Read `activity.md` first to understand current state
2. Find next task with `"passes": false`
3. Complete all steps for that task
4. Verify in browser using agent-browser
5. Update task to `"passes": true`
6. Log completion in `activity.md`
7. Repeat until all tasks pass

**Important:** Only modify the `passes` field. Do not remove or rewrite tasks.

---

## Completion Criteria
All tasks marked with `"passes": true`
