# Design Tokens Schema

The `design-tokens.json` file contains colors, fonts, and other design values extracted from captured HTML. This file is essential for generating prototypes that match the original platform's visual design.

## Complete Example

```json
{
  "extractedAt": "2024-01-15T10:30:00.000Z",
  "totalColorsFound": 47,
  "colors": {
    "primary": "#1a73e8",
    "secondary": "#5f6368",
    "background": {
      "white": "#ffffff",
      "light": "#f8f9fa",
      "dark": "#202124"
    },
    "text": {
      "primary": "#202124",
      "secondary": "#5f6368",
      "disabled": "#9aa0a6"
    },
    "border": {
      "default": "#dadce0",
      "focus": "#1a73e8"
    },
    "status": {
      "success": "#1e8e3e",
      "warning": "#f9ab00",
      "error": "#d93025",
      "info": "#1a73e8"
    }
  },
  "fonts": {
    "families": [
      "Google Sans",
      "Roboto",
      "Arial",
      "sans-serif"
    ],
    "primary": "Google Sans"
  },
  "rawColors": [
    ["#ffffff", 245],
    ["#1a73e8", 89],
    ["#202124", 76],
    ["#f8f9fa", 54],
    ["#5f6368", 43],
    ["#dadce0", 38],
    ["#1e8e3e", 12],
    ["#d93025", 8]
  ]
}
```

## Schema Reference

### Root Object

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `extractedAt` | string | Yes | ISO 8601 timestamp of extraction |
| `totalColorsFound` | number | **Yes** | Total unique colors found (used for validation) |
| `colors` | object | Yes | Categorized color palette |
| `fonts` | object | Yes | Font information |
| `rawColors` | array | No | All colors sorted by frequency |

### `colors`

Categorized color values. All values are hex color strings (e.g., `"#1a73e8"`).

| Field | Type | Description |
|-------|------|-------------|
| `primary` | string | Primary brand/accent color |
| `secondary` | string | Secondary accent color |
| `background` | object | Background colors |
| `text` | object | Text colors |
| `border` | object | Border colors |
| `status` | object | Status/feedback colors |

#### `colors.background`

| Field | Description |
|-------|-------------|
| `white` | Pure white or near-white background |
| `light` | Light gray background (cards, sections) |
| `dark` | Dark background (dark mode, headers) |

#### `colors.text`

| Field | Description |
|-------|-------------|
| `primary` | Main body text color |
| `secondary` | Subdued text (captions, labels) |
| `disabled` | Disabled/placeholder text |

#### `colors.border`

| Field | Description |
|-------|-------------|
| `default` | Standard border color |
| `focus` | Focus state border color |

#### `colors.status`

| Field | Description |
|-------|-------------|
| `success` | Success/positive actions (green) |
| `warning` | Warning states (yellow/orange) |
| `error` | Error/destructive actions (red) |
| `info` | Informational messages (blue) |

### `fonts`

| Field | Type | Description |
|-------|------|-------------|
| `families` | array | List of font families found |
| `primary` | string | Most commonly used font family |

### `rawColors`

Array of `[color, count]` tuples, sorted by frequency (most common first).

```json
[
  ["#ffffff", 245],  // white appeared 245 times
  ["#1a73e8", 89],   // primary blue appeared 89 times
  ...
]
```

## Validation Requirements

For validation to pass:

1. **`totalColorsFound` must be >= 10** (default minimum)
2. **`colors.primary` should be identified** (warning if missing)
3. **File must exist** at `references/design-tokens.json`

## Color Categorization Logic

Colors are automatically categorized based on:

- **Primary**: First blue-dominant color with high frequency
- **Background**: Colors with luminance > 0.8
- **Text**: Colors with luminance < 0.5
- **Status colors**: Based on RGB dominance (red=error, green=success)

## Usage in Prototype Generation

When generating prototypes:

1. **Use ONLY colors from this file** - Never use Tailwind defaults
2. **Reference by category** - Use `colors.primary`, `colors.text.primary`, etc.
3. **Inline styles for custom colors** - Tailwind custom colors may not work reliably

Example Tailwind config extension:

```javascript
// tailwind.config.js
module.exports = {
  theme: {
    extend: {
      colors: {
        primary: '#1a73e8',
        'text-primary': '#202124',
        'text-secondary': '#5f6368',
        'bg-light': '#f8f9fa',
        // ... other colors from design-tokens.json
      }
    }
  }
}
```

Or use inline styles:

```jsx
<button style={{ backgroundColor: '#1a73e8', color: '#ffffff' }}>
  Submit
</button>
```
