# Real-Prototypes Skill - Optimization Checklist

**Document Version:** 1.0  
**Date:** 2026-01-28  
**Status:** Identified Issues - Awaiting Implementation

---

## Executive Summary

This document outlines critical bugs, missing features, and improvements needed for the real-prototypes-skill skill. Issues are prioritized by severity and impact on user experience.

**Overall Health:** 🟡 **Sprint 1 completed - Core functionality improved**

**Key Metrics:**
- 🐛 **11 Major Bugs** identified (6 fixed in Sprint 1)
- 📝 **8 Documentation Gaps** found (4 addressed in Sprint 1)
- ✨ **6 Missing Features** from spec (1 verified already working)
- 🎯 **25 Total Items** to address

**Sprint 1 Completed Items:**
- [x] 1.1 Authentication system - Now uses agent-browser refs for unambiguous targeting
- [x] 1.2 Config schema inconsistencies - Both old and new field names supported
- [x] 1.4 Validation crashes - Safe null checking added
- [x] 2.1 Error messages - Detailed troubleshooting info included
- [x] 2.3 Progress indicators - Spinners and progress bars added
- [x] 3.1 Multiple viewports - Verified already working
- [x] 4.1 Schema documentation - Complete docs created
- [x] 4.2 Troubleshooting guide - Created at docs/TROUBLESHOOTING.md

---

## Priority 1: Critical Blockers 🔥

These issues completely block core functionality and must be fixed immediately.

### 1.1 Authentication System Failure

**Status:** ✅ COMPLETED (Sprint 1)  
**Impact:** Users cannot capture authenticated platforms  
**Effort:** Medium (2-3 days)

**Problem:**
- [ ] Selector system uses `getByLabel()` which matches wrong elements (e.g., password toggle button instead of input)
- [ ] `getByText()` causes strict mode violations when text appears multiple times
- [ ] Custom selectors in config (`emailSelector`, `passwordSelector`, `submitSelector`) are completely ignored
- [ ] Only accepts label text, not CSS selectors or other strategies

**Current Code (Broken):**
```javascript
// capture-engine.js:147-156
const emailField = auth.credentials?.emailField || 'email';
this.browser(`find label "${emailField}" fill "${email}"`);
```

**Proposed Fix:**
```javascript
// Support multiple selector strategies
const strategies = [
  { type: 'css', selector: auth.credentials?.emailSelector },
  { type: 'label', text: auth.credentials?.emailField },
  { type: 'placeholder', text: emailField },
  { type: 'name', attr: emailField }
];

for (const strategy of strategies) {
  try {
    if (strategy.selector) {
      await this.fillBySelectorStrategy(strategy);
      break;
    }
  } catch (e) {
    continue;
  }
}
```

**Files to Modify:**
- `capture/capture-engine.js` (lines 128-166)
- `capture/auth-strategies.js` (new file)

**Tests Needed:**
- [ ] Login with label-based forms
- [ ] Login with placeholder-based forms
- [ ] Login with CSS selector-based forms
- [ ] Login with aria-label forms
- [ ] Handle "Sign in" text in multiple places
- [ ] Handle password visibility toggle buttons

---

### 1.2 Configuration Schema Inconsistencies

**Status:** ✅ COMPLETED (Sprint 1)  
**Impact:** User configs are silently ignored  
**Effort:** Small (1 day)

**Problem:**
- [ ] Documentation says `manualPages` but code reads `include`
- [ ] Documentation says `emailSelector` but code reads `emailField`
- [ ] No validation warns when unknown fields are used
- [ ] Users waste time writing configs that don't work

**Current Mismatches:**

| Documentation | Code Reality | Result |
|---------------|--------------|--------|
| `manualPages` | `include` | Ignored |
| `emailSelector` | `emailField` | Ignored |
| `passwordSelector` | `passwordField` | Ignored |
| `submitSelector` | `submitButton` | Ignored |

**Proposed Fix:**
- [ ] Add config validator that errors on unknown fields
- [ ] Support BOTH old and new field names for backwards compatibility
- [ ] Update docs to match implementation OR update implementation to match docs
- [ ] Add JSON Schema file for validation

