#!/usr/bin/env node

/**
 * Tailwind Config Generator
 *
 * Takes design tokens JSON (from extract-tokens.js) and generates
 * a Tailwind CSS configuration extend section.
 *
 * Usage:
 *   node generate-tailwind-config.js <tokens.json>
 *   node extract-tokens.js index.html | node generate-tailwind-config.js
 *
 * Output: TypeScript tailwind.config.ts extend section
 */

const fs = require('fs');
const path = require('path');

/**
 * Convert color name to Tailwind-friendly key
 */
function normalizeKey(key) {
  return key
    .replace(/([A-Z])/g, '-$1')
    .toLowerCase()
    .replace(/^-/, '')
    .replace(/[^a-z0-9-]/g, '-')
    .replace(/-+/g, '-');
}

/**
 * Generate Tailwind colors configuration
 */
function generateColors(colors) {
  const result = {};

  Object.entries(colors).forEach(([key, value]) => {
    const normalizedKey = normalizeKey(key);
    result[normalizedKey] = value;
  });

  return result;
}

/**
 * Generate Tailwind font family configuration
 */
function generateFontFamily(fonts) {
  const result = {};

  Object.entries(fonts).forEach(([key, value]) => {
    const normalizedKey = normalizeKey(key);
    // Wrap font name properly for Tailwind
    result[normalizedKey] = [value, 'sans-serif'];
  });

  return result;
}

/**
 * Generate Tailwind font size configuration
 */
function generateFontSize(fontSizes) {
  const result = {};

  Object.entries(fontSizes).forEach(([key, value]) => {
    result[key] = value;
  });

  return result;
}

/**
 * Generate Tailwind spacing configuration
 */
function generateSpacing(spacing) {
  const result = {};

  Object.entries(spacing).forEach(([key, value]) => {
    result[key] = value;
  });

  return result;
}

/**
 * Generate Tailwind border radius configuration
 */
function generateBorderRadius(borderRadius) {
  const result = {};

  Object.entries(borderRadius).forEach(([key, value]) => {
    result[key] = value;
  });

  return result;
}

/**
 * Generate the full Tailwind config extend section
 */
function generateTailwindConfig(tokens) {
  const config = {
    colors: generateColors(tokens.colors || {}),
    fontFamily: generateFontFamily(tokens.fonts || {}),
    fontSize: generateFontSize(tokens.fontSizes || {}),
    spacing: generateSpacing(tokens.spacing || {}),
    borderRadius: generateBorderRadius(tokens.borderRadius || {})
  };

  // Remove empty objects
  Object.keys(config).forEach(key => {
    if (Object.keys(config[key]).length === 0) {
      delete config[key];
    }
  });

  return config;
}

/**
 * Format the config as TypeScript
 */
function formatAsTypeScript(config) {
  const lines = [
    '// Generated Tailwind CSS configuration',
    '// Add this to your tailwind.config.ts in the theme.extend section',
    '',
    'import type { Config } from "tailwindcss";',
    '',
    'const config: Config = {',
    '  content: [',
    '    "./src/**/*.{js,ts,jsx,tsx,mdx}",',
    '    "./app/**/*.{js,ts,jsx,tsx,mdx}",',
    '    "./components/**/*.{js,ts,jsx,tsx,mdx}",',
    '  ],',
    '  theme: {',
    '    extend: {'
  ];

  // Add colors
  if (config.colors && Object.keys(config.colors).length > 0) {
    lines.push('      colors: {');
    Object.entries(config.colors).forEach(([key, value]) => {
      lines.push(`        "${key}": "${value}",`);
    });
    lines.push('      },');
  }

  // Add font families
  if (config.fontFamily && Object.keys(config.fontFamily).length > 0) {
    lines.push('      fontFamily: {');
    Object.entries(config.fontFamily).forEach(([key, value]) => {
      const fontList = Array.isArray(value) ? value : [value];
      lines.push(`        "${key}": ${JSON.stringify(fontList)},`);
    });
    lines.push('      },');
  }

  // Add font sizes
  if (config.fontSize && Object.keys(config.fontSize).length > 0) {
    lines.push('      fontSize: {');
    Object.entries(config.fontSize).forEach(([key, value]) => {
      lines.push(`        "${key}": "${value}",`);
    });
    lines.push('      },');
  }

  // Add spacing
  if (config.spacing && Object.keys(config.spacing).length > 0) {
    lines.push('      spacing: {');
    Object.entries(config.spacing).forEach(([key, value]) => {
      lines.push(`        "${key}": "${value}",`);
    });
    lines.push('      },');
  }

  // Add border radius
  if (config.borderRadius && Object.keys(config.borderRadius).length > 0) {
    lines.push('      borderRadius: {');
    Object.entries(config.borderRadius).forEach(([key, value]) => {
      lines.push(`        "${key}": "${value}",`);
    });
    lines.push('      },');
  }

  lines.push('    },');
  lines.push('  },');
  lines.push('  plugins: [],');
  lines.push('};');
  lines.push('');
  lines.push('export default config;');

  return lines.join('\n');
}

/**
 * Format just the extend section as JSON (for partial use)
 */
function formatAsExtendSection(config) {
  return JSON.stringify(config, null, 2);
}

/**
 * Read tokens from stdin or file
 */
async function readTokens(inputPath) {
  if (inputPath) {
    // Read from file
    const resolvedPath = path.resolve(inputPath);
    if (!fs.existsSync(resolvedPath)) {
      console.error(`Error: File not found: ${resolvedPath}`);
      process.exit(1);
    }
    const content = fs.readFileSync(resolvedPath, 'utf8');
    return JSON.parse(content);
  } else {
    // Read from stdin
    return new Promise((resolve, reject) => {
      let data = '';
      process.stdin.setEncoding('utf8');

      process.stdin.on('readable', () => {
        let chunk;
        while ((chunk = process.stdin.read()) !== null) {
          data += chunk;
        }
      });

      process.stdin.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (err) {
          reject(new Error('Invalid JSON input'));
        }
      });

      process.stdin.on('error', reject);

      // Set timeout for stdin
      setTimeout(() => {
        if (data === '') {
          reject(new Error('No input received. Provide a file path or pipe JSON data.'));
        }
      }, 100);
    });
  }
}

// CLI execution
async function main() {
  const args = process.argv.slice(2);

  // Check for help flag
  if (args.includes('--help') || args.includes('-h')) {
    console.log('Usage: node generate-tailwind-config.js [options] [tokens.json]');
    console.log('');
    console.log('Generates Tailwind CSS configuration from design tokens.');
    console.log('');
    console.log('Arguments:');
    console.log('  tokens.json    Path to tokens JSON file (or pipe from stdin)');
    console.log('');
    console.log('Options:');
    console.log('  --extend-only  Output only the extend section as JSON');
    console.log('  --help, -h     Show this help message');
    console.log('');
    console.log('Examples:');
    console.log('  node generate-tailwind-config.js tokens.json');
    console.log('  node extract-tokens.js index.html | node generate-tailwind-config.js');
    console.log('  node generate-tailwind-config.js tokens.json --extend-only');
    process.exit(0);
  }

  const extendOnly = args.includes('--extend-only');
  const inputPath = args.find(arg => !arg.startsWith('--'));

  try {
    const tokens = await readTokens(inputPath);
    const config = generateTailwindConfig(tokens);

    if (extendOnly) {
      console.log(formatAsExtendSection(config));
    } else {
      console.log(formatAsTypeScript(config));
    }
  } catch (err) {
    console.error(`Error: ${err.message}`);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { generateTailwindConfig, formatAsTypeScript, formatAsExtendSection };
