# Capture Configuration Schema

The capture configuration file defines how the platform capture engine discovers, authenticates, and captures pages from a target platform.

## Complete Example

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
      "emailField": "Email",
      "emailSelector": "#email",
      "passwordField": "Password",
      "passwordSelector": "#password",
      "submitButton": "Sign in",
      "submitSelector": "button[type='submit']"
    },
    "successUrl": "/dashboard",
    "waitAfterLogin": 3000
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
    "include": ["/settings", "/profile"],
    "exclude": ["/logout", "/signout", "/delete"],
    "waitAfterLoad": 2000,
    "waitAfterInteraction": 1000
  },
  "output": {
    "directory": "./references",
    "screenshots": true,
    "html": true,
    "designTokens": true
  },
  "validation": {
    "minPages": 5,
    "minColors": 10,
    "requireDetailPages": true,
    "requireAllTabs": true
  }
}
```

## Schema Reference

### `platform` (required)

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | string | Yes | Human-readable name of the platform |
| `baseUrl` | string | Yes | Base URL of the platform (e.g., `https://app.example.com`) |

### `auth`

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `type` | string | No | `"form"` | Authentication type: `"form"`, `"none"`, or `"oauth"` |
| `loginUrl` | string | No | `"/login"` | Path to the login page |
| `credentials` | object | No | - | Login form configuration (see below) |
| `successUrl` | string | No | - | URL pattern to verify successful login |
| `waitAfterLogin` | number | No | `3000` | Milliseconds to wait after login attempt |

#### `auth.credentials`

| Field | Type | Description |
|-------|------|-------------|
| `emailField` | string | Label text for email/username field (e.g., `"Email"`) |
| `emailSelector` | string | CSS selector for email field (e.g., `"#email"`, `"[name='email']"`) |
| `passwordField` | string | Label text for password field |
| `passwordSelector` | string | CSS selector for password field |
| `submitButton` | string | Text on submit button (e.g., `"Sign in"`) |
| `submitSelector` | string | CSS selector for submit button |

**Note:** You can use either `*Field` (label-based) or `*Selector` (CSS-based) fields. CSS selectors are more reliable for complex forms.

### `capture`

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `mode` | string | `"auto"` | `"auto"` (discover all), `"manual"` (only include list), `"hybrid"` (both) |
| `maxPages` | number | `100` | Maximum pages to capture |
| `maxDepth` | number | `5` | Maximum link depth to follow |
| `viewports` | array | Desktop only | List of viewport configurations |
| `interactions` | object | All true | Which interactive elements to capture |
| `include` | array | `[]` | URL paths to always include (for manual/hybrid mode) |
| `exclude` | array | Common logout paths | URL patterns to skip |
| `waitAfterLoad` | number | `2000` | Ms to wait after page load |
| `waitAfterInteraction` | number | `1000` | Ms to wait after clicking elements |

**Backwards compatibility:** `manualPages` is accepted as an alias for `include`.

#### `capture.viewports[]`

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | string | Yes | Viewport name (used in filename) |
| `width` | number | Yes | Viewport width in pixels |
| `height` | number | Yes | Viewport height in pixels |

#### `capture.interactions`

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `clickButtons` | boolean | `true` | Capture button click states |
| `clickDropdowns` | boolean | `true` | Open and capture dropdowns |
| `clickTabs` | boolean | `true` | Click through tab interfaces |
| `clickTableRows` | boolean | `true` | Click table rows to discover detail pages |
| `clickModals` | boolean | `true` | Open and capture modals |

### `output`

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `directory` | string | `"./references"` | Output directory for captured assets |
| `screenshots` | boolean | `true` | Capture PNG screenshots |
| `html` | boolean | `true` | Capture raw HTML |
| `designTokens` | boolean | `true` | Extract design tokens (colors, fonts) |

### `validation`

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `minPages` | number | `5` | Minimum pages required for valid capture |
| `minColors` | number | `10` | Minimum colors to extract |
| `requireDetailPages` | boolean | `true` | Require detail pages for list views |
| `requireAllTabs` | boolean | `true` | Require all tabs to be captured |

## Environment Variables

Credentials can be provided via environment variables instead of config:

```bash
export PLATFORM_EMAIL=user@example.com
export PLATFORM_PASSWORD=secretpassword
```

These override any values in the config file.

## Selector Strategy

The capture engine tries selectors in this order:

1. **Explicit CSS selector** (`emailSelector`, `passwordSelector`, `submitSelector`)
2. **Snapshot refs** (automatically detected from page structure)
3. **Label text** (`emailField`, `passwordField`)
4. **Common patterns** (input types, common IDs)

For best results on complex forms, provide explicit CSS selectors.
