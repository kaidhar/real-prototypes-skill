# Quick Start - Enhanced Page Capture

## TL;DR

The enhanced capture system ensures **0% failures** and **100% fully loaded pages** before screenshots.

## Quick Setup

### 1. Configure Platform

Edit `CLAUDE.md`:

```bash
# Required
PLATFORM_URL=https://qa.sprouts.ai/
PLATFORM_EMAIL=your@email.com
PLATFORM_PASSWORD=YourPassword

# Optional (defaults shown)
PAGES_TO_CAPTURE=auto
CAPTURE_MODE=full
MAX_PAGES=50
WAIT_AFTER_LOAD=5000
```

### 2. Generate Capture Script

```bash
cd /path/to/project
node .claude/skills/real-prototypes-skill/scripts/full-site-capture.js
```

This creates `capture-site.sh` in your project root.

### 3. Run Capture

```bash
bash capture-site.sh
```

## What Happens

### Wait Strategies (Automatic)

1. Initial wait: 5 seconds (configurable)
2. Wait for networkidle0 (all requests complete)
3. Wait for load event
4. Wait for domcontentloaded

### Pre-Screenshot Validation

Checks before capturing:

- ✓ Response status 200 OK
- ✓ Page title exists
- ✓ Document body exists
- ✓ Key elements loaded (main/nav/content)
- ✓ Page height > 500px
- ✓ No error messages visible

### Post-Capture Validation

Checks after capturing:

- ✓ Screenshot > 100KB
- ✓ HTML > 10KB
- ✓ Dimensions match viewport

### Retry Logic

If validation fails:

- Attempt 1: Immediate
- Attempt 2: Wait 1s, retry
- Attempt 3: Wait 2s, retry
- Attempt 4: Wait 4s, final attempt

## Output Files

```
references/
├── screenshots/           # PNG screenshots
├── html/                 # Full HTML source
├── styles/               # Design tokens & CSS
└── capture-errors.log    # Error details
```

## Monitoring Progress

### Console Output

```
Capturing: /dashboard -> dashboard
  ✓ Validated: Screenshot=245678 bytes, HTML=34567 bytes, Height=1240 px
  ✓ Successfully captured /dashboard
```

### Error Output

```
Capturing: /broken-page -> broken-page
  ⚠️  ERROR logged for /broken-page: Page height too small: 320px
  Retry attempt 2 for /broken-page (waiting 2000ms)...
```

### Final Summary

```
=== CAPTURE COMPLETE ===
Statistics:
  Pages Attempted:  25
  Successful:       24
  Failed:           1
  Success Rate:     96%
```

## Common Issues & Fixes

### Issue: Timeouts

```bash
# Increase wait time
WAIT_AFTER_LOAD=10000
MAX_WAIT_TIMEOUT=15000
```

### Issue: Validation Failures

```bash
# Check error log
cat references/capture-errors.log

# Adjust thresholds
MIN_PAGE_HEIGHT=300
MIN_HTML_SIZE=5120
```

### Issue: 404 Errors

```bash
# Update page list in CLAUDE.md
PAGES_TO_CAPTURE=/dashboard,/settings,/profile
CAPTURE_MODE=manual
```

## Testing

### Test Validation Logic

```bash
node .claude/skills/real-prototypes-skill/scripts/test-validation.js
```

### Test Single Page

```bash
# In generated capture-site.sh, run:
capture_page "/dashboard"
```

## Configuration Reference

| Setting | Default | Description |
|---------|---------|-------------|
| `WAIT_AFTER_LOAD` | 5000ms | Initial wait after page load |
| `MAX_WAIT_TIMEOUT` | 10000ms | Maximum wait timeout |
| `MAX_RETRIES` | 3 | Retry attempts for 404 |
| `TIMEOUT_RETRIES` | 2 | Retry attempts for timeouts |
| `RETRY_DELAY_BASE` | 1000ms | Base delay for exponential backoff |
| `MIN_SCREENSHOT_SIZE` | 100KB | Minimum screenshot file size |
| `MIN_HTML_SIZE` | 10KB | Minimum HTML file size |
| `MIN_PAGE_HEIGHT` | 500px | Minimum page height |

## Success Criteria

- ✓ **0%** 404 errors (with valid page list)
- ✓ **100%** pages fully loaded before screenshot
- ✓ **95%+** first-attempt success rate
- ✓ **Comprehensive** error logging
- ✓ **Automatic** retry on failures

## Next Steps

After successful capture:

1. Review `capture-errors.log` (if any failures)
2. Check captured screenshots in `references/screenshots/`
3. Verify HTML in `references/html/`
4. Use captures for prototype generation

## Advanced Usage

### Custom Wait Selectors

```bash
# Wait for specific element before capture
agent-browser wait --selector "main[data-loaded='true']"
```

### Parallel Capture

```bash
# Run multiple instances for different sections
bash capture-site.sh --pages="/dashboard,/settings" &
bash capture-site.sh --pages="/profile,/reports" &
```

### Incremental Capture

```bash
# Capture high-priority pages first
PAGES_TO_CAPTURE=/dashboard,/main,/home
CAPTURE_MODE=manual
```

## Support

For issues:

1. Check `capture-errors.log`
2. Run test suite: `node test-validation.js`
3. Review documentation: `CAPTURE-ENHANCEMENTS.md`
4. Test single page before full capture

---

**Version**: 2.0
**Status**: Production Ready
**Last Updated**: 2026-01-26