**Files to Modify:**
- `cli.js` (lines 299-344)
- `capture/capture-engine.js` (line 184)
- Add `schemas/capture-config.schema.json`
- Update `README.md` with correct field names

**Tests Needed:**
- [ ] Load config with old field names (backwards compat)
- [ ] Load config with new field names
- [ ] Error on unknown fields
- [ ] Validate against JSON Schema

---

### 1.3 Design Token Extraction Missing

**Status:** 🟡 HIGH  
**Impact:** Manual workaround required, breaks automation promise  
**Effort:** Medium (2-3 days)

**Problem:**
- [ ] No automated design token extraction despite being advertised
- [ ] Validation requires `design-tokens.json` with specific structure
- [ ] Users must manually create the file
- [ ] `totalColorsFound` field required but never explained

**What's Needed:**
```javascript
// Add to capture-engine.js
async extractDesignTokens() {
  // 1. Load captured HTML
  const htmlPath = path.join(this.outputDir, 'html/*.html');
  
  // 2. Extract computed styles using agent-browser
  const colors = await this.extractColorsFromHTML(htmlPath);
  const fonts = await this.extractFontsFromHTML(htmlPath);
  
  // 3. Categorize colors by usage
  const categorized = {
    primary: this.findPrimaryColor(colors),
    text: this.findTextColors(colors),
    background: this.findBackgroundColors(colors),
    border: this.findBorderColors(colors),
    status: this.findStatusColors(colors)
  };
  
  // 4. Write standardized format
  const tokens = {
    colors: categorized,
    fonts: { primary: fonts[0] },
    totalColorsFound: colors.length,
    extracted: true,
    platform: this.config.platform.name,
    captureDate: new Date().toISOString().split('T')[0]
  };
  
  fs.writeFileSync(
    path.join(this.outputDir, 'design-tokens.json'),
    JSON.stringify(tokens, null, 2)
  );
}
```

**Files to Modify:**
- `capture/capture-engine.js` (add method at line 81)
- Add `capture/token-extractor.js` (new file)
- Add `schemas/design-tokens.schema.json`

**Tests Needed:**
- [ ] Extract colors from simple HTML
- [ ] Extract fonts from HTML
- [ ] Categorize colors correctly (primary, text, bg, border)
- [ ] Generate valid design-tokens.json
- [ ] Handle pages with few colors (< 10)
- [ ] Handle pages with many colors (> 100)

---

### 1.4 Validation Expects Undocumented Fields

**Status:** ✅ COMPLETED (Sprint 1)  
**Impact:** Captures fail validation for unclear reasons  
**Effort:** Small (1 day)

**Problem:**
- [ ] `manifest.json` requires `name` field per page (not documented)
- [ ] Screenshot paths must include `screenshots/` subdirectory (not documented)
- [ ] `design-tokens.json` requires `totalColorsFound` (not documented)
- [ ] Crashes with `Cannot read properties of undefined (reading 'toLowerCase')`

**Crashes Here:**
```javascript
// validation-engine.js:146
const pageNames = manifest.pages?.map(p => p.name.toLowerCase()) || [];
// ❌ Crashes if page.name is undefined
```

**Proposed Fix:**
```javascript
// Add proper validation
const pageNames = manifest.pages?.map(p => {
  if (!p.name) {
    errors.push(`Page ${p.id || 'unknown'} missing required 'name' field`);
    return '';
  }
  return p.name.toLowerCase();
}).filter(Boolean) || [];
```

**Files to Modify:**
- `validation/validation-engine.js` (lines 100-200)
- Add `schemas/manifest.schema.json`
- Update docs with complete schema examples

**Documentation Needed:**
- [ ] Create `manifest.json` complete example
- [ ] Create `design-tokens.json` complete example
- [ ] Document ALL required vs optional fields
- [ ] Add JSON Schema files for validation

---

## Priority 2: High Impact Issues 🟡

These issues significantly degrade user experience but have workarounds.

### 2.1 Poor Error Messages

**Status:** ✅ COMPLETED (Sprint 1)  
**Impact:** Users can't debug issues  
**Effort:** Small (1 day)

