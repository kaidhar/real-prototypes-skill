# Layout Analysis - Quick Start Guide

## 1-Minute Quick Start

```bash
# Run analysis
node .claude/skills/real-prototypes-skill/scripts/analyze-layout.js references

# Verify output
./.claude/skills/real-prototypes-skill/scripts/verify-layout-analysis.sh references

# Test and view insights
node .claude/skills/real-prototypes-skill/scripts/test-analyze-layout.js references
```

**Output**: `structure-manifest.json` + 14 `component-map-*.json` files

---

## What It Does

Analyzes captured HTML pages to extract:

- **Layout**: Grid, flex, positioning, containers, sidebar, header, footer
- **Components**: Buttons, inputs, cards, modals, navigation, tables, forms
- **HTML**: Semantic structure, classes, ARIA, data attributes, bounding boxes
- **UI Library**: Material-UI, Ant Design, Bootstrap, Tailwind, Chakra, or custom

---

## Key Files

| File | Purpose | Size |
|------|---------|------|
| `analyze-layout.js` | Main analysis script | 26KB |
| `test-analyze-layout.js` | Test/validation script | 11KB |
| `verify-layout-analysis.sh` | Automated verification | 1KB |
| `README-analyze-layout.md` | Full documentation | 11KB |

---

## Output Files

| File | Contains |
|------|----------|
| `references/structure-manifest.json` | Aggregated analysis of all pages |
| `references/component-map-{page}.json` | Per-page component details (14 files) |

---

## Example Results (Sprouts ABM)

- **Pages**: 14
- **UI Library**: Material-UI
- **Components**: 1,292 instances
  - 894 tables
  - 185 cards
  - 141 buttons
  - 72 inputs

---

## Use Cases

### 1. Detect UI Framework
```javascript
const manifest = require('./references/structure-manifest.json');
console.log(manifest.library); // "material-ui"
```

### 2. Get Component Styles
```javascript
const manifest = require('./references/structure-manifest.json');
const buttonStyles = manifest.components.button.examples[0].styles;
// { backgroundColor: "rgb(99, 102, 241)", padding: "8px 16px", ... }
```

### 3. Recreate Layout
```javascript
const manifest = require('./references/structure-manifest.json');
const layoutType = manifest.layout.type; // "sidebar-main"
const sidebarWidth = manifest.layout.sidebar.width; // "240px"
```

### 4. Extract Design Tokens
```bash
# Run test script to extract colors, fonts, spacing
node test-analyze-layout.js references
```

---

## Integration Workflow

```
1. CAPTURE  → full-site-capture.js (captures pages)
2. ANALYZE  → analyze-layout.js (analyzes structure) ← YOU ARE HERE
3. EXTRACT  → extract-all-styles.js (extracts CSS)
4. GENERATE → Use both outputs to generate prototype
```

---

## Troubleshooting

**Error: References directory not found**
```bash
# Run capture first
node .claude/skills/real-prototypes-skill/scripts/full-site-capture.js
```

**Error: No HTML files found**
```bash
# Check html/ directory exists
ls references/html/
```

**Browser launch fails**
```bash
# Install Playwright browsers
npx playwright install chromium
```

---

## Next Steps

1. Review `references/structure-manifest.json`
2. Check `references/component-map-*.json` for page details
3. Run style extraction: `node scripts/extract-all-styles.js`
4. Use outputs to generate pixel-perfect prototypes

---

## Documentation

- **Full Docs**: `README-analyze-layout.md`
- **Summary**: `/LAYOUT-ANALYSIS-SUMMARY.md`
- **Main README**: `/scripts/README.md`

---

## Key Metrics

- **Runtime**: ~45 seconds for 14 pages
- **Output**: ~255KB total
- **Components**: 1,292 cataloged
- **Success Rate**: 100%
