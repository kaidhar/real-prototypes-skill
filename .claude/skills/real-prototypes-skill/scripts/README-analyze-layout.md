# Layout & Component Structure Analysis

## Overview

`analyze-layout.js` is a comprehensive script that analyzes captured web pages to extract:

1. **Layout Patterns**: Grid systems, flexbox usage, positioning, container widths
2. **Component Patterns**: Buttons, forms, cards, modals, navigation, tables
3. **HTML Structure**: Semantic HTML with bounding boxes and element hierarchy
4. **UI Library Detection**: Material-UI, Ant Design, Bootstrap, Tailwind, Chakra UI, etc.
5. **Landmarks**: Header, navigation, main, aside, footer elements

## Installation

Requires Playwright:

```bash
npm install playwright
```

## Usage

### Basic Usage

```bash
# Analyze all captured pages in references directory
node analyze-layout.js

# Specify custom paths
node analyze-layout.js /path/to/references /path/to/output.json
```

### Arguments

1. **references-dir** (optional): Path to references directory containing `html/` and `screenshots/` folders
   - Default: `../../../references`

2. **output-file** (optional): Path to output structure manifest JSON file
   - Default: `{references-dir}/structure-manifest.json`

## Output Files

### 1. structure-manifest.json

Main output file containing aggregated analysis from all pages:

```json
{
  "generatedAt": "2026-01-26T10:00:00Z",
  "pagesAnalyzed": 14,
  "layout": {
    "type": "sidebar-main",
    "sidebar": {
      "width": "240px",
      "position": "fixed",
      "top": "0px",
      "left": "0px",
      "boundingBox": {
        "x": 0,
        "y": 0,
        "width": 240,
        "height": 1080
      }
    },
    "grid": {
      "columns": "repeat(12, 1fr)",
      "gap": "24px"
    },
    "flex": {
      "direction": "row",
      "justifyContent": "space-between",
      "alignItems": "center",
      "gap": "16px"
    },
    "containers": {
      "maxWidth": "1600px"
    }
  },
  "components": {
    "button": {
      "totalCount": 45,
      "variants": {
        "primary": {
          "count": 20,
          "example": { ... }
        },
        "secondary": {
          "count": 15,
          "example": { ... }
        },
        "ghost": {
          "count": 10,
          "example": { ... }
        }
      },
      "examples": [ ... ]
    },
    "card": { ... },
    "input": { ... }
  },
  "library": "material-ui",
  "commonPatterns": {}
}
```

### 2. component-map-{page}.json

Per-page component mapping files:

```json
{
  "page": "dashboard",
  "layout": {
    "type": "sidebar-main",
    "sidebar": { ... },
    "header": { ... },
    "footer": { ... }
  },
  "components": {
    "button": {
      "count": 5,
      "variants": [ ... ],
      "examples": [ ... ]
    }
  },
  "library": {
    "primary": "material-ui",
    "detected": ["material-ui"]
  },
  "landmarks": {
    "header": { ... },
    "navigation": [ ... ],
    "main": { ... },
    "aside": [ ... ],
    "footer": { ... }
  }
}
```

## Features

### Layout Detection

- **Layout Type**: Detects common patterns (sidebar-main, single-main)
- **Grid Systems**: Extracts grid-template-columns, gap, etc.
- **Flexbox**: Extracts direction, justify-content, align-items, gap
- **Positioning**: Detects fixed, sticky, absolute elements with coordinates
- **Containers**: Finds max-width, padding, margin patterns
- **Sidebar/Header/Footer**: Extracts dimensions and positioning

### Component Detection

Detects and analyzes:
- **Buttons**: Variants (primary, secondary, ghost), sizes (sm, md, lg)
- **Inputs**: Text inputs, textareas, selects, contenteditable
- **Cards**: Panel components with padding, borders, shadows
- **Modals**: Dialog components with overlay positioning
- **Navigation**: Nav bars, sidebars, dropdown menus
- **Tables**: Data tables with headers, rows, sorting
- **Forms**: Form elements with labels, validation

For each component type:
- **Count**: Total instances found
- **Variants**: Different style variants detected
- **Styles**: Padding, margin, border, colors, fonts, shadows
- **Bounding Box**: Position and dimensions
- **Attributes**: ARIA labels, roles, data attributes

### UI Library Detection

Detects popular UI frameworks:
- **Material-UI**: Looks for `Mui*` classes, `@mui/` imports
- **Ant Design**: Looks for `ant-*` classes, `anticon`
- **Bootstrap**: Looks for `btn`, `card`, `container`, `row`, `col-*`
- **Tailwind CSS**: Looks for utility classes (`flex`, `grid`, `p-*`, `m-*`)
- **Chakra UI**: Looks for `chakra-*` classes
- **Semantic UI**: Looks for `ui *` classes
- **Custom**: If no framework detected

### HTML Structure Extraction

- Preserves semantic HTML tags
- Captures class names and IDs
- Extracts ARIA attributes
- Extracts data attributes
- Maps element hierarchy (up to 10 levels deep)
- Includes bounding boxes for all elements

### Landmark Extraction

Identifies key page regions:
- **Header**: `<header>` or `role="banner"`
- **Navigation**: `<nav>` or `role="navigation"`
- **Main**: `<main>` or `role="main"`
- **Aside**: `<aside>` or `role="complementary"`
- **Footer**: `<footer>` or `role="contentinfo"`