**Examples of Bad Errors:**
```
❌ "Authentication failed - still on login page"
   (doesn't say WHY)

❌ "strict mode violation: getByText('Sign in') resolved to 2 elements"
   (doesn't suggest fix)

❌ "Failed to read: Resource temporarily unavailable (os error 11)"
   (what does this even mean?)
```

**Improvements Needed:**
- [ ] Add debug mode with verbose logging
- [ ] Show current page state on auth failure
- [ ] Suggest fixes in error messages
- [ ] Include relevant config in error output

**Proposed Fix:**
```javascript
if (currentUrl.includes('login')) {
  const snapshot = this.browser('snapshot -i').output;
  throw new Error([
    '❌ Authentication failed - still on login page',
    '',
    '📋 Troubleshooting:',
    '1. Check credentials are correct',
    '2. Verify field selectors match form',
    '3. Check for CAPTCHA or 2FA',
    '',
    '📊 Form fields found on page:',
    snapshot,
    '',
    '⚙️  Config used:',
    JSON.stringify(this.config.auth, null, 2)
  ].join('\n'));
}
```

**Files to Modify:**
- `capture/capture-engine.js` (error handling throughout)
- Add `--debug` flag to CLI
- Add `--verbose` flag to CLI

**Tests Needed:**
- [ ] Error messages include helpful context
- [ ] Debug mode shows all operations
- [ ] Errors suggest next steps

---

### 2.2 No Manual Fallback Mode

**Status:** 🟡 HIGH  
**Impact:** When auto-capture fails, users are stuck  
**Effort:** Medium (2 days)

**Problem:**
- [ ] No guided manual capture option
- [ ] No way to capture when automation fails
- [ ] Users have to write custom scripts

**Proposed Feature:**
```bash
# When auto-capture fails:
❌ Automatic capture failed: Could not login

? Would you like to try interactive mode? (Y/n) Y

🌐 Opening browser at https://abm.sprouts.ai
⏸  Please login manually in the browser window
✓  Login detected, proceeding...
🔍 Navigating to /account-details/simfoni.com/overview
⏸  Press Enter when page is loaded...
📸 Capturing screenshot...
✓  Screenshot saved: account-details-overview-desktop.png
⏸  Are there tabs on this page? (y/N) y
⏸  Enter tab names (comma-separated): Contacts,Signals,Activity,Notes
📸 Capturing tabs...
✓  Captured 4 tabs
✅ Manual capture complete!
```

**Files to Add:**
- `capture/interactive-mode.js` (new file)
- Add `--interactive` flag to CLI

**Tests Needed:**
- [ ] Interactive mode launches browser
- [ ] Detects successful login
- [ ] Captures screenshots on demand
- [ ] Handles tab navigation
- [ ] Saves all artifacts correctly

---

### 2.3 Missing Progress Indicators

**Status:** ✅ COMPLETED (Sprint 1)  
**Impact:** Looks broken during long operations  
**Effort:** Small (1 day)

**Problem:**
- [ ] No feedback during 30+ second operations
- [ ] Users think it's frozen
- [ ] No estimated time remaining
- [ ] Silent failures

**Proposed Fix:**
```javascript
const ora = require('ora');

// During capture:
const spinner = ora('Logging in...').start();
await this.authenticate();
spinner.succeed('✓ Login successful');

spinner.start('Discovering pages...');
await this.discoverPages();
spinner.succeed(`✓ Discovered ${this.discoveredUrls.size} pages`);

// For multiple captures:
const bar = new ProgressBar('Capturing [:bar] :current/:total :percent :etas', {
  total: this.discoveredUrls.size,
  width: 40
});

for (const url of this.discoveredUrls) {
  await this.capturePage(url);
  bar.tick();
}
```

**Dependencies to Add:**
- `ora` for spinners
- `cli-progress` for progress bars

**Files to Modify:**
- `cli.js` (add spinners)
- `capture/capture-engine.js` (add progress reporting)

---

### 2.4 Config Validation Missing

**Status:** 🟡 HIGH  
**Impact:** Invalid configs silently ignored  
**Effort:** Small (1 day)

