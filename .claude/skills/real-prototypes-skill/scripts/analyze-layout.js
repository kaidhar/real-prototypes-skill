#!/usr/bin/env node

/**
 * Layout & Component Structure Analysis
 *
 * Analyzes captured pages to extract:
 * - Layout patterns (grid, flex, columns)
 * - Component patterns (buttons, forms, cards, etc.)
 * - HTML structure with bounding boxes
 * - UI library detection
 *
 * Usage:
 *   node analyze-layout.js [references-dir] [output-file]
 *
 * Output:
 *   - structure-manifest.json (complete layout and component analysis)
 *   - component-map-[page].json (per-page component mapping)
 */

const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

// UI Library signatures
const UI_LIBRARY_PATTERNS = {
  'material-ui': [
    /Mui[A-Z][a-zA-Z]+-/,
    /makeStyles/,
    /@mui\//,
  ],
  'ant-design': [
    /ant-[a-z]+/,
    /anticon/,
    /@ant-design\//,
  ],
  'bootstrap': [
    /\bbtn\b/,
    /\bcard\b/,
    /\bcontainer\b/,
    /\brow\b/,
    /\bcol-/,
  ],
  'tailwind': [
    /\b(flex|grid|p-\d+|m-\d+|text-|bg-|border-)/,
    /\bhover:/,
    /\bfocus:/,
  ],
  'chakra-ui': [
    /chakra-/,
    /@chakra-ui\//,
  ],
  'semantic-ui': [
    /\bui\s+[a-z]+/,
    /semantic-ui/,
  ],
};

// Component patterns to detect
const COMPONENT_PATTERNS = {
  button: {
    selectors: ['button', '[role="button"]', 'a.btn', '.button'],
    attributes: ['type', 'disabled', 'aria-label'],
  },
  input: {
    selectors: ['input', 'textarea', 'select', '[contenteditable="true"]'],
    attributes: ['type', 'placeholder', 'required', 'disabled'],
  },
  card: {
    selectors: ['.card', '.panel', '[class*="card"]', '[class*="Card"]'],
    attributes: ['role'],
  },
  modal: {
    selectors: ['[role="dialog"]', '.modal', '[class*="modal"]', '[class*="Modal"]'],
    attributes: ['aria-modal', 'aria-labelledby'],
  },
  navigation: {
    selectors: ['nav', '[role="navigation"]', '.nav', '.navbar', '.sidebar'],
    attributes: ['aria-label'],
  },
  table: {
    selectors: ['table', '[role="table"]', '.table', '[class*="table"]'],
    attributes: ['role'],
  },
  form: {
    selectors: ['form', '[role="form"]'],
    attributes: ['method', 'action'],
  },
};

/**
 * Analyze a single page for layout and components
 */
async function analyzePage(browser, htmlPath, screenshotPath) {
  const page = await browser.newPage();

  try {
    // Load the captured HTML
    const htmlContent = fs.readFileSync(htmlPath, 'utf-8');
    await page.setContent(htmlContent, {
      waitUntil: 'domcontentloaded',
    });

    // Wait a bit for any dynamic styles to apply
    await page.waitForTimeout(1000);

    const analysis = {
      url: htmlPath,
      screenshot: screenshotPath,
      layout: await analyzeLayout(page),
      components: await analyzeComponents(page),
      library: await detectUILibrary(page),
      structure: await extractHTMLStructure(page),
      landmarks: await extractLandmarks(page),
    };

    return analysis;
  } catch (error) {
    console.error(`Error analyzing ${htmlPath}:`, error.message);
    return null;
  } finally {
    await page.close();
  }
}

/**
 * Analyze layout patterns (grid, flex, positioning)
 */