## Example Output

### Console Output

```
🔍 Analyzing layout and component structure...
References: /path/to/references
Output: /path/to/references/structure-manifest.json

📄 Found 14 pages to analyze

Analyzing: dashboard...
  ✓ Layout: sidebar-main
  ✓ Library: material-ui
  ✓ Components: 7 types detected
  ✓ Component map saved: /path/to/references/component-map-dashboard.json

Analyzing: settings...
  ✓ Layout: sidebar-main
  ✓ Library: material-ui
  ✓ Components: 5 types detected
  ✓ Component map saved: /path/to/references/component-map-settings.json

...

📦 Generating structure manifest...

✅ Analysis complete!

Structure manifest: /path/to/references/structure-manifest.json
Pages analyzed: 14
Primary layout: sidebar-main
UI library: material-ui
Component types: button, input, card, modal, navigation, table, form

📊 Component Summary:
  button: 45 instances
    Variants: primary, secondary, ghost
  input: 28 instances
    Variants: default
  card: 12 instances
    Variants: default
  navigation: 2 instances
    Variants: default
  table: 5 instances
    Variants: default

💡 Next steps:
  1. Review structure-manifest.json for layout patterns
  2. Review component-map-*.json for per-page component details
  3. Use this data to generate pixel-perfect prototypes
```

## Use Cases

### 1. Prototype Generation

Use the structure manifest to generate components that match the original platform:

```javascript
// Read structure manifest
const manifest = JSON.parse(fs.readFileSync('references/structure-manifest.json', 'utf-8'));

// Get button variants
const buttonVariants = manifest.components.button.variants;

// Generate matching Button component
generateButtonComponent(buttonVariants);
```

### 2. Design System Extraction

Extract design tokens from component styles:

```javascript
const manifest = JSON.parse(fs.readFileSync('references/structure-manifest.json', 'utf-8'));

// Extract colors from primary buttons
const primaryButton = manifest.components.button.variants.primary.example;
const primaryColor = primaryButton.styles.backgroundColor;

// Extract spacing from cards
const card = manifest.components.card.examples[0];
const cardPadding = card.styles.padding;
```

### 3. Layout Recreation

Recreate the exact layout structure:

```javascript
const manifest = JSON.parse(fs.readFileSync('references/structure-manifest.json', 'utf-8'));

// Get layout configuration
const layout = manifest.layout;

// Generate layout component
if (layout.type === 'sidebar-main') {
  generateSidebarLayout(layout.sidebar, layout.containers);
}
```

### 4. Component Library Detection

Determine what UI library to use:

```javascript
const manifest = JSON.parse(fs.readFileSync('references/structure-manifest.json', 'utf-8'));

if (manifest.library === 'material-ui') {
  console.log('Use @mui/material components');
} else if (manifest.library === 'custom') {
  console.log('Build custom components from scratch');
}
```

## Integration with Prototype Generation

This script is designed to work with the Platform Prototype Skill:

1. **Capture Phase**: Run `full-site-capture.js` to capture platform pages
2. **Analysis Phase**: Run `analyze-layout.js` to analyze structure ← **YOU ARE HERE**
3. **Generation Phase**: Use structure manifest to generate prototypes

## Troubleshooting

### Error: References directory not found

```bash
❌ Error: References directory not found at /path/to/references
Run full-site-capture.js first to capture pages.
```

**Solution**: Run `full-site-capture.js` first to capture platform pages.

### Error: No HTML files found to analyze

```bash
❌ Error: No HTML files found to analyze
```

**Solution**: Ensure the `html/` subdirectory exists and contains `.html` files.

### Browser Launch Errors

If Playwright fails to launch:

```bash
# Install browsers
npx playwright install chromium
```

## Advanced Configuration

### Custom Component Patterns

Modify `COMPONENT_PATTERNS` in the script to detect custom component types:

```javascript
const COMPONENT_PATTERNS = {
  // Add custom pattern
  dropdown: {
    selectors: ['.dropdown', '[role="listbox"]'],
    attributes: ['aria-expanded', 'aria-controls'],
  },
  // ... other patterns
};
```

### Custom UI Library Detection

Add custom library patterns to `UI_LIBRARY_PATTERNS`:

```javascript
const UI_LIBRARY_PATTERNS = {
  // Add custom library
  'my-ui-lib': [
    /myui-/,
    /@myui\//,
  ],
  // ... other libraries
};
```

## Performance

- **Speed**: ~2-3 seconds per page
- **Memory**: ~100MB per page
- **Output Size**: ~50-200KB per page JSON

For large sites (50+ pages), expect:
- Runtime: 2-5 minutes
- Total output: 5-10MB

## Next Steps

After running this script:

1. Review `structure-manifest.json` to understand overall platform patterns
2. Review individual `component-map-*.json` files for page-specific details
3. Use the data to inform prototype generation
4. Run `extract-tokens.js` to extract detailed design tokens
5. Generate Tailwind config with `generate-tailwind-config.js`

## See Also

- `full-site-capture.js` - Capture platform pages
- `extract-tokens.js` - Extract design tokens
- `generate-tailwind-config.js` - Generate Tailwind configuration
- `create-manifest.js` - Create page manifest