**Problem:**
- [ ] No validation when loading config
- [ ] Typos in config fields are silently ignored
- [ ] No schema to validate against

**Proposed Fix:**
```javascript
const Ajv = require('ajv');
const ajv = new Ajv();

const configSchema = {
  type: 'object',
  required: ['platform', 'capture'],
  properties: {
    platform: {
      type: 'object',
      required: ['name', 'baseUrl'],
      properties: {
        name: { type: 'string' },
        baseUrl: { type: 'string', format: 'uri' }
      }
    },
    auth: {
      type: 'object',
      properties: {
        type: { enum: ['form', 'none', 'oauth'] },
        credentials: { type: 'object' }
      }
    },
    capture: {
      type: 'object',
      properties: {
        mode: { enum: ['auto', 'manual', 'hybrid'] },
        maxPages: { type: 'integer', minimum: 1 },
        // ... etc
      }
    }
  },
  additionalProperties: false // Error on unknown fields
};

const validate = ajv.compile(configSchema);
if (!validate(config)) {
  throw new Error('Invalid config: ' + ajv.errorsText(validate.errors));
}
```

**Files to Add:**
- `schemas/capture-config.schema.json`
- `schemas/manifest.schema.json`
- `schemas/design-tokens.schema.json`

**Dependencies to Add:**
- `ajv` for JSON Schema validation

---

## Priority 3: Feature Gaps ⚠️

These features are documented but not implemented.

### 3.1 Multiple Viewports Not Working

**Status:** ✅ VERIFIED WORKING (Already implemented)  
**Impact:** Can't capture responsive designs  
**Effort:** Small (1 day)

**Problem:**
```javascript
// Config supports multiple viewports:
viewports: [
  { name: 'desktop', width: 1920, height: 1080 },
  { name: 'tablet', width: 768, height: 1024 },
  { name: 'mobile', width: 375, height: 812 }
]

// But code only uses first viewport:
const defaultViewport = this.config.capture?.viewports?.[0] || { width: 1920, height: 1080 };
this.browser(`set viewport ${defaultViewport.width} ${defaultViewport.height}`);
// ❌ Never loops through all viewports
```

**Proposed Fix:**
- [ ] Loop through all configured viewports
- [ ] Capture each page at each viewport size
- [ ] Name screenshots with viewport suffix: `page-desktop.png`, `page-tablet.png`, `page-mobile.png`

**Files to Modify:**
- `capture/capture-engine.js` (lines 120-125, 250-280)

---

### 3.2 Interaction Features Not Implemented

**Status:** ⚠️ MEDIUM  
**Impact:** Can't capture dropdowns, modals, expanded states  
**Effort:** Medium (2-3 days)

**Problem:**
- [ ] Config has `clickTableRows`, `clickModals`, `clickDropdowns` but they don't work
- [ ] No code to detect and click interactive elements
- [ ] Missing state variations in captures

**Proposed Implementation:**
```javascript
async captureInteractions(page) {
  if (this.config.capture.interactions.clickDropdowns) {
    const dropdowns = await this.findElements('button[aria-haspopup]');
    for (const dropdown of dropdowns) {
      await this.browser(`click "${dropdown}"`);
      await this.browser('wait 1000');
      await this.captureScreenshot(`${page.name}-dropdown-${dropdown.id}`);
      await this.browser('press Escape');
    }
  }
  
  if (this.config.capture.interactions.clickModals) {
    // Find and click modal triggers
    // Capture modal state
    // Close modal
  }
  
  // Similar for tabs, table rows, etc.
}
```

**Files to Modify:**
- `capture/capture-engine.js` (add interaction capture)
- Add `capture/interaction-strategies.js`

---

### 3.3 Hybrid Mode Doesn't Work

**Status:** ⚠️ MEDIUM  
**Impact:** Can't combine auto-discovery with manual includes  
**Effort:** Small (1 day)

