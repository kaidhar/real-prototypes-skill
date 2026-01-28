# Platform Prototyping Skill - Development Prompt

## Project Context

Building a Claude Code skill that enables product managers and developers to rapidly prototype new features for their existing platforms by capturing visual references and generating matching UI.

## Development Server

```bash
# For testing generated prototypes
npm run dev
# or
pnpm dev
```

**Default URL:** http://localhost:3000

## Build & Lint Commands

```bash
# Build the prototype
npm run build

# Lint check
npm run lint

# Type check (if TypeScript)
npx tsc --noEmit
```

## Project Structure

```
.claude/
  skills/
    real-prototypes-skill/
      SKILL.md              # Main skill definition
      README.md             # Usage documentation
references/                 # Captured platform assets (generated)
  screenshots/
  html/
  styles/
  manifest.json
prototype/                  # Generated Next.js prototype (generated)
```

## Key Technologies

- **Skill Framework:** Claude Code Skills (SKILL.md format)
- **Browser Automation:** Playwright via agent-browser skill
- **Prototype Stack:** Next.js 14+, Tailwind CSS, shadcn/ui
- **Design Skills:** vercel-react-best-practices, web-design-guidelines

## Development Guidelines

### Skill Development
1. Follow Claude Code skill format conventions
2. Use AskUserQuestion for interactive discovery
3. Leverage existing skills (agent-browser, design guidelines)
4. Store captured assets in organized /references folder

### Prototype Generation
1. Match captured platform's design tokens exactly
2. Use shadcn/ui for consistent component patterns
3. Ensure responsive design (mobile-first)
4. Follow accessibility guidelines (WCAG 2.1 AA)

## Testing

1. **Skill Testing:** Run `/prototype` command in Claude Code
2. **Prototype Testing:** `npm run dev` and verify in browser
3. **Visual Comparison:** Compare generated UI to captured screenshots

## Special Considerations

- Credentials are stored in CLAUDE.md - never log or expose them
- Captured assets stay local - no external uploads
- Generated prototypes should be self-contained and runnable