async function analyzeLayout(page) {
  return await page.evaluate(() => {
    const layout = {
      type: 'unknown',
      grid: null,
      flex: null,
      positioning: {
        fixed: [],
        sticky: [],
        absolute: [],
      },
      containers: [],
      sidebar: null,
      header: null,
      footer: null,
    };

    // Find main container
    const body = document.body;
    const bodyStyles = window.getComputedStyle(body);

    // Detect overall layout type
    const mainElements = document.querySelectorAll('main, [role="main"], .main, #main');
    const sidebarElements = document.querySelectorAll('aside, .sidebar, [role="complementary"]');

    if (mainElements.length > 0 && sidebarElements.length > 0) {
      layout.type = 'sidebar-main';

      // Analyze sidebar
      const sidebar = sidebarElements[0];
      const sidebarStyles = window.getComputedStyle(sidebar);
      const sidebarRect = sidebar.getBoundingClientRect();

      layout.sidebar = {
        width: sidebarStyles.width,
        position: sidebarStyles.position,
        top: sidebarStyles.top,
        left: sidebarStyles.left,
        boundingBox: {
          x: sidebarRect.x,
          y: sidebarRect.y,
          width: sidebarRect.width,
          height: sidebarRect.height,
        },
      };
    } else if (mainElements.length > 0) {
      layout.type = 'single-main';
    }

    // Analyze grid systems
    const gridElements = Array.from(document.querySelectorAll('*')).filter(el => {
      const styles = window.getComputedStyle(el);
      return styles.display === 'grid';
    });

    if (gridElements.length > 0) {
      const gridEl = gridElements[0];
      const gridStyles = window.getComputedStyle(gridEl);

      layout.grid = {
        columns: gridStyles.gridTemplateColumns,
        rows: gridStyles.gridTemplateRows,
        gap: gridStyles.gap || gridStyles.gridGap,
        columnGap: gridStyles.columnGap || gridStyles.gridColumnGap,
        rowGap: gridStyles.rowGap || gridStyles.gridRowGap,
      };
    }

    // Analyze flex patterns
    const flexElements = Array.from(document.querySelectorAll('*')).filter(el => {
      const styles = window.getComputedStyle(el);
      return styles.display === 'flex' || styles.display === 'inline-flex';
    });

    if (flexElements.length > 0) {
      const flexEl = flexElements[0];
      const flexStyles = window.getComputedStyle(flexEl);

      layout.flex = {
        direction: flexStyles.flexDirection,
        wrap: flexStyles.flexWrap,
        justifyContent: flexStyles.justifyContent,
        alignItems: flexStyles.alignItems,
        gap: flexStyles.gap,
      };
    }

    // Find positioned elements
    Array.from(document.querySelectorAll('*')).forEach(el => {
      const styles = window.getComputedStyle(el);
      const position = styles.position;

      if (['fixed', 'sticky', 'absolute'].includes(position)) {
        const rect = el.getBoundingClientRect();
        const info = {
          selector: el.tagName.toLowerCase() + (el.className ? '.' + Array.from(el.classList).join('.') : ''),
          position,
          top: styles.top,
          right: styles.right,
          bottom: styles.bottom,
          left: styles.left,
          zIndex: styles.zIndex,
          boundingBox: {
            x: rect.x,
            y: rect.y,
            width: rect.width,
            height: rect.height,
          },
        };

        layout.positioning[position].push(info);
      }
    });

    // Find container patterns
    const containerSelectors = ['.container', '[class*="container"]', 'main', '.main'];
    containerSelectors.forEach(selector => {
      try {
        document.querySelectorAll(selector).forEach(el => {
          const styles = window.getComputedStyle(el);
          const rect = el.getBoundingClientRect();

          layout.containers.push({
            selector,
            maxWidth: styles.maxWidth,
            width: styles.width,
            padding: styles.padding,
            margin: styles.margin,
            boundingBox: {
              x: rect.x,
              y: rect.y,
              width: rect.width,
              height: rect.height,
            },
          });
        });
      } catch (e) {
        // Invalid selector, skip
      }
    });

    // Analyze header
    const headerElements = document.querySelectorAll('header, [role="banner"], .header');
    if (headerElements.length > 0) {
      const header = headerElements[0];
      const headerStyles = window.getComputedStyle(header);
      const headerRect = header.getBoundingClientRect();

      layout.header = {
        height: headerStyles.height,
        position: headerStyles.position,
        backgroundColor: headerStyles.backgroundColor,
        boundingBox: {
          x: headerRect.x,
          y: headerRect.y,
          width: headerRect.width,
          height: headerRect.height,
        },
      };
    }

    // Analyze footer
    const footerElements = document.querySelectorAll('footer, [role="contentinfo"], .footer');
    if (footerElements.length > 0) {
      const footer = footerElements[0];
      const footerStyles = window.getComputedStyle(footer);
      const footerRect = footer.getBoundingClientRect();

      layout.footer = {
        height: footerStyles.height,
        position: footerStyles.position,
        backgroundColor: footerStyles.backgroundColor,
        boundingBox: {
          x: footerRect.x,
          y: footerRect.y,
          width: footerRect.width,
          height: footerRect.height,
        },
      };
    }

    return layout;
  });
}