**Problem:**
```javascript
// Code checks for hybrid mode but doesn't properly combine:
if (mode === 'auto' || mode === 'hybrid') {
  await this.autoDiscover(startUrl, 0, maxDepth, maxPages);
}

if (mode === 'manual' || mode === 'hybrid') {
  const manualPages = this.config.capture?.include || [];
  manualPages.forEach(pattern => {
    const url = `${this.config.platform.baseUrl}${pattern}`;
    this.discoveredUrls.add(url);
  });
}
// ❌ In hybrid mode, manual pages might be skipped if maxPages reached
```

**Proposed Fix:**
- [ ] In hybrid mode, always include manual pages first
- [ ] Then auto-discover up to (maxPages - manualPages.length)

---

### 3.4 Exclude Patterns Ignored

**Status:** ⚠️ LOW  
**Impact:** May capture logout/delete pages  
**Effort:** Small (0.5 days)

**Problem:**
- [ ] Config has `exclude` patterns but validation doesn't check them
- [ ] May capture dangerous pages (logout, delete, etc.)

**Proposed Fix:**
- [ ] Apply exclude patterns during discovery
- [ ] Validate captured pages don't match exclude patterns

---

## Priority 4: Documentation Gaps 📚

Critical documentation missing or incorrect.

### 4.1 Schema Documentation

**Status:** ✅ COMPLETED (Sprint 1)  
**Effort:** Small (1 day)

**Missing:**
- [ ] Complete `manifest.json` schema with all fields
- [ ] Complete `design-tokens.json` schema
- [ ] Complete `capture-config.json` schema with descriptions
- [ ] Examples for each schema

**Files to Create:**
- `docs/schemas/manifest.md`
- `docs/schemas/design-tokens.md`
- `docs/schemas/capture-config.md`
- `examples/manifest-complete.json`
- `examples/design-tokens-complete.json`
- `examples/capture-config-complete.json`

---

### 4.2 Troubleshooting Guide

**Status:** ✅ COMPLETED (Sprint 1)  
**Effort:** Medium (2 days)

**Needed:**
- [ ] Common errors and solutions
- [ ] Authentication debugging steps
- [ ] Selector strategy guide
- [ ] How to use interactive mode
- [ ] How to debug failed captures

**File to Create:**
- `docs/TROUBLESHOOTING.md`

**Sections:**
```markdown
# Troubleshooting Guide

## Authentication Issues
### "Authentication failed - still on login page"
- Check credentials
- Verify field selectors
- Try interactive mode
- Check for CAPTCHA

## Selector Issues
### "Element not found"
- Use `agent-browser snapshot -i` to see available elements
- Try different selector strategies
- Use CSS selectors for complex forms

## Capture Issues
### "No pages discovered"
- Check starting URL
- Verify authentication succeeded
- Use manual mode
```

---

### 4.3 Authentication Strategy Guide

**Status:** 📚 MEDIUM  
**Effort:** Small (1 day)

**Needed:**
- [ ] Examples for different login types
- [ ] How to handle OAuth
- [ ] How to handle SSO
- [ ] How to handle 2FA
- [ ] How to save session state

**File to Create:**
- `docs/AUTHENTICATION.md`

---

### 4.4 API/Programmatic Usage Docs

**Status:** 📚 MEDIUM  
**Effort:** Small (1 day)

**Problem:**
- [ ] Only CLI usage documented
- [ ] Can't use as a library
- [ ] No API reference

**Needed:**
```javascript
// docs/API.md

## Using as a Library

const { CaptureEngine } = require('./capture/capture-engine');

const engine = new CaptureEngine({
  platform: {
    name: 'My App',
    baseUrl: 'https://app.example.com'
  },
  auth: { /* ... */ },
  capture: { /* ... */ }
});

const result = await engine.run();

if (result.success) {
  console.log('Captured', result.stats.pagesCaptured, 'pages');
}
```

---

## Priority 5: Testing & Quality ✅

No automated tests exist.

### 5.1 Unit Tests Needed

**Status:** ✅ HIGH  
**Effort:** Large (3-5 days)

**Coverage Needed:**
- [ ] Config validation
- [ ] Selector strategies
- [ ] Color extraction
- [ ] Token categorization
- [ ] Manifest generation
- [ ] Validation logic

**Files to Create:**
- `tests/unit/config.test.js`
- `tests/unit/selectors.test.js`
- `tests/unit/tokens.test.js`
- `tests/unit/validation.test.js`

