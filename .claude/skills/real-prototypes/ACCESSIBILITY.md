# Accessibility Quick Reference

## WCAG 2.1 AA Compliance Guide

This guide provides quick reference for ensuring all generated prototypes meet accessibility standards.

---

## Quick Start

### 1. Run Validation

```bash
cd prototype
npm run validate:a11y
```

### 2. Review Reports

- **JSON Report:** `references/accessibility-report.json` - Machine-readable
- **Markdown Docs:** `references/accessibility-fixes.md` - Human-readable

### 3. Fix Issues

See "Common Fixes" section below

### 4. Re-validate

```bash
npm run validate:a11y
```

---

## WCAG 2.1 AA Requirements

### Color Contrast

| Text Type | Minimum Ratio | Example |
|-----------|---------------|---------|
| Normal text (< 18pt) | 4.5:1 | Black on white: 21:1 ✅ |
| Large text (≥ 18pt or ≥ 14pt bold) | 3.0:1 | Gray on white: 3.5:1 ✅ |
| UI components | 3.0:1 | Border contrast |

**Tool:** [WebAIM Contrast Checker](https://webaim.org/resources/contrastchecker/)

### Keyboard Navigation

**Requirements:**
- All interactive elements keyboard accessible
- Logical tab order
- No keyboard traps
- Visible focus indicators

**Keys:**
- `Tab` - Navigate forward
- `Shift+Tab` - Navigate backward
- `Enter/Space` - Activate buttons/links
- `Escape` - Close modals/dialogs
- `Arrow keys` - Navigate menus/tabs

### ARIA Labels

**All interactive elements need accessible names:**

| Element | Required |
|---------|----------|
| Button with text | Text content |
| Icon button | `aria-label` |
| Link | Text content or `aria-label` |
| Form input | Associated `<label>` or `aria-label` |
| Custom widget | Appropriate ARIA role and attributes |

### Focus Indicators

**Requirements:**
- Visible on all focusable elements
- Minimum 3:1 contrast with background
- Not removed unless replaced

**Tailwind pattern:**
```typescript
focus:ring-2 focus:ring-platform-primary focus:ring-offset-2
```

### Semantic HTML

**Use proper elements:**
- `<button>` for buttons (not `<div onClick>`)
- `<a href>` for links
- `<h1>` to `<h6>` for headings (maintain hierarchy)
- `<nav>`, `<main>`, `<footer>` for landmarks
- `<ul>`, `<ol>` for lists
- `<table>` for tabular data

---

## Common Fixes

### Fix 1: Low Contrast Text

**Problem:**
```typescript
<p className="text-gray-400">Low contrast</p>
// Contrast: 2.8:1 ❌
```

**Solution:**
```typescript
<p className="text-gray-600">Improved contrast</p>
// Contrast: 4.6:1 ✅
// Visual change: ~5% darker
```

---

### Fix 2: Missing Focus Indicator

**Problem:**
```typescript
<button className="bg-blue-500 text-white">
  Click me
</button>
// No visible focus state ❌
```

**Solution:**
```typescript
<button className="bg-blue-500 text-white focus:ring-2 focus:ring-blue-600 focus:ring-offset-2">
  Click me
</button>
// Visible focus ring ✅
```

---

### Fix 3: Icon Button Without Label

**Problem:**
```typescript
<button>
  <IconX />
</button>
// No accessible name ❌
```

**Solution:**
```typescript
<button aria-label="Close dialog">
  <IconX aria-hidden="true" />
</button>
// Screen reader announces "Close dialog" ✅
```

---

### Fix 4: Unlabeled Form Input

**Problem:**
```typescript
<label>Email</label>
<input type="email" />
// Not programmatically associated ❌
```

**Solution:**
```typescript
<label htmlFor="email">Email</label>
<input
  id="email"
  type="email"
  aria-required="true"
/>
// Associated via htmlFor/id ✅
```

---

### Fix 5: Non-semantic Interactive Element

**Problem:**
```typescript
<div onClick={handleClick}>
  Click me
</div>
// Not keyboard accessible ❌
```

**Solution:**
```typescript
<button onClick={handleClick}>
  Click me
</button>
// Keyboard accessible ✅
```

---

### Fix 6: Missing Alt Text

**Problem:**
```typescript
<img src="logo.png" />
// Missing alt ❌
```

**Solution (decorative):**
```typescript
<img src="logo.png" alt="" />
// Empty alt for decorative ✅
```

**Solution (meaningful):**
```typescript
<img src="chart.png" alt="Sales growth chart showing 25% increase in Q4" />
// Descriptive alt text ✅
```

---

### Fix 7: Form Validation Without ARIA

**Problem:**
```typescript
<input type="email" />
{error && <p>{error}</p>}
// Error not linked to input ❌
```

**Solution:**
```typescript
<input
  type="email"
  aria-invalid={!!error}
  aria-describedby={error ? "email-error" : undefined}
/>
{error && (
  <p id="email-error" role="alert">
    {error}
  </p>
)}
// Error announced by screen reader ✅
```

---

### Fix 8: Heading Hierarchy Skip

**Problem:**
```typescript
<h1>Main Title</h1>
<h3>Subtitle</h3>
// Skips h2 ❌
```

**Solution:**
```typescript
<h1>Main Title</h1>
<h2>Subtitle</h2>
// Proper hierarchy ✅
```

---

## Color Adjustment Strategy

When fixing contrast issues, follow these steps:

### Step 1: Measure Current Contrast

Use browser DevTools or WebAIM Contrast Checker

### Step 2: Determine Required Ratio

- Normal text: 4.5:1
- Large text: 3.0:1
- UI components: 3.0:1

### Step 3: Adjust Minimally

**Goal:** Meet requirements with < 5% visual change

**Tailwind adjustment examples:**
```typescript
// Too light
text-gray-300 → text-gray-400 (one step darker)
text-gray-400 → text-gray-500 (one step darker)

// Too dark
text-gray-700 → text-gray-600 (one step lighter)
text-gray-800 → text-gray-700 (one step lighter)
```

### Step 4: Re-test

Verify new contrast ratio meets requirements

### Step 5: Document

Add note to `accessibility-fixes.md` explaining the change

---

## ESLint Rules

### Most Common Issues Caught

1. **jsx-a11y/alt-text**
   - Missing alt on images
   - Fix: Add `alt=""` (decorative) or descriptive text

2. **jsx-a11y/click-events-have-key-events**
   - Click handler without keyboard handler
   - Fix: Add `onKeyDown` or use `<button>`

3. **jsx-a11y/label-has-associated-control**
   - Form input without label
   - Fix: Add `htmlFor` to label or `aria-label` to input

4. **jsx-a11y/no-static-element-interactions**
   - Interactive div/span
   - Fix: Use `<button>` or add `role` and keyboard handlers

5. **jsx-a11y/anchor-is-valid**
   - Link without href or with invalid href
   - Fix: Add valid `href` or use `<button>`

### Running ESLint

```bash
# Check all files
npm run lint:a11y

# Check specific file
npx eslint src/components/MyComponent.tsx

# Auto-fix where possible
npx eslint src/components/MyComponent.tsx --fix
```

---

## Testing Checklist

### Automated Tests

- [ ] Run `npm run validate:a11y` - passes with 0 errors
- [ ] Run `npm run lint:a11y` - no accessibility warnings
- [ ] Lighthouse audit - score ≥ 90
- [ ] axe DevTools - no violations

### Manual Keyboard Tests

- [ ] Tab through all interactive elements
- [ ] All elements reachable via keyboard
- [ ] Focus indicators clearly visible
- [ ] Logical tab order
- [ ] Enter/Space activates buttons and links
- [ ] Escape closes modals and dialogs
- [ ] No keyboard traps

### Screen Reader Tests

**Windows (NVDA):**
- [ ] Install [NVDA](https://www.nvaccess.org/)
- [ ] Start NVDA
- [ ] Navigate page with Tab
- [ ] Verify all content announced
- [ ] Verify form labels read
- [ ] Verify button purposes clear

**Mac (VoiceOver):**
- [ ] Press Cmd+F5 to start VoiceOver
- [ ] Press Ctrl+Option+Arrow to navigate
- [ ] Verify all content announced
- [ ] Verify form labels read
- [ ] Verify button purposes clear

### Visual Tests

- [ ] Zoom to 200% - content reflows properly
- [ ] Resize to 320px width - no horizontal scroll
- [ ] Test with color blindness simulator
- [ ] Verify focus indicators visible
- [ ] Check contrast with DevTools

---

## Browser DevTools

### Chrome/Edge Accessibility Panel

1. Open DevTools (F12)
2. Go to "Lighthouse" tab
3. Select "Accessibility"
4. Click "Generate report"

**Or use Accessibility tree:**
1. DevTools → Elements tab
2. Click "Accessibility" in right sidebar
3. Inspect element accessibility properties

### Firefox Accessibility Inspector

1. Open DevTools (F12)
2. Go to "Accessibility" tab
3. Enable inspector
4. Click elements to see accessibility info

---

## Resources

### WCAG Guidelines
- [WCAG 2.1 Quick Reference](https://www.w3.org/WAI/WCAG21/quickref/)
- [Understanding WCAG 2.1](https://www.w3.org/WAI/WCAG21/Understanding/)
- [WCAG Techniques](https://www.w3.org/WAI/WCAG21/Techniques/)

### Testing Tools
- [WebAIM Contrast Checker](https://webaim.org/resources/contrastchecker/)
- [WAVE Browser Extension](https://wave.webaim.org/extension/)
- [axe DevTools](https://www.deque.com/axe/devtools/)
- [Accessibility Insights](https://accessibilityinsights.io/)
- [Lighthouse](https://developers.google.com/web/tools/lighthouse)

### Learning Resources
- [Web Accessibility Initiative (WAI)](https://www.w3.org/WAI/)
- [A11y Project](https://www.a11yproject.com/)
- [WebAIM](https://webaim.org/)
- [Inclusive Components](https://inclusive-components.design/)

### Screen Readers
- [NVDA (Windows)](https://www.nvaccess.org/)
- [VoiceOver (Mac)](https://www.apple.com/accessibility/voiceover/)
- [JAWS (Windows)](https://www.freedomscientific.com/products/software/jaws/)

### Tailwind Accessibility
- [Tailwind Focus Ring](https://tailwindcss.com/docs/ring-width)
- [Tailwind Screen Reader](https://tailwindcss.com/docs/screen-readers)

---

## Component Patterns

### Accessible Button

```typescript
<button
  type="button"
  onClick={handleClick}
  aria-label="Close dialog" // If no visible text
  disabled={isLoading}
  className="bg-platform-primary text-white focus:ring-2 focus:ring-platform-primary focus:ring-offset-2 disabled:opacity-50"
>
  {isLoading ? "Loading..." : "Submit"}
</button>
```

### Accessible Link

```typescript
<a
  href="/path"
  className="text-platform-primary underline focus:ring-2 focus:ring-platform-primary focus:ring-offset-2"
>
  Descriptive link text
</a>
```

### Accessible Form Input

```typescript
<div className="space-y-2">
  <Label htmlFor="email" className="font-medium">
    Email Address
    <span className="text-red-500 ml-1" aria-hidden="true">*</span>
  </Label>
  <Input
    id="email"
    type="email"
    aria-required="true"
    aria-invalid={!!error}
    aria-describedby={error ? "email-error" : undefined}
    className="focus:border-platform-primary focus:ring-platform-primary"
  />
  {error && (
    <p id="email-error" className="text-sm text-red-500" role="alert">
      {error}
    </p>
  )}
</div>
```

### Accessible Modal

```typescript
<div
  role="dialog"
  aria-modal="true"
  aria-labelledby="dialog-title"
  className="fixed inset-0 z-50 flex items-center justify-center"
>
  <div className="bg-white p-6 rounded-lg shadow-xl">
    <h2 id="dialog-title" className="text-xl font-semibold">
      Dialog Title
    </h2>
    <div className="mt-4">
      {/* Dialog content */}
    </div>
    <div className="mt-6 flex justify-end gap-2">
      <button
        onClick={onClose}
        className="focus:ring-2 focus:ring-platform-primary"
      >
        Cancel
      </button>
      <button
        onClick={onConfirm}
        className="bg-platform-primary text-white focus:ring-2 focus:ring-platform-primary focus:ring-offset-2"
      >
        Confirm
      </button>
    </div>
  </div>
</div>
```

### Accessible Data Table

```typescript
<table className="w-full">
  <caption className="sr-only">User list with actions</caption>
  <thead>
    <tr>
      <th scope="col" className="text-left">Name</th>
      <th scope="col" className="text-left">Email</th>
      <th scope="col" className="text-left">Role</th>
      <th scope="col" className="text-right">Actions</th>
    </tr>
  </thead>
  <tbody>
    {users.map(user => (
      <tr key={user.id}>
        <th scope="row" className="font-medium">{user.name}</th>
        <td>{user.email}</td>
        <td>{user.role}</td>
        <td className="text-right space-x-2">
          <button
            aria-label={`Edit ${user.name}`}
            className="focus:ring-2 focus:ring-platform-primary"
          >
            Edit
          </button>
          <button
            aria-label={`Delete ${user.name}`}
            className="focus:ring-2 focus:ring-red-500"
          >
            Delete
          </button>
        </td>
      </tr>
    ))}
  </tbody>
</table>
```

---

## Troubleshooting

### Issue: Validation script not found

**Error:** `Cannot find module 'validate-accessibility.js'`

**Solution:**
```bash
# Run from prototype directory
cd prototype
npm run validate:a11y

# Or use absolute path
node /path/to/.claude/skills/real-prototypes/scripts/validate-accessibility.js .
```

---

### Issue: ESLint not finding jsx-a11y plugin

**Error:** `Failed to load plugin 'jsx-a11y'`

**Solution:**
```bash
# Install dependencies
npm install --save-dev eslint-plugin-jsx-a11y

# Or run integration script
../.claude/skills/real-prototypes/scripts/integrate-accessibility.sh
```

---

### Issue: False positive on contrast

**Problem:** Validator reports contrast issue but it looks fine

**Solution:**
- Use WebAIM Contrast Checker to verify manually
- Check if element uses gradient or image background
- Ensure validator is checking correct colors
- Add exception note in accessibility-fixes.md

---

### Issue: Focus indicator not visible

**Problem:** Added focus ring but can't see it

**Solution:**
```typescript
// Ensure ring-offset for contrast
focus:ring-2 focus:ring-platform-primary focus:ring-offset-2

// Or use outline instead
focus:outline focus:outline-2 focus:outline-platform-primary

// Check if element has position:relative
className="relative ..."
```

---

## Quick Command Reference

```bash
# Validate accessibility
npm run validate:a11y

# Run ESLint
npm run lint:a11y

# Auto-fix ESLint issues
npx eslint . --ext .ts,.tsx --fix

# Run Lighthouse
npx lighthouse http://localhost:3000 --only-categories=accessibility

# Generate report
node scripts/validate-accessibility.js . --verbose > report.txt

# Check specific file
npx eslint src/components/MyComponent.tsx
```

---

## Support

For questions or issues:
1. Check `references/accessibility-fixes.md` for detailed guidance
2. Review `references/accessibility-report.json` for specific issues
3. Consult WCAG 2.1 Quick Reference for guidelines
4. Test with browser DevTools Accessibility panel

---

**Last Updated:** 2026-01-26
**WCAG Version:** 2.1 Level AA
**Maintained by:** Platform Prototyping Skill