/**
 * Analyze components (buttons, forms, cards, etc.)
 */
async function analyzeComponents(page) {
  return await page.evaluate((patterns) => {
    const components = {};

    Object.entries(patterns).forEach(([type, config]) => {
      const elements = [];

      config.selectors.forEach(selector => {
        try {
          document.querySelectorAll(selector).forEach(el => {
            const styles = window.getComputedStyle(el);
            const rect = el.getBoundingClientRect();

            // Extract relevant styles
            const componentInfo = {
              selector,
              tag: el.tagName.toLowerCase(),
              classes: Array.from(el.classList),
              styles: {
                display: styles.display,
                padding: styles.padding,
                margin: styles.margin,
                border: styles.border,
                borderRadius: styles.borderRadius,
                backgroundColor: styles.backgroundColor,
                color: styles.color,
                fontSize: styles.fontSize,
                fontWeight: styles.fontWeight,
                fontFamily: styles.fontFamily,
                boxShadow: styles.boxShadow,
                width: styles.width,
                height: styles.height,
              },
              boundingBox: {
                x: rect.x,
                y: rect.y,
                width: rect.width,
                height: rect.height,
              },
            };

            // Extract configured attributes
            const attributes = {};
            config.attributes.forEach(attr => {
              if (el.hasAttribute(attr)) {
                attributes[attr] = el.getAttribute(attr);
              }
            });
            componentInfo.attributes = attributes;

            // Detect variants (for buttons)
            if (type === 'button') {
              componentInfo.variant = detectButtonVariant(el);
              componentInfo.size = detectButtonSize(rect.height);
            }

            elements.push(componentInfo);
          });
        } catch (e) {
          // Invalid selector, skip
        }
      });

      if (elements.length > 0) {
        components[type] = {
          count: elements.length,
          variants: groupByVariants(elements),
          examples: elements.slice(0, 5), // First 5 examples
        };
      }
    });

    return components;

    // Helper functions
    function detectButtonVariant(button) {
      const classes = Array.from(button.classList).join(' ');
      const styles = window.getComputedStyle(button);

      if (classes.match(/primary|btn-primary/i)) return 'primary';
      if (classes.match(/secondary|btn-secondary/i)) return 'secondary';
      if (classes.match(/ghost|outline|btn-outline/i)) return 'ghost';
      if (classes.match(/danger|error|btn-danger/i)) return 'danger';
      if (classes.match(/success|btn-success/i)) return 'success';

      // Detect by background color
      const bgColor = styles.backgroundColor;
      if (bgColor === 'transparent' || bgColor === 'rgba(0, 0, 0, 0)') {
        return 'ghost';
      }

      return 'default';
    }

    function detectButtonSize(height) {
      if (height < 30) return 'sm';
      if (height > 45) return 'lg';
      return 'md';
    }

    function groupByVariants(elements) {
      const variantMap = {};

      elements.forEach(el => {
        const key = el.variant || 'default';
        if (!variantMap[key]) {
          variantMap[key] = [];
        }
        variantMap[key].push(el);
      });

      return Object.entries(variantMap).map(([variant, items]) => ({
        variant,
        count: items.length,
        example: items[0],
      }));
    }
  }, COMPONENT_PATTERNS);
}

/**
 * Detect UI library
 */
