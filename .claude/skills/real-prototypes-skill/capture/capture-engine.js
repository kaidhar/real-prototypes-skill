#!/usr/bin/env node

/**
 * Platform Capture Engine
 *
 * A comprehensive, enterprise-grade web platform capture system.
 * Automatically discovers and captures all pages, states, and interactions.
 *
 * Usage:
 *   node capture-engine.js --config ./capture-config.json
 *   node capture-engine.js --url https://app.example.com --email user@test.com --password secret
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

class CaptureEngine {
  constructor(config) {
    this.config = this.normalizeConfig(config);
    this.capturedPages = new Map();
    this.discoveredUrls = new Set();
    this.visitedUrls = new Set();
    this.interactions = [];
    this.errors = [];
    this.warnings = [];
    this.stats = {
      pagesDiscovered: 0,
      pagesCaptured: 0,
      screenshotsTaken: 0,
      htmlCaptured: 0,
      interactionsPerformed: 0,
      errorsEncountered: 0
    };
  }

  /**
   * Normalize config to handle both old and new field naming conventions
   * Supports backwards compatibility while standardizing internally
   */
  normalizeConfig(config) {
    const normalized = JSON.parse(JSON.stringify(config)); // Deep clone

    // Normalize capture section
    if (normalized.capture) {
      // Support both 'manualPages' and 'include' (prefer manualPages, fallback to include)
      if (normalized.capture.manualPages && !normalized.capture.include) {
        normalized.capture.include = normalized.capture.manualPages;
      }
      // Also support the reverse for users who use 'include'
      if (normalized.capture.include && !normalized.capture.manualPages) {
        normalized.capture.manualPages = normalized.capture.include;
      }
    }

    // Normalize auth credentials section
    if (normalized.auth?.credentials) {
      const creds = normalized.auth.credentials;

      // Support both 'emailSelector' and 'emailField'
      if (creds.emailSelector && !creds.emailField) {
        // emailSelector is CSS, keep it as selector
      }
      if (creds.emailField && !creds.emailSelector) {
        // emailField might be a label name or a selector
        // If it looks like a CSS selector, treat it as such
        if (creds.emailField.startsWith('#') || creds.emailField.startsWith('.') || creds.emailField.includes('[')) {
          creds.emailSelector = creds.emailField;
        }
      }

      // Support both 'passwordSelector' and 'passwordField'
      if (creds.passwordSelector && !creds.passwordField) {
        // passwordSelector is CSS, keep it
      }
      if (creds.passwordField && !creds.passwordSelector) {
        if (creds.passwordField.startsWith('#') || creds.passwordField.startsWith('.') || creds.passwordField.includes('[')) {
          creds.passwordSelector = creds.passwordField;
        }
      }

      // Support both 'submitSelector' and 'submitButton'
      if (creds.submitSelector && !creds.submitButton) {
        // submitSelector is CSS
      }
      if (creds.submitButton && !creds.submitSelector) {
        if (creds.submitButton.startsWith('#') || creds.submitButton.startsWith('.') || creds.submitButton.includes('[')) {
          creds.submitSelector = creds.submitButton;
        }
      }
    }

    // Validate and warn about unknown fields
    this.validateConfigFields(normalized);

    return normalized;
  }

  /**
   * Validate config and warn about unknown/deprecated fields
   */
  validateConfigFields(config) {
    const knownFields = {
      platform: ['name', 'baseUrl'],
      auth: ['type', 'loginUrl', 'credentials', 'successUrl', 'waitAfterLogin'],
      'auth.credentials': ['email', 'password', 'emailField', 'emailSelector', 'passwordField', 'passwordSelector', 'submitButton', 'submitSelector'],
      capture: ['mode', 'maxPages', 'maxDepth', 'viewports', 'interactions', 'include', 'manualPages', 'exclude', 'waitAfterLoad', 'waitAfterInteraction'],
      output: ['directory', 'screenshots', 'html', 'designTokens'],
      validation: ['minPages', 'minColors', 'requireDetailPages', 'requireAllTabs']
    };

    const warnings = [];

    // Check top-level unknown fields
    const topLevelKnown = ['platform', 'auth', 'capture', 'output', 'validation'];
    Object.keys(config).forEach(key => {
      if (!topLevelKnown.includes(key)) {
        warnings.push(`Unknown config field: '${key}' - this will be ignored`);
      }
    });

    // Check nested fields
    Object.entries(knownFields).forEach(([section, fields]) => {
      const sectionParts = section.split('.');
      let obj = config;
      for (const part of sectionParts) {
        obj = obj?.[part];
      }
      if (obj && typeof obj === 'object') {
        Object.keys(obj).forEach(key => {
          if (!fields.includes(key) && typeof obj[key] !== 'object') {
            warnings.push(`Unknown config field in ${section}: '${key}' - this will be ignored`);
          }
        });
      }
    });

    if (warnings.length > 0) {
      console.log('\n⚠ Configuration warnings:');
      warnings.forEach(w => console.log(`  - ${w}`));
      console.log('');
    }
  }

  log(message, type = 'info') {
    const colors = {
      info: '\x1b[36m',    // cyan
      success: '\x1b[32m', // green
      warning: '\x1b[33m', // yellow
      error: '\x1b[31m',   // red
      step: '\x1b[90m',    // gray
      progress: '\x1b[35m', // magenta
      reset: '\x1b[0m'
    };
    const prefix = {
      info: '→',
      success: '✓',
      warning: '⚠',
      error: '✗',
      step: '•',
      progress: '◐'
    }[type] || '→';
    console.log(`${colors[type] || ''}${prefix} ${message}${colors.reset}`);
  }

  /**
   * Display progress for multi-item operations
   */
  logProgress(current, total, message) {
    const percent = Math.round((current / total) * 100);
    const bar = this.createProgressBar(percent);
    process.stdout.write(`\r\x1b[35m${bar}\x1b[0m ${current}/${total} ${message}    `);
    if (current === total) {
      console.log(''); // New line when complete
    }
  }

  createProgressBar(percent, width = 20) {
    const filled = Math.round((percent / 100) * width);
    const empty = width - filled;
    return `[${'█'.repeat(filled)}${'░'.repeat(empty)}] ${percent}%`;
  }

  /**
   * Display spinner for ongoing operations
   */
  showSpinner(message) {
    const frames = ['◐', '◓', '◑', '◒'];
    let i = 0;
    this._spinnerInterval = setInterval(() => {
      process.stdout.write(`\r\x1b[35m${frames[i]} ${message}...\x1b[0m   `);
      i = (i + 1) % frames.length;
    }, 100);
  }

  hideSpinner(message, success = true) {
    if (this._spinnerInterval) {
      clearInterval(this._spinnerInterval);
      this._spinnerInterval = null;
    }
    const icon = success ? '\x1b[32m✓\x1b[0m' : '\x1b[31m✗\x1b[0m';
    console.log(`\r${icon} ${message}                    `);
  }

  exec(command) {
    try {
      const result = execSync(command, { encoding: 'utf-8', timeout: 60000 });
      return { success: true, output: result.trim() };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  browser(action) {
    return this.exec(`agent-browser ${action}`);
  }

  async run() {
    this.log('Starting Platform Capture Engine', 'info');
    this.log(`Platform: ${this.config.platform.name}`, 'step');
    this.log(`Base URL: ${this.config.platform.baseUrl}`, 'step');

    try {
      // Phase 1: Setup
      await this.setup();

      // Phase 2: Authentication
      if (this.config.auth.type !== 'none') {
        await this.authenticate();
      }

      // Phase 3: Discovery
      await this.discoverPages();

      // Phase 4: Capture
      await this.captureAllPages();

      // Phase 5: Extract Design Tokens
      await this.extractDesignTokens();

      // Phase 6: Validation
      const validationResult = await this.validate();

      // Phase 7: Generate Manifest
      await this.generateManifest();

      // Phase 8: Report
      this.generateReport(validationResult);

      return { success: validationResult.passed, stats: this.stats };

    } catch (error) {
      this.log(`Fatal error: ${error.message}`, 'error');
      this.errors.push({ phase: 'execution', error: error.message });
      return { success: false, error: error.message };
    } finally {
      this.browser('close');
    }
  }

  async setup() {
    this.log('Setting up capture environment...', 'info');

    const outputDir = this.config.output?.directory || './references';
    const dirs = [
      outputDir,
      path.join(outputDir, 'screenshots'),
      path.join(outputDir, 'html'),
      path.join(outputDir, 'viewports')
    ];

    dirs.forEach(dir => {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
        this.log(`Created directory: ${dir}`, 'step');
      }
    });

    // Set viewport
    const defaultViewport = this.config.capture?.viewports?.[0] || { width: 1920, height: 1080 };
    this.browser(`set viewport ${defaultViewport.width} ${defaultViewport.height}`);

    this.log('Setup complete', 'success');
  }

  async authenticate() {
    const auth = this.config.auth;
    const loginUrl = `${this.config.platform.baseUrl}${auth.loginUrl || '/login'}`;

    this.showSpinner('Navigating to login page');
    this.browser(`open ${loginUrl}`);
    this.browser(`wait 2000`);
    this.hideSpinner('Loaded login page', true);

    if (auth.type === 'form') {
      // Get credentials from environment or config
      const email = process.env.PLATFORM_EMAIL || auth.credentials?.email;
      const password = process.env.PLATFORM_PASSWORD || auth.credentials?.password;

      if (!email || !password) {
        throw new Error('Missing credentials. Set PLATFORM_EMAIL and PLATFORM_PASSWORD environment variables.');
      }

      // Get snapshot of interactive elements to find form fields
      const snapshot = this.browser('snapshot -i');
      if (!snapshot.success) {
        throw new Error('Could not get page snapshot for login form');
      }

      // Parse snapshot to find form elements
      const formElements = this.parseLoginForm(snapshot.output, auth.credentials);

      if (!formElements.emailRef && !formElements.emailSelector) {
        this.log('Login form analysis:', 'warning');
        this.log(snapshot.output.substring(0, 1000), 'info');
        throw new Error(
          'Could not find email/username field on login page.\n\n' +
          'Troubleshooting:\n' +
          '1. Check the login URL is correct: ' + loginUrl + '\n' +
          '2. Specify selectors in config:\n' +
          '   auth.credentials.emailSelector = "#email"\n' +
          '   auth.credentials.passwordSelector = "#password"\n' +
          '   auth.credentials.submitSelector = "button[type=submit]"\n' +
          '3. Run with --headed flag to see the browser'
        );
      }

      // Fill email field (prefer ref, fallback to selector)
      if (formElements.emailRef) {
        this.browser(`fill ${formElements.emailRef} "${email}"`);
      } else if (formElements.emailSelector) {
        this.browser(`fill "${formElements.emailSelector}" "${email}"`);
      }

      // Fill password field
      if (formElements.passwordRef) {
        this.browser(`fill ${formElements.passwordRef} "${password}"`);
      } else if (formElements.passwordSelector) {
        this.browser(`fill "${formElements.passwordSelector}" "${password}"`);
      }

      // Click submit button
      this.showSpinner('Logging in');
      if (formElements.submitRef) {
        this.browser(`click ${formElements.submitRef}`);
      } else if (formElements.submitSelector) {
        this.browser(`click "${formElements.submitSelector}"`);
      } else {
        // Fallback: try pressing Enter
        this.browser('press Enter');
      }

      this.browser(`wait 3000`);
      this.hideSpinner('Login submitted', true);

      // Verify login success
      const currentUrl = this.browser('get url').output;
      if (currentUrl && currentUrl.includes('login')) {
        // Get page state for debugging
        const pageSnapshot = this.browser('snapshot -i').output || '';
        const errorText = this.extractErrorMessages(pageSnapshot);

        throw new Error(
          'Authentication failed - still on login page.\n\n' +
          'Possible causes:\n' +
          '1. Incorrect credentials\n' +
          '2. CAPTCHA or 2FA required\n' +
          '3. Account locked or needs verification\n' +
          (errorText ? '\nPage errors found: ' + errorText + '\n' : '') +
          '\nCurrent URL: ' + currentUrl + '\n' +
          '\nTry running with --headed to see the browser window.'
        );
      }
    }

    this.log('Authentication successful', 'success');
  }

  /**
   * Parse login form snapshot to find email, password, and submit elements
   * Uses refs from snapshot for unambiguous element targeting
   */
  parseLoginForm(snapshot, credentials = {}) {
    const elements = {
      emailRef: null,
      emailSelector: credentials?.emailSelector || null,
      passwordRef: null,
      passwordSelector: credentials?.passwordSelector || null,
      submitRef: null,
      submitSelector: credentials?.submitSelector || null
    };

    // If explicit selectors provided, use those
    if (elements.emailSelector && elements.passwordSelector) {
      return elements;
    }

    const lines = snapshot.split('\n');

    // Keywords to identify email fields
    const emailKeywords = ['email', 'username', 'user', 'login', 'account', 'e-mail'];
    const passwordKeywords = ['password', 'pass', 'pwd', 'secret'];
    const submitKeywords = ['sign in', 'log in', 'login', 'submit', 'continue', 'next'];

    for (const line of lines) {
      const lowerLine = line.toLowerCase();
      const refMatch = line.match(/\[ref=(\w+)\]/);
      const ref = refMatch ? `@${refMatch[1]}` : null;

      // Look for email/username field
      if (!elements.emailRef && ref) {
        if (lowerLine.includes('textbox') || lowerLine.includes('input')) {
          // Check for email type or email-related text
          if (lowerLine.includes('type="email"') ||
              emailKeywords.some(kw => lowerLine.includes(kw))) {
            elements.emailRef = ref;
            continue;
          }
        }
      }

      // Look for password field
      if (!elements.passwordRef && ref) {
        if (lowerLine.includes('type="password"') ||
            (lowerLine.includes('textbox') && passwordKeywords.some(kw => lowerLine.includes(kw)))) {
          elements.passwordRef = ref;
          continue;
        }
      }

      // Look for submit button
      if (!elements.submitRef && ref) {
        if (lowerLine.includes('button') && !lowerLine.includes('[disabled]')) {
          if (submitKeywords.some(kw => lowerLine.includes(kw))) {
            elements.submitRef = ref;
          }
        }
      }
    }

    // Fallback: if we found a password field but no email, find the first textbox before it
    if (elements.passwordRef && !elements.emailRef) {
      let foundPassword = false;
      for (let i = lines.length - 1; i >= 0; i--) {
        const line = lines[i];
        const lowerLine = line.toLowerCase();
        const refMatch = line.match(/\[ref=(\w+)\]/);
        const ref = refMatch ? `@${refMatch[1]}` : null;

        if (ref === elements.passwordRef) {
          foundPassword = true;
          continue;
        }

        if (foundPassword && ref &&
            (lowerLine.includes('textbox') || lowerLine.includes('input')) &&
            !lowerLine.includes('type="password"')) {
          elements.emailRef = ref;
          break;
        }
      }
    }

    return elements;
  }

  /**
   * Extract error messages from page snapshot
   */
  extractErrorMessages(snapshot) {
    const errorPatterns = [
      /error[:\s]+"([^"]+)"/gi,
      /invalid[:\s]+"([^"]+)"/gi,
      /failed[:\s]+"([^"]+)"/gi,
      /alert[:\s]+"([^"]+)"/gi
    ];

    const errors = [];
    for (const pattern of errorPatterns) {
      const matches = snapshot.match(pattern);
      if (matches) {
        errors.push(...matches);
      }
    }

    return errors.slice(0, 3).join(', ');
  }

  async discoverPages() {
    const mode = this.config.capture?.mode || 'auto';
    const maxPages = this.config.capture?.maxPages || 100;
    const maxDepth = this.config.capture?.maxDepth || 5;

    this.showSpinner(`Discovering pages (mode: ${mode}, max: ${maxPages})`);
    console.log(''); // New line for spinner

    // Start from current page after login
    const startUrl = this.browser('get url').output;
    this.discoveredUrls.add(startUrl);

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

    this.stats.pagesDiscovered = this.discoveredUrls.size;
    this.hideSpinner(`Discovered ${this.discoveredUrls.size} pages`, true);
  }

  async autoDiscover(url, depth, maxDepth, maxPages) {
    if (depth > maxDepth || this.discoveredUrls.size >= maxPages) return;
    if (this.visitedUrls.has(url)) return;

    this.visitedUrls.add(url);

    // Navigate to page
    this.browser(`open ${url}`);
    this.browser(`wait ${this.config.capture?.waitAfterLoad || 2000}`);

    // Get all links on the page
    const snapshot = this.browser('snapshot').output;
    const links = this.extractLinks(snapshot);

    for (const link of links) {
      if (this.shouldCapture(link) && !this.discoveredUrls.has(link)) {
        this.discoveredUrls.add(link);
        this.log(`Found: ${link}`, 'step');

        if (this.discoveredUrls.size < maxPages) {
          await this.autoDiscover(link, depth + 1, maxDepth, maxPages);
        }
      }
    }
  }

  extractLinks(snapshot) {
    const links = [];
    const baseUrl = this.config.platform.baseUrl;

    // Parse snapshot for links (simplified - real implementation would parse properly)
    const linkPatterns = snapshot.match(/href="([^"]+)"/g) || [];
    const buttonLinks = snapshot.match(/link "([^"]+)"/g) || [];

    [...linkPatterns, ...buttonLinks].forEach(match => {
      const href = match.replace(/href="|link "|"/g, '');
      if (href.startsWith('/')) {
        links.push(`${baseUrl}${href}`);
      } else if (href.startsWith(baseUrl)) {
        links.push(href);
      }
    });

    return [...new Set(links)];
  }

  shouldCapture(url) {
    const exclude = this.config.capture?.exclude || ['/logout', '/signout', '/delete'];
    const baseUrl = this.config.platform.baseUrl;

    // Must be same domain
    if (!url.startsWith(baseUrl)) return false;

    // Check exclusions
    for (const pattern of exclude) {
      if (url.includes(pattern)) return false;
    }

    return true;
  }

  async captureAllPages() {
    this.log('Capturing pages...', 'info');

    const outputDir = this.config.output?.directory || './references';
    const viewports = this.config.capture?.viewports || [{ name: 'desktop', width: 1920, height: 1080 }];
    const totalPages = this.discoveredUrls.size;
    let currentPage = 0;

    console.log(`  Viewports: ${viewports.map(v => v.name).join(', ')}`);
    console.log(`  Total pages to capture: ${totalPages}\n`);

    for (const url of this.discoveredUrls) {
      currentPage++;
      const pageName = this.urlToPageName(url);
      this.logProgress(currentPage, totalPages, pageName);

      try {
        await this.capturePage(url, outputDir, viewports);
      } catch (error) {
        this.log(`Failed to capture ${url}: ${error.message}`, 'error');
        this.errors.push({ url, error: error.message });
        this.stats.errorsEncountered++;
      }
    }

    console.log('');
    this.log(`Captured ${this.stats.pagesCaptured} pages, ${this.stats.screenshotsTaken} screenshots`, 'success');
  }

  async capturePage(url, outputDir, viewports) {
    this.browser(`open ${url}`);
    this.browser(`wait ${this.config.capture?.waitAfterLoad || 2000}`);

    const pageName = this.urlToPageName(url);
    const pageData = {
      name: pageName,
      url: url.replace(this.config.platform.baseUrl, ''),
      captures: [],
      tabs: [],
      interactions: []
    };

    // Capture for each viewport
    for (const viewport of viewports) {
      this.browser(`set viewport ${viewport.width} ${viewport.height}`);
      this.browser(`wait 500`);

      const screenshotPath = path.join(outputDir, 'screenshots', `${pageName}-${viewport.name}.png`);
      this.browser(`screenshot ${screenshotPath}`);
      this.stats.screenshotsTaken++;

      pageData.captures.push({
        viewport: viewport.name,
        screenshot: `screenshots/${pageName}-${viewport.name}.png`
      });
    }

    // Reset to desktop for HTML capture
    this.browser(`set viewport ${viewports[0].width} ${viewports[0].height}`);

    // Capture HTML
    if (this.config.output?.html !== false) {
      const htmlPath = path.join(outputDir, 'html', `${pageName}.html`);
      const htmlContent = this.browser('eval "document.documentElement.outerHTML"').output;
      if (htmlContent) {
        fs.writeFileSync(htmlPath, htmlContent);
        pageData.html = `html/${pageName}.html`;
        this.stats.htmlCaptured++;
      }
    }

    // Capture interactions (tabs, dropdowns, etc.)
    if (this.config.capture?.interactions?.clickTabs !== false) {
      await this.captureTabStates(pageName, outputDir, pageData);
    }

    if (this.config.capture?.interactions?.clickDropdowns !== false) {
      await this.captureDropdownStates(pageName, outputDir, pageData);
    }

    if (this.config.capture?.interactions?.clickTableRows !== false) {
      await this.captureDetailPages(pageName, outputDir, pageData);
    }

    this.capturedPages.set(url, pageData);
    this.stats.pagesCaptured++;
    this.log(`Captured: ${pageName}`, 'success');
  }

  async captureTabStates(pageName, outputDir, pageData) {
    const snapshot = this.browser('snapshot -i').output;
    const tabs = this.findTabs(snapshot);

    for (const tab of tabs) {
      try {
        this.browser(`click ${tab.ref}`);
        this.browser(`wait ${this.config.capture?.waitAfterInteraction || 1000}`);

        const tabName = this.sanitizeName(tab.name);
        const screenshotPath = path.join(outputDir, 'screenshots', `${pageName}-tab-${tabName}.png`);
        this.browser(`screenshot ${screenshotPath}`);
        this.stats.screenshotsTaken++;
        this.stats.interactionsPerformed++;

        pageData.tabs.push({
          name: tab.name,
          screenshot: `screenshots/${pageName}-tab-${tabName}.png`
        });
      } catch (error) {
        this.warnings.push(`Failed to capture tab ${tab.name}: ${error.message}`);
      }
    }
  }

  async captureDropdownStates(pageName, outputDir, pageData) {
    const snapshot = this.browser('snapshot -i').output;
    const dropdowns = this.findDropdowns(snapshot);

    for (const dropdown of dropdowns) {
      try {
        this.browser(`click ${dropdown.ref}`);
        this.browser(`wait 500`);

        const dropdownName = this.sanitizeName(dropdown.name);
        const screenshotPath = path.join(outputDir, 'screenshots', `${pageName}-dropdown-${dropdownName}.png`);
        this.browser(`screenshot ${screenshotPath}`);
        this.stats.screenshotsTaken++;
        this.stats.interactionsPerformed++;

        pageData.interactions.push({
          type: 'dropdown',
          name: dropdown.name,
          screenshot: `screenshots/${pageName}-dropdown-${dropdownName}.png`
        });

        // Close dropdown
        this.browser('press Escape');
      } catch (error) {
        this.warnings.push(`Failed to capture dropdown ${dropdown.name}: ${error.message}`);
      }
    }
  }

  async captureDetailPages(pageName, outputDir, pageData) {
    // Only for list pages
    if (!pageName.includes('list') && !pageName.includes('accounts') && !pageName.includes('contacts')) {
      return;
    }

    const snapshot = this.browser('snapshot -i').output;
    const tableRows = this.findClickableTableRows(snapshot);

    // Capture first row as example detail page
    if (tableRows.length > 0) {
      try {
        const firstRow = tableRows[0];
        this.browser(`click ${firstRow.ref}`);
        this.browser(`wait 2000`);

        const newUrl = this.browser('get url').output;
        if (!this.discoveredUrls.has(newUrl)) {
          this.discoveredUrls.add(newUrl);
          this.log(`Discovered detail page: ${newUrl}`, 'step');
        }

        // Go back
        this.browser('back');
        this.browser(`wait 1000`);
      } catch (error) {
        this.warnings.push(`Failed to capture detail page: ${error.message}`);
      }
    }
  }

  findTabs(snapshot) {
    const tabs = [];
    const lines = snapshot.split('\n');

    for (const line of lines) {
      if (line.includes('tab ') || line.includes('button') && (
        line.toLowerCase().includes('overview') ||
        line.toLowerCase().includes('activity') ||
        line.toLowerCase().includes('settings') ||
        line.toLowerCase().includes('details')
      )) {
        const refMatch = line.match(/\[ref=(\w+)\]/);
        const nameMatch = line.match(/"([^"]+)"/);
        if (refMatch && nameMatch) {
          tabs.push({ ref: `@${refMatch[1]}`, name: nameMatch[1] });
        }
      }
    }
    return tabs;
  }

  findDropdowns(snapshot) {
    const dropdowns = [];
    const lines = snapshot.split('\n');

    for (const line of lines) {
      if (line.includes('combobox') || (line.includes('button') && line.toLowerCase().includes('action'))) {
        const refMatch = line.match(/\[ref=(\w+)\]/);
        const nameMatch = line.match(/"([^"]+)"/);
        if (refMatch) {
          dropdowns.push({
            ref: `@${refMatch[1]}`,
            name: nameMatch ? nameMatch[1] : 'dropdown'
          });
        }
      }
    }
    return dropdowns;
  }

  findClickableTableRows(snapshot) {
    const rows = [];
    const lines = snapshot.split('\n');

    for (const line of lines) {
      if (line.includes('button') && !line.includes('[disabled]')) {
        const refMatch = line.match(/\[ref=(\w+)\]/);
        const nameMatch = line.match(/"([^"]+)"/);
        if (refMatch && nameMatch && nameMatch[1].length > 2) {
          rows.push({ ref: `@${refMatch[1]}`, name: nameMatch[1] });
        }
      }
    }
    return rows.slice(0, 5); // Limit to first 5
  }

  urlToPageName(url) {
    const path = url.replace(this.config.platform.baseUrl, '');
    return this.sanitizeName(path) || 'home';
  }

  sanitizeName(str) {
    return str
      .toLowerCase()
      .replace(/^\//, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .substring(0, 50);
  }

  async extractDesignTokens() {
    this.log('Extracting design tokens...', 'info');

    const outputDir = this.config.output?.directory || './references';
    const htmlDir = path.join(outputDir, 'html');

    if (!fs.existsSync(htmlDir)) {
      this.warnings.push('No HTML files to extract tokens from');
      return;
    }

    const colors = new Map();
    const fonts = new Set();

    const htmlFiles = fs.readdirSync(htmlDir).filter(f => f.endsWith('.html'));

    for (const file of htmlFiles) {
      const content = fs.readFileSync(path.join(htmlDir, file), 'utf-8');

      // Extract colors
      const colorMatches = content.match(/#[0-9a-fA-F]{3,8}\b/g) || [];
      colorMatches.forEach(color => {
        const normalized = color.toLowerCase();
        colors.set(normalized, (colors.get(normalized) || 0) + 1);
      });

      // Extract RGB colors
      const rgbMatches = content.match(/rgb\([^)]+\)/g) || [];
      rgbMatches.forEach(rgb => {
        colors.set(rgb, (colors.get(rgb) || 0) + 1);
      });

      // Extract fonts
      const fontMatches = content.match(/font-family:\s*([^;}"]+)/g) || [];
      fontMatches.forEach(font => {
        fonts.add(font.replace('font-family:', '').trim());
      });
    }

    // Sort colors by frequency
    const sortedColors = [...colors.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 50);

    // Categorize colors
    const designTokens = {
      extractedAt: new Date().toISOString(),
      totalColorsFound: colors.size,
      colors: this.categorizeColors(sortedColors),
      fonts: {
        families: [...fonts],
        primary: [...fonts][0] || 'system-ui'
      },
      rawColors: sortedColors
    };

    fs.writeFileSync(
      path.join(outputDir, 'design-tokens.json'),
      JSON.stringify(designTokens, null, 2)
    );

    this.log(`Extracted ${colors.size} colors, ${fonts.size} fonts`, 'success');
  }

  categorizeColors(sortedColors) {
    const colors = {
      primary: null,
      secondary: null,
      background: {},
      text: {},
      border: {},
      status: {}
    };

    for (const [color, count] of sortedColors) {
      const hex = color.startsWith('#') ? color : this.rgbToHex(color);
      const rgb = this.hexToRgb(hex);
      if (!rgb) continue;

      const luminance = (0.299 * rgb.r + 0.587 * rgb.g + 0.114 * rgb.b) / 255;

      // Categorize based on color properties
      if (rgb.b > rgb.r && rgb.b > rgb.g && !colors.primary) {
        colors.primary = hex;
      } else if (luminance > 0.9) {
        if (!colors.background.white) colors.background.white = hex;
      } else if (luminance > 0.8) {
        if (!colors.background.light) colors.background.light = hex;
      } else if (luminance < 0.2) {
        if (!colors.text.primary) colors.text.primary = hex;
      } else if (luminance < 0.5) {
        if (!colors.text.secondary) colors.text.secondary = hex;
      }

      // Status colors
      if (rgb.r > 200 && rgb.g < 100 && rgb.b < 100) {
        if (!colors.status.error) colors.status.error = hex;
      }
      if (rgb.g > 150 && rgb.r < 100 && rgb.b < 100) {
        if (!colors.status.success) colors.status.success = hex;
      }
    }

    return colors;
  }

  hexToRgb(hex) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : null;
  }

  rgbToHex(rgb) {
    const match = rgb.match(/\d+/g);
    if (!match || match.length < 3) return null;
    return '#' + match.slice(0, 3).map(x => {
      const hex = parseInt(x).toString(16);
      return hex.length === 1 ? '0' + hex : hex;
    }).join('');
  }

  async validate() {
    this.log('Validating capture...', 'info');

    const validation = this.config.validation || {};
    const results = {
      passed: true,
      checks: []
    };

    // Check minimum pages
    const minPages = validation.minPages || 5;
    const pageCheck = {
      name: 'Minimum pages captured',
      expected: minPages,
      actual: this.stats.pagesCaptured,
      passed: this.stats.pagesCaptured >= minPages
    };
    results.checks.push(pageCheck);
    if (!pageCheck.passed) results.passed = false;

    // Check for detail pages
    if (validation.requireDetailPages !== false) {
      const listPages = [...this.capturedPages.keys()].filter(url =>
        url.includes('list') || url.includes('accounts') || url.includes('contacts')
      );
      const detailPages = [...this.capturedPages.keys()].filter(url =>
        url.includes('detail') || url.includes('-id') || url.match(/\/\d+\//)
      );

      const detailCheck = {
        name: 'Detail pages captured',
        expected: `${listPages.length} list pages should have detail pages`,
        actual: `${detailPages.length} detail pages found`,
        passed: listPages.length === 0 || detailPages.length > 0
      };
      results.checks.push(detailCheck);
      if (!detailCheck.passed) {
        results.passed = false;
        this.warnings.push('List pages found but no detail pages captured');
      }
    }

    // Check design tokens
    const outputDir = this.config.output?.directory || './references';
    const tokensPath = path.join(outputDir, 'design-tokens.json');
    if (fs.existsSync(tokensPath)) {
      const tokens = JSON.parse(fs.readFileSync(tokensPath, 'utf-8'));
      const minColors = validation.minColors || 10;
      const colorCheck = {
        name: 'Design tokens extracted',
        expected: `At least ${minColors} colors`,
        actual: `${tokens.totalColorsFound} colors`,
        passed: tokens.totalColorsFound >= minColors
      };
      results.checks.push(colorCheck);
      if (!colorCheck.passed) results.passed = false;
    }

    // Check for errors
    const errorCheck = {
      name: 'No critical errors',
      expected: '0 errors',
      actual: `${this.errors.length} errors`,
      passed: this.errors.length === 0
    };
    results.checks.push(errorCheck);
    if (!errorCheck.passed) results.passed = false;

    // Log results
    results.checks.forEach(check => {
      const icon = check.passed ? '✓' : '✗';
      this.log(`${icon} ${check.name}: ${check.actual}`, check.passed ? 'success' : 'error');
    });

    return results;
  }

  async generateManifest() {
    this.log('Generating manifest...', 'info');

    const outputDir = this.config.output?.directory || './references';
    const manifest = {
      platform: {
        name: this.config.platform.name,
        baseUrl: this.config.platform.baseUrl,
        capturedAt: new Date().toISOString()
      },
      pages: [...this.capturedPages.entries()].map(([url, data]) => ({
        name: data.name,
        url: data.url,
        screenshot: data.captures[0]?.screenshot,
        html: data.html,
        description: this.generateDescription(data),
        captures: data.captures,
        tabs: data.tabs,
        interactions: data.interactions
      })),
      stats: this.stats,
      designTokens: 'design-tokens.json'
    };

    fs.writeFileSync(
      path.join(outputDir, 'manifest.json'),
      JSON.stringify(manifest, null, 2)
    );

    this.log('Manifest generated', 'success');
  }

  generateDescription(pageData) {
    const name = pageData.name;
    if (name.includes('detail')) return `${name.replace('-detail', '')} detail page`;
    if (name.includes('list')) return `${name.replace('-list', '')} list page`;
    if (name.includes('settings')) return 'Application settings';
    return `${name} page`;
  }

  generateReport(validationResult) {
    console.log('\n' + '='.repeat(60));
    console.log('CAPTURE REPORT');
    console.log('='.repeat(60));

    console.log('\nStatistics:');
    console.log(`  Pages discovered: ${this.stats.pagesDiscovered}`);
    console.log(`  Pages captured: ${this.stats.pagesCaptured}`);
    console.log(`  Screenshots taken: ${this.stats.screenshotsTaken}`);
    console.log(`  HTML files: ${this.stats.htmlCaptured}`);
    console.log(`  Interactions: ${this.stats.interactionsPerformed}`);
    console.log(`  Errors: ${this.stats.errorsEncountered}`);

    if (this.warnings.length > 0) {
      console.log('\nWarnings:');
      this.warnings.forEach(w => console.log(`  ⚠ ${w}`));
    }

    if (this.errors.length > 0) {
      console.log('\nErrors:');
      this.errors.forEach(e => console.log(`  ✗ ${e.url || e.phase}: ${e.error}`));
    }

    console.log('\nValidation:');
    console.log(`  Status: ${validationResult.passed ? 'PASSED ✓' : 'FAILED ✗'}`);

    console.log('\n' + '='.repeat(60));
  }
}

// CLI Interface
function parseArgs() {
  const args = process.argv.slice(2);
  const config = {
    platform: {},
    auth: { type: 'form', credentials: {} },
    capture: {},
    output: {},
    validation: {}
  };

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--config':
        const configFile = args[++i];
        const fileConfig = JSON.parse(fs.readFileSync(configFile, 'utf-8'));
        return fileConfig;
      case '--url':
        config.platform.baseUrl = args[++i];
        config.platform.name = new URL(config.platform.baseUrl).hostname;
        break;
      case '--email':
        config.auth.credentials.email = args[++i];
        break;
      case '--password':
        config.auth.credentials.password = args[++i];
        break;
      case '--output':
        config.output.directory = args[++i];
        break;
      case '--help':
        console.log(`
Platform Capture Engine

Usage:
  node capture-engine.js --config ./config.json
  node capture-engine.js --url https://app.example.com --email user@test.com --password secret

Options:
  --config     Path to JSON configuration file
  --url        Platform base URL
  --email      Login email
  --password   Login password
  --output     Output directory (default: ./references)
  --help       Show this help
        `);
        process.exit(0);
    }
  }

  return config;
}

// Main
const config = parseArgs();
const engine = new CaptureEngine(config);
engine.run().then(result => {
  process.exit(result.success ? 0 : 1);
});

module.exports = { CaptureEngine };
