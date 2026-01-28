# Troubleshooting Guide

Common issues and solutions for the real-prototypes-skill capture system.

## Authentication Issues

### "Authentication failed - still on login page"

**Possible causes:**
1. Incorrect credentials
2. CAPTCHA or 2FA required
3. Form selectors not matching
4. Account locked or needs verification

**Solutions:**

1. **Verify credentials**
   ```bash
   # Check environment variables are set
   echo $PLATFORM_EMAIL
   echo $PLATFORM_PASSWORD
   ```

2. **Use explicit CSS selectors** in your config:
   ```json
   {
     "auth": {
       "credentials": {
         "emailSelector": "#email",
         "passwordSelector": "#password",
         "submitSelector": "button[type='submit']"
       }
     }
   }
   ```

3. **Run with headed browser** to see what's happening:
   ```bash
   agent-browser open https://your-platform.com/login --headed
   agent-browser snapshot -i
   ```

4. **Check for CAPTCHA** - If present, you may need to use interactive mode or pre-authenticate manually.

### "Could not find email/username field"

**Cause:** The capture engine couldn't identify the email field in the login form.

**Solutions:**

1. **Inspect the login page** to find correct selectors:
   ```bash
   agent-browser open https://your-platform.com/login
   agent-browser snapshot -i
   ```

2. **Use explicit selector**:
   ```json
   {
     "auth": {
       "credentials": {
         "emailSelector": "input[name='username']"
       }
     }
   }
   ```

3. **Common selector patterns**:
   - `#email`, `#username`, `#login-email`
   - `[name='email']`, `[name='username']`
   - `[type='email']`
   - `[placeholder*='email']`

### "strict mode violation: getByText resolved to 2 elements"

**Cause:** Multiple elements have the same text (e.g., "Sign in" appears twice).

**Solution:** Use CSS selector instead of text-based matching:
```json
{
  "auth": {
    "credentials": {
      "submitSelector": "form button[type='submit']"
    }
  }
}
```

## Capture Issues

### "No pages discovered"

**Possible causes:**
1. Authentication failed silently
2. Starting page has no links
3. All links are excluded

**Solutions:**

1. **Check authentication** worked:
   ```bash
   agent-browser get url  # Should not be login page
   ```

2. **Use manual mode** with explicit pages:
   ```json
   {
     "capture": {
       "mode": "manual",
       "include": ["/dashboard", "/settings", "/accounts"]
     }
   }
   ```

3. **Verify exclusion patterns** aren't too broad:
   ```json
   {
     "capture": {
       "exclude": ["/logout"]  // Don't exclude too much
     }
   }
   ```

### "Failed to capture [page]: timeout"

**Cause:** Page took too long to load or element wasn't found.

**Solutions:**

1. **Increase wait times**:
   ```json
   {
     "capture": {
       "waitAfterLoad": 5000,
       "waitAfterInteraction": 2000
     }
   }
   ```

2. **Check for slow-loading content** (SPAs, infinite scroll)

3. **Reduce maximum pages** to prevent timeout accumulation

### "Screenshots missing or corrupt"

**Possible causes:**
1. Disk full
2. Permission issues
3. Path too long (Windows)

**Solutions:**

1. Check disk space
2. Verify output directory is writable:
   ```bash
   mkdir -p ./references/screenshots
   touch ./references/screenshots/test.txt
   ```

## Validation Failures

### "Page entries missing 'name' field"

**Cause:** The manifest.json has malformed page entries.

**Solution:** Regenerate the manifest by running capture again. Each page needs:
```json
{
  "name": "page-name",
  "url": "/path",
  "screenshot": "screenshots/page-name-desktop.png"
}
```

### "Minimum pages not met"

**Cause:** Fewer than 5 pages were captured (default minimum).

**Solutions:**

1. **Check authentication** - may have failed silently
2. **Use hybrid mode** to include specific pages:
   ```json
   {
     "capture": {
       "mode": "hybrid",
       "include": ["/dashboard", "/settings", "/profile", "/accounts", "/contacts"]
     }
   }
   ```
3. **Lower the threshold** (not recommended for production):
   ```json
   {
     "validation": {
       "minPages": 3
     }
   }
   ```

### "Insufficient colors extracted"

**Cause:** HTML capture didn't find enough color values.

**Solutions:**

1. **Ensure HTML capture is enabled**:
   ```json
   {
     "output": {
       "html": true
     }
   }
   ```

2. **Check that pages have actual content** (not just loading spinners)

3. **Manually create design-tokens.json** based on the platform's style guide

### "Default Tailwind colors found in prototype"

**Cause:** Generated code uses colors like `bg-blue-500` instead of custom colors.

**Solution:** Update the prototype to use only colors from design-tokens.json:
```jsx
// Bad
<button className="bg-blue-500">

// Good
<button style={{ backgroundColor: '#1a73e8' }}>

// Or define custom colors in tailwind.config.js
```

## Browser Issues

### "agent-browser command not found"

**Solution:** Install the agent-browser-skill:
```bash
npm install -g agent-browser
# or
npx agent-browser open https://example.com
```

### "Browser window doesn't open"

**Cause:** Running in headless mode by default.

**Solution:** Use `--headed` flag for debugging:
```bash
agent-browser open https://example.com --headed
```

### "Failed to read: Resource temporarily unavailable"

**Cause:** Another process is using the browser or system resources.

**Solutions:**
1. Close other browser automation processes
2. Restart and try again
3. Check system memory usage

## Getting Help

If you're still stuck:

1. **Enable verbose logging** by examining the snapshot:
   ```bash
   agent-browser snapshot -i > debug-snapshot.txt
   ```

2. **Check the agent-browser skill documentation** for command options

3. **File an issue** with:
   - Config file (redact credentials)
   - Error message
   - Platform URL (if public)
   - Browser snapshot output