async function detectUILibrary(page) {
  return await page.evaluate((patterns) => {
    const detectedLibraries = [];

    // Check HTML classes
    const allClasses = Array.from(document.querySelectorAll('*'))
      .flatMap(el => Array.from(el.classList))
      .join(' ');

    // Check for library patterns
    Object.entries(patterns).forEach(([library, regexPatterns]) => {
      const matches = regexPatterns.some(pattern => pattern.test(allClasses));
      if (matches) {
        detectedLibraries.push(library);
      }
    });

    // Check for library-specific elements
    if (document.querySelector('[class*="Mui"]')) {
      detectedLibraries.push('material-ui');
    }
    if (document.querySelector('[class*="ant-"]')) {
      detectedLibraries.push('ant-design');
    }
    if (document.querySelector('.chakra-')) {
      detectedLibraries.push('chakra-ui');
    }

    // Return most likely library or custom
    if (detectedLibraries.length === 0) {
      return 'custom';
    }

    // If multiple libraries detected, return the most prevalent
    const libraryCounts = {};
    detectedLibraries.forEach(lib => {
      libraryCounts[lib] = (libraryCounts[lib] || 0) + 1;
    });

    const mostPrevalent = Object.entries(libraryCounts).sort((a, b) => b[1] - a[1])[0][0];

    return {
      primary: mostPrevalent,
      detected: [...new Set(detectedLibraries)],
    };
  }, UI_LIBRARY_PATTERNS);
}

/**
 * Extract HTML structure with semantic preservation
 */
async function extractHTMLStructure(page) {
  return await page.evaluate(() => {
    function extractElement(el, depth = 0) {
      if (depth > 10) return null; // Limit depth to avoid huge structures

      const styles = window.getComputedStyle(el);
      const rect = el.getBoundingClientRect();

      const node = {
        tag: el.tagName.toLowerCase(),
        classes: Array.from(el.classList),
        id: el.id || null,
        attributes: {},
        styles: {
          display: styles.display,
          position: styles.position,
        },
        boundingBox: {
          x: Math.round(rect.x),
          y: Math.round(rect.y),
          width: Math.round(rect.width),
          height: Math.round(rect.height),
        },
        children: [],
      };

      // Extract important attributes
      const importantAttrs = ['role', 'aria-label', 'aria-labelledby', 'aria-describedby', 'data-testid'];
      importantAttrs.forEach(attr => {
        if (el.hasAttribute(attr)) {
          node.attributes[attr] = el.getAttribute(attr);
        }
      });

      // Extract data attributes
      Array.from(el.attributes).forEach(attr => {
        if (attr.name.startsWith('data-')) {
          node.attributes[attr.name] = attr.value;
        }
      });

      // Recursively extract children (only for structural elements)
      const structuralTags = ['header', 'nav', 'main', 'aside', 'footer', 'section', 'article', 'div'];
      if (structuralTags.includes(node.tag)) {
        Array.from(el.children).forEach(child => {
          const childNode = extractElement(child, depth + 1);
          if (childNode) {
            node.children.push(childNode);
          }
        });
      }

      return node;
    }

    return extractElement(document.body);
  });
}

/**
 * Extract landmark elements
 */
async function extractLandmarks(page) {
  return await page.evaluate(() => {
    const landmarks = {
      header: null,
      navigation: [],
      main: null,
      aside: [],
      footer: null,
    };

    // Header
    const header = document.querySelector('header, [role="banner"]');
    if (header) {
      const rect = header.getBoundingClientRect();
      landmarks.header = {
        selector: header.tagName.toLowerCase() + (header.className ? '.' + Array.from(header.classList).join('.') : ''),
        boundingBox: {
          x: rect.x,
          y: rect.y,
          width: rect.width,
          height: rect.height,
        },
      };
    }

    // Navigation
    document.querySelectorAll('nav, [role="navigation"]').forEach(nav => {
      const rect = nav.getBoundingClientRect();
      landmarks.navigation.push({
        selector: nav.tagName.toLowerCase() + (nav.className ? '.' + Array.from(nav.classList).join('.') : ''),
        boundingBox: {
          x: rect.x,
          y: rect.y,
          width: rect.width,
          height: rect.height,
        },
      });
    });

    // Main
    const main = document.querySelector('main, [role="main"]');
    if (main) {
      const rect = main.getBoundingClientRect();
      landmarks.main = {
        selector: main.tagName.toLowerCase() + (main.className ? '.' + Array.from(main.classList).join('.') : ''),
        boundingBox: {
          x: rect.x,
          y: rect.y,
          width: rect.width,
          height: rect.height,
        },
      };
    }

    // Aside
    document.querySelectorAll('aside, [role="complementary"]').forEach(aside => {
      const rect = aside.getBoundingClientRect();
      landmarks.aside.push({
        selector: aside.tagName.toLowerCase() + (aside.className ? '.' + Array.from(aside.classList).join('.') : ''),
        boundingBox: {
          x: rect.x,
          y: rect.y,
          width: rect.width,
          height: rect.height,
        },
      });
    });

    // Footer
    const footer = document.querySelector('footer, [role="contentinfo"]');
    if (footer) {
      const rect = footer.getBoundingClientRect();
      landmarks.footer = {
        selector: footer.tagName.toLowerCase() + (footer.className ? '.' + Array.from(footer.classList).join('.') : ''),
        boundingBox: {
          x: rect.x,
          y: rect.y,
          width: rect.width,
          height: rect.height,
        },
      };
    }

    return landmarks;
  });
}