---

### 5.2 Integration Tests Needed

**Status:** ✅ HIGH  
**Effort:** Large (5-7 days)

**Scenarios:**
- [ ] Full capture flow with mock platform
- [ ] Authentication with different form types
- [ ] Auto-discovery
- [ ] Manual mode
- [ ] Hybrid mode
- [ ] Interactive mode
- [ ] Multi-viewport capture
- [ ] Interaction capture

**Files to Create:**
- `tests/integration/capture-flow.test.js`
- `tests/integration/auth-strategies.test.js`
- `tests/fixtures/mock-platform.html`

---

### 5.3 E2E Tests Needed

**Status:** ✅ MEDIUM  
**Effort:** Medium (3-4 days)

**Scenarios:**
- [ ] Capture real public website
- [ ] Full pipeline (capture → validate → generate)
- [ ] CLI commands
- [ ] Error recovery

---

## Implementation Roadmap

### Sprint 1 (Week 1-2): Critical Blockers ✅ COMPLETED
- [x] 1.1 Fix authentication system - Uses agent-browser refs
- [x] 1.2 Fix config inconsistencies - Supports both old/new field names
- [x] 1.4 Fix validation crashes - Safe null checking
- [x] 2.1 Improve error messages - Detailed troubleshooting info
- [x] 2.3 Progress indicators - Spinners and progress bars
- [x] 3.1 Multiple viewports - Verified already working
- [x] 4.1 Write schema docs - Created in docs/schemas/
- [x] 4.2 Troubleshooting guide - Created docs/TROUBLESHOOTING.md

**Deliverable:** Authentication works, configs are validated, clear errors ✅

### Sprint 2 (Week 3-4): Core Features
- [ ] 1.3 Implement design token extraction
- [ ] 2.2 Add interactive mode
- [ ] 2.3 Add progress indicators
- [ ] 4.2 Write troubleshooting guide

**Deliverable:** Automated token extraction, manual fallback, better UX

### Sprint 3 (Week 5-6): Feature Completion
- [ ] 3.1 Multiple viewport support
- [ ] 3.2 Interaction capture
- [ ] 3.3 Fix hybrid mode
- [ ] 4.3 Authentication guide
- [ ] 4.4 API documentation

**Deliverable:** All documented features work

### Sprint 4 (Week 7-8): Testing & Quality
- [ ] 5.1 Write unit tests
- [ ] 5.2 Write integration tests
- [ ] 5.3 Write E2E tests
- [ ] Bug fixes from testing
- [ ] Performance optimization

**Deliverable:** 80%+ test coverage, production-ready

---

## Success Metrics

**Before Optimization:**
- ❌ 0% success rate on authenticated platforms
- ❌ Users must manually create design-tokens.json
- ❌ No test coverage
- ❌ Silent failures
- ❌ Config fields ignored

**After Optimization (Target):**
- ✅ 90%+ success rate on common login forms
- ✅ Automated design token extraction
- ✅ 80%+ test coverage
- ✅ Clear, actionable error messages
- ✅ All config fields respected
- ✅ Interactive fallback when automation fails
- ✅ Complete documentation

---

## Resources Needed

**Development:**
- 1 Senior Engineer (full-time, 8 weeks)
- OR 2 Mid-level Engineers (full-time, 8 weeks)

**Dependencies to Add:**
```json
{
  "dependencies": {
    "ajv": "^8.12.0",
    "ora": "^6.3.1",
    "cli-progress": "^3.12.0"
  },
  "devDependencies": {
    "jest": "^29.7.0",
    "playwright": "^1.40.0"
  }
}
```

**Infrastructure:**
- Test fixtures (mock HTML pages)
- CI/CD pipeline for automated testing
- Documentation hosting

---

## Contact

**Questions or Clarifications:**
- Create issue in GitHub repo
- Tag: `optimization`, `bug`, or `documentation`

**Priority Changes:**
- Discuss in team standup
- Update this document with new priorities

---

**Document Maintained By:** Development Team  
**Last Updated:** 2026-01-28  
**Next Review:** After Sprint 1 completion
