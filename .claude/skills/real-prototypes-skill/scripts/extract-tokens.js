#!/usr/bin/env node

/**
 * Design Token Extractor
 *
 * Parses HTML (and optionally CSS) files to extract design tokens including:
 * - Colors (hex, rgb, rgba, hsl)
 * - Font families
 * - Font sizes
 * - Spacing values (margin, padding)
 * - Border radius values
 *
 * Usage: node extract-tokens.js <html-file> [css-file]
 * Output: JSON object with categorized design tokens
 */

const fs = require('fs');
const path = require('path');

// Regular expressions for extracting values
const PATTERNS = {
  // Color patterns
  hex: /#([0-9a-fA-F]{3,8})\b/g,
  rgb: /rgba?\s*\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})(?:\s*,\s*([\d.]+))?\s*\)/gi,
  hsl: /hsla?\s*\(\s*(\d{1,3})\s*,\s*(\d{1,3})%\s*,\s*(\d{1,3})%(?:\s*,\s*([\d.]+))?\s*\)/gi,

  // Font patterns
  fontFamily: /font-family\s*:\s*([^;}"']+)/gi,
  fontSize: /font-size\s*:\s*([^;}"']+)/gi,

  // Spacing patterns
  margin: /margin(?:-(?:top|right|bottom|left))?\s*:\s*([^;}"']+)/gi,
  padding: /padding(?:-(?:top|right|bottom|left))?\s*:\s*([^;}"']+)/gi,
  gap: /gap\s*:\s*([^;}"']+)/gi,

  // Border radius patterns
  borderRadius: /border-radius\s*:\s*([^;}"']+)/gi,

  // Style attribute pattern
  styleAttr: /style\s*=\s*["']([^"']+)["']/gi,

  // Inline style tag content
  styleTag: /<style[^>]*>([\s\S]*?)<\/style>/gi
};

/**
 * Extract all style content from HTML
 */
function extractStyles(htmlContent, cssContent = '') {
  let allStyles = cssContent;

  // Extract inline style tags
  let match;
  while ((match = PATTERNS.styleTag.exec(htmlContent)) !== null) {
    allStyles += '\n' + match[1];
  }

  // Extract style attributes
  PATTERNS.styleAttr.lastIndex = 0;
  while ((match = PATTERNS.styleAttr.exec(htmlContent)) !== null) {
    allStyles += '\n' + match[1];
  }

  return allStyles;
}

/**
 * Extract color values from styles
 */
function extractColors(styles) {
  const colors = new Set();

  // Extract hex colors
  let match;
  PATTERNS.hex.lastIndex = 0;
  while ((match = PATTERNS.hex.exec(styles)) !== null) {
    let hex = match[0].toLowerCase();
    // Normalize 3-digit hex to 6-digit
    if (hex.length === 4) {
      hex = '#' + hex[1] + hex[1] + hex[2] + hex[2] + hex[3] + hex[3];
    }
    colors.add(hex);
  }

  // Extract rgb/rgba colors
  PATTERNS.rgb.lastIndex = 0;
  while ((match = PATTERNS.rgb.exec(styles)) !== null) {
    colors.add(match[0].toLowerCase().replace(/\s+/g, ''));
  }

  // Extract hsl/hsla colors
  PATTERNS.hsl.lastIndex = 0;
  while ((match = PATTERNS.hsl.exec(styles)) !== null) {
    colors.add(match[0].toLowerCase().replace(/\s+/g, ''));
  }

  return Array.from(colors);
}

/**
 * Extract font families from styles
 */
function extractFontFamilies(styles) {
  const fonts = new Set();
  let match;

  PATTERNS.fontFamily.lastIndex = 0;
  while ((match = PATTERNS.fontFamily.exec(styles)) !== null) {
    const fontValue = match[1].trim();
    // Split by comma and get primary font
    const primaryFont = fontValue.split(',')[0].trim().replace(/["']/g, '');
    if (primaryFont && !primaryFont.startsWith('var(')) {
      fonts.add(primaryFont);
    }
  }

  return Array.from(fonts);
}

/**
 * Extract font sizes from styles
 */
function extractFontSizes(styles) {
  const sizes = new Set();
  let match;

  PATTERNS.fontSize.lastIndex = 0;
  while ((match = PATTERNS.fontSize.exec(styles)) !== null) {
    const sizeValue = match[1].trim();
    if (!sizeValue.startsWith('var(')) {
      sizes.add(sizeValue);
    }
  }

  return Array.from(sizes);
}

/**
 * Extract spacing values from styles
 */
function extractSpacing(styles) {
  const spacing = new Set();
  let match;

  // Extract margin values
  PATTERNS.margin.lastIndex = 0;
  while ((match = PATTERNS.margin.exec(styles)) !== null) {
    parseSpacingValue(match[1]).forEach(v => spacing.add(v));
  }

  // Extract padding values
  PATTERNS.padding.lastIndex = 0;
  while ((match = PATTERNS.padding.exec(styles)) !== null) {
    parseSpacingValue(match[1]).forEach(v => spacing.add(v));
  }

  // Extract gap values
  PATTERNS.gap.lastIndex = 0;
  while ((match = PATTERNS.gap.exec(styles)) !== null) {
    parseSpacingValue(match[1]).forEach(v => spacing.add(v));
  }

  return Array.from(spacing).filter(v => v !== '0' && v !== 'auto' && !v.startsWith('var('));
}

/**
 * Parse spacing value (handles shorthand like "10px 20px 10px 20px")
 */
function parseSpacingValue(value) {
  const values = value.trim().split(/\s+/);
  return values.filter(v => v && v !== '0' && v !== 'auto' && !v.startsWith('var('));
}

/**
 * Extract border radius values from styles
 */
function extractBorderRadius(styles) {
  const radii = new Set();
  let match;

  PATTERNS.borderRadius.lastIndex = 0;
  while ((match = PATTERNS.borderRadius.exec(styles)) !== null) {
    const radiusValue = match[1].trim();
    if (!radiusValue.startsWith('var(')) {
      // Handle shorthand notation
      const values = radiusValue.split(/\s+/);
      values.forEach(v => {
        if (v && v !== '0') {
          radii.add(v);
        }
      });
    }
  }

  return Array.from(radii);
}

/**
 * Convert numeric value to comparable number (in px)
 */
function toPixels(value) {
  if (!value) return 0;
  const num = parseFloat(value);
  if (value.includes('rem')) return num * 16;
  if (value.includes('em')) return num * 16;
  if (value.includes('px')) return num;
  if (value.includes('%')) return num;
  return num;
}

/**
 * Sort values by size
 */
function sortBySize(values) {
  return [...values].sort((a, b) => toPixels(a) - toPixels(b));
}

/**
 * Categorize colors based on lightness/usage patterns
 */
function categorizeColors(colors) {
  const result = {};

  if (colors.length === 0) return result;

  // Sort colors by luminance
  const sortedColors = [...colors].sort((a, b) => {
    return getLuminance(a) - getLuminance(b);
  });

  // Assign categories based on position
  if (sortedColors.length >= 1) {
    result.text = sortedColors[0]; // Darkest
  }
  if (sortedColors.length >= 2) {
    result.background = sortedColors[sortedColors.length - 1]; // Lightest
  }
  if (sortedColors.length >= 3) {
    const midIndex = Math.floor(sortedColors.length / 2);
    result.primary = sortedColors[midIndex];
  }
  if (sortedColors.length >= 4) {
    const quarterIndex = Math.floor(sortedColors.length / 4);
    result.secondary = sortedColors[quarterIndex];
  }

  // Add remaining colors as numbered entries
  sortedColors.forEach((color, index) => {
    if (!Object.values(result).includes(color)) {
      result[`color${index + 1}`] = color;
    }
  });

  return result;
}

/**
 * Get luminance of a color for sorting
 */
function getLuminance(color) {
  let r, g, b;

  if (color.startsWith('#')) {
    const hex = color.slice(1);
    if (hex.length === 3) {
      r = parseInt(hex[0] + hex[0], 16);
      g = parseInt(hex[1] + hex[1], 16);
      b = parseInt(hex[2] + hex[2], 16);
    } else {
      r = parseInt(hex.slice(0, 2), 16);
      g = parseInt(hex.slice(2, 4), 16);
      b = parseInt(hex.slice(4, 6), 16);
    }
  } else if (color.startsWith('rgb')) {
    const match = color.match(/(\d+)/g);
    if (match) {
      [r, g, b] = match.map(Number);
    }
  } else {
    return 0.5; // Default for hsl and others
  }

  // Calculate relative luminance
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255;
}

/**
 * Categorize fonts
 */
function categorizeFonts(fonts) {
  const result = {};

  if (fonts.length === 0) return result;

  // Common heading font indicators
  const headingKeywords = ['heading', 'display', 'title', 'serif', 'playfair', 'merriweather', 'georgia'];
  const bodyKeywords = ['body', 'sans', 'inter', 'roboto', 'arial', 'helvetica', 'system'];

  fonts.forEach(font => {
    const lowerFont = font.toLowerCase();

    if (!result.heading && headingKeywords.some(kw => lowerFont.includes(kw))) {
      result.heading = font;
    } else if (!result.body && bodyKeywords.some(kw => lowerFont.includes(kw))) {
      result.body = font;
    }
  });

  // Fallback assignments
  if (!result.body && fonts.length >= 1) {
    result.body = fonts[0];
  }
  if (!result.heading && fonts.length >= 2) {
    result.heading = fonts[1];
  } else if (!result.heading && fonts.length >= 1) {
    result.heading = fonts[0];
  }

  // Add remaining fonts
  fonts.forEach((font, index) => {
    if (!Object.values(result).includes(font)) {
      result[`font${index + 1}`] = font;
    }
  });

  return result;
}

/**
 * Categorize spacing values
 */
function categorizeSpacing(spacingValues) {
  const result = {};

  if (spacingValues.length === 0) return result;

  const sorted = sortBySize(spacingValues);
  const categories = ['xs', 'sm', 'md', 'lg', 'xl', '2xl', '3xl', '4xl'];

  // Distribute values across categories
  const step = Math.max(1, Math.ceil(sorted.length / categories.length));

  sorted.forEach((value, index) => {
    const categoryIndex = Math.min(Math.floor(index / step), categories.length - 1);
    const category = categories[categoryIndex];
    if (!result[category]) {
      result[category] = value;
    }
  });

  return result;
}

/**
 * Categorize border radius values
 */
function categorizeBorderRadius(radii) {
  const result = {};

  if (radii.length === 0) return result;

  const sorted = sortBySize(radii);
  const categories = ['sm', 'md', 'lg', 'xl', 'full'];

  // Check for full/rounded values
  const fullIndex = sorted.findIndex(v =>
    v === '50%' || v === '9999px' || v === '100%' || parseFloat(v) >= 999
  );

  if (fullIndex !== -1) {
    result.full = sorted[fullIndex];
    sorted.splice(fullIndex, 1);
  }

  // Distribute remaining values
  const remainingCategories = categories.filter(c => c !== 'full');
  const step = Math.max(1, Math.ceil(sorted.length / remainingCategories.length));

  sorted.forEach((value, index) => {
    const categoryIndex = Math.min(Math.floor(index / step), remainingCategories.length - 1);
    const category = remainingCategories[categoryIndex];
    if (!result[category]) {
      result[category] = value;
    }
  });

  return result;
}

/**
 * Main extraction function
 */
function extractTokens(htmlPath, cssPath = null) {
  // Read HTML file
  if (!fs.existsSync(htmlPath)) {
    console.error(`Error: HTML file not found: ${htmlPath}`);
    process.exit(1);
  }

  const htmlContent = fs.readFileSync(htmlPath, 'utf8');

  // Read CSS file if provided
  let cssContent = '';
  if (cssPath) {
    if (!fs.existsSync(cssPath)) {
      console.error(`Warning: CSS file not found: ${cssPath}`);
    } else {
      cssContent = fs.readFileSync(cssPath, 'utf8');
    }
  }

  // Extract all styles
  const allStyles = extractStyles(htmlContent, cssContent);

  // Extract raw values
  const rawColors = extractColors(allStyles);
  const rawFonts = extractFontFamilies(allStyles);
  const rawFontSizes = extractFontSizes(allStyles);
  const rawSpacing = extractSpacing(allStyles);
  const rawBorderRadius = extractBorderRadius(allStyles);

  // Build tokens object
  const tokens = {
    colors: categorizeColors(rawColors),
    fonts: categorizeFonts(rawFonts),
    fontSizes: categorizeSpacing(rawFontSizes),
    spacing: categorizeSpacing(rawSpacing),
    borderRadius: categorizeBorderRadius(rawBorderRadius)
  };

  // Add raw values for reference
  tokens._raw = {
    colors: rawColors,
    fonts: rawFonts,
    fontSizes: rawFontSizes,
    spacing: rawSpacing,
    borderRadius: rawBorderRadius
  };

  return tokens;
}

// CLI execution
if (require.main === module) {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.log('Usage: node extract-tokens.js <html-file> [css-file]');
    console.log('');
    console.log('Extracts design tokens from HTML and CSS files.');
    console.log('');
    console.log('Arguments:');
    console.log('  html-file  Path to the HTML file to parse');
    console.log('  css-file   Optional path to additional CSS file');
    console.log('');
    console.log('Output: JSON object with categorized design tokens');
    process.exit(0);
  }

  const htmlPath = path.resolve(args[0]);
  const cssPath = args[1] ? path.resolve(args[1]) : null;

  const tokens = extractTokens(htmlPath, cssPath);

  console.log(JSON.stringify(tokens, null, 2));
}

module.exports = { extractTokens };