/**
 * Generate structure manifest from all analyzed pages
 */
function generateStructureManifest(pageAnalyses) {
  const manifest = {
    generatedAt: new Date().toISOString(),
    pagesAnalyzed: pageAnalyses.length,
    layout: null,
    components: {},
    library: null,
    commonPatterns: {},
  };

  // Aggregate layout patterns (use most common)
  const layouts = pageAnalyses.map(p => p.layout).filter(Boolean);
  if (layouts.length > 0) {
    manifest.layout = aggregateLayouts(layouts);
  }

  // Aggregate component patterns
  pageAnalyses.forEach(page => {
    if (page.components) {
      Object.entries(page.components).forEach(([type, data]) => {
        if (!manifest.components[type]) {
          manifest.components[type] = {
            totalCount: 0,
            variants: {},
            examples: [],
          };
        }

        manifest.components[type].totalCount += data.count;

        // Aggregate variants
        if (data.variants) {
          data.variants.forEach(variant => {
            const key = variant.variant;
            if (!manifest.components[type].variants[key]) {
              manifest.components[type].variants[key] = {
                count: 0,
                example: variant.example,
              };
            }
            manifest.components[type].variants[key].count += variant.count;
          });
        }

        // Keep first few examples
        if (manifest.components[type].examples.length < 3 && data.examples) {
          manifest.components[type].examples.push(...data.examples.slice(0, 3 - manifest.components[type].examples.length));
        }
      });
    }
  });

  // Detect primary UI library (most common across pages)
  const libraries = pageAnalyses.map(p => p.library).filter(Boolean);
  manifest.library = detectPrimaryLibrary(libraries);

  return manifest;
}

/**
 * Aggregate layout data from multiple pages
 */
function aggregateLayouts(layouts) {
  // Find most common layout type
  const types = layouts.map(l => l.type);
  const typeCount = {};
  types.forEach(type => {
    typeCount[type] = (typeCount[type] || 0) + 1;
  });
  const mostCommonType = Object.entries(typeCount).sort((a, b) => b[1] - a[1])[0][0];

  // Find sidebar data (if sidebar-main layout)
  const sidebar = layouts.find(l => l.sidebar)?.sidebar || null;

  // Find grid data (use first found)
  const grid = layouts.find(l => l.grid)?.grid || null;

  // Find flex data (use first found)
  const flex = layouts.find(l => l.flex)?.flex || null;

  // Aggregate container widths
  const containers = layouts.flatMap(l => l.containers || []);
  const maxWidths = containers.map(c => c.maxWidth).filter(Boolean);
  const mostCommonMaxWidth = maxWidths.length > 0 ? mode(maxWidths) : null;

  return {
    type: mostCommonType,
    sidebar,
    grid,
    flex,
    containers: {
      maxWidth: mostCommonMaxWidth,
    },
  };
}

/**
 * Detect primary UI library
 */
function detectPrimaryLibrary(libraries) {
  if (libraries.length === 0) return 'custom';

  const libNames = libraries.map(lib => {
    if (typeof lib === 'string') return lib;
    return lib.primary || lib;
  });

  const counts = {};
  libNames.forEach(lib => {
    counts[lib] = (counts[lib] || 0) + 1;
  });

  const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
  return sorted[0][0];
}

/**
 * Find mode (most common value) in array
 */
function mode(arr) {
  const counts = {};
  arr.forEach(val => {
    counts[val] = (counts[val] || 0) + 1;
  });
  const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
  return sorted[0][0];
}

/**
 * Main execution
 */
async function main() {
  const args = process.argv.slice(2);
  const referencesDir = args[0] || '../../../references';
  const outputFile = args[1] || path.join(referencesDir, 'structure-manifest.json');

  console.log('🔍 Analyzing layout and component structure...');
  console.log(`References: ${referencesDir}`);
  console.log(`Output: ${outputFile}`);

  // Check if references directory exists
  if (!fs.existsSync(referencesDir)) {
    console.error(`❌ Error: References directory not found at ${referencesDir}`);
    console.error('Run full-site-capture.js first to capture pages.');
    process.exit(1);
  }

  const htmlDir = path.join(referencesDir, 'html');
  const screenshotsDir = path.join(referencesDir, 'screenshots');

  if (!fs.existsSync(htmlDir)) {
    console.error(`❌ Error: HTML directory not found at ${htmlDir}`);
    process.exit(1);
  }

  // Get all HTML files
  const htmlFiles = fs.readdirSync(htmlDir)
    .filter(f => f.endsWith('.html'))
    .map(f => path.join(htmlDir, f));

  if (htmlFiles.length === 0) {
    console.error('❌ Error: No HTML files found to analyze');
    process.exit(1);
  }

  console.log(`\n📄 Found ${htmlFiles.length} pages to analyze\n`);

  // Launch browser
  const browser = await chromium.launch();

  // Analyze each page
  const pageAnalyses = [];
  for (const htmlFile of htmlFiles) {
    const fileName = path.basename(htmlFile, '.html');
    const screenshotFile = path.join(screenshotsDir, `${fileName}.png`);

    console.log(`Analyzing: ${fileName}...`);

    const analysis = await analyzePage(browser, htmlFile, screenshotFile);
    if (analysis) {
      pageAnalyses.push(analysis);

      // Save per-page component map
      const componentMapFile = path.join(referencesDir, `component-map-${fileName}.json`);
      fs.writeFileSync(componentMapFile, JSON.stringify({
        page: fileName,
        layout: analysis.layout,
        components: analysis.components,
        library: analysis.library,
        landmarks: analysis.landmarks,
      }, null, 2));

      console.log(`  ✓ Layout: ${analysis.layout.type}`);
      console.log(`  ✓ Library: ${typeof analysis.library === 'string' ? analysis.library : analysis.library.primary}`);
      console.log(`  ✓ Components: ${Object.keys(analysis.components).length} types detected`);
      console.log(`  ✓ Component map saved: ${componentMapFile}\n`);
    }
  }

  await browser.close();

  // Generate structure manifest
  console.log('\n📦 Generating structure manifest...');
  const structureManifest = generateStructureManifest(pageAnalyses);

  // Save structure manifest
  fs.writeFileSync(outputFile, JSON.stringify(structureManifest, null, 2));

  console.log('\n✅ Analysis complete!');
  console.log(`\nStructure manifest: ${outputFile}`);
  console.log(`Pages analyzed: ${pageAnalyses.length}`);
  console.log(`Primary layout: ${structureManifest.layout?.type || 'unknown'}`);
  console.log(`UI library: ${structureManifest.library}`);
  console.log(`Component types: ${Object.keys(structureManifest.components).join(', ')}`);

  // Print component summary
  console.log('\n📊 Component Summary:');
  Object.entries(structureManifest.components).forEach(([type, data]) => {
    console.log(`  ${type}: ${data.totalCount} instances`);
    if (data.variants && Object.keys(data.variants).length > 0) {
      console.log(`    Variants: ${Object.keys(data.variants).join(', ')}`);
    }
  });

  console.log('\n💡 Next steps:');
  console.log('  1. Review structure-manifest.json for layout patterns');
  console.log('  2. Review component-map-*.json for per-page component details');
  console.log('  3. Use this data to generate pixel-perfect prototypes');
}

// Run if called directly
if (require.main === module) {
  main().catch(error => {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  });
}

module.exports = { analyzePage, generateStructureManifest };
