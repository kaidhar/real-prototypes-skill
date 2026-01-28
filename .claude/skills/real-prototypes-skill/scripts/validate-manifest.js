#!/usr/bin/env node

/**
 * validate-manifest.js
 *
 * Validates a manifest.json file against the manifest schema.
 * Uses only Node.js built-in modules (no external dependencies like Ajv).
 *
 * Usage:
 *   node validate-manifest.js <manifest-path>
 *   node validate-manifest.js <manifest-path> [schema-path]
 *
 * Arguments:
 *   manifest-path  Path to the manifest.json file to validate
 *   schema-path    Optional path to schema file (defaults to manifest-schema.json in same directory)
 *
 * Example:
 *   node validate-manifest.js ./references/manifest.json
 */

const fs = require('fs');
const path = require('path');

// Validation result tracking
let errors = [];
let warnings = [];

/**
 * Parse command line arguments
 */
function parseArgs() {
  const args = process.argv.slice(2);

  if (args.length < 1) {
    console.error('Usage: node validate-manifest.js <manifest-path> [schema-path]');
    console.error('');
    console.error('Arguments:');
    console.error('  manifest-path  Path to the manifest.json file to validate');
    console.error('  schema-path    Optional path to schema file (defaults to manifest-schema.json)');
    process.exit(1);
  }

  const scriptDir = path.dirname(__filename);

  return {
    manifestPath: path.resolve(args[0]),
    schemaPath: args[1] ? path.resolve(args[1]) : path.join(scriptDir, 'manifest-schema.json')
  };
}

/**
 * Load and parse a JSON file
 */
function loadJsonFile(filePath, description) {
  if (!fs.existsSync(filePath)) {
    console.error(`Error: ${description} not found: ${filePath}`);
    process.exit(1);
  }

  try {
    const content = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(content);
  } catch (err) {
    if (err instanceof SyntaxError) {
      console.error(`Error: Invalid JSON in ${description}: ${err.message}`);
    } else {
      console.error(`Error reading ${description}: ${err.message}`);
    }
    process.exit(1);
  }
}

/**
 * Add an error to the validation results
 */
function addError(path, message) {
  errors.push({ path, message });
}

/**
 * Add a warning to the validation results
 */
function addWarning(path, message) {
  warnings.push({ path, message });
}

/**
 * Get the type of a value (more specific than typeof)
 */
function getType(value) {
  if (value === null) return 'null';
  if (Array.isArray(value)) return 'array';
  return typeof value;
}

/**
 * Validate a value matches the expected type
 */
function validateType(value, expectedType, path) {
  const actualType = getType(value);

  if (expectedType === 'array') {
    if (!Array.isArray(value)) {
      addError(path, `Expected array, got ${actualType}`);
      return false;
    }
  } else if (expectedType === 'object') {
    if (actualType !== 'object' || Array.isArray(value) || value === null) {
      addError(path, `Expected object, got ${actualType}`);
      return false;
    }
  } else if (expectedType === 'string') {
    if (typeof value !== 'string') {
      addError(path, `Expected string, got ${actualType}`);
      return false;
    }
  } else if (expectedType === 'number') {
    if (typeof value !== 'number') {
      addError(path, `Expected number, got ${actualType}`);
      return false;
    }
  } else if (expectedType === 'boolean') {
    if (typeof value !== 'boolean') {
      addError(path, `Expected boolean, got ${actualType}`);
      return false;
    }
  } else if (expectedType === 'integer') {
    if (typeof value !== 'number' || !Number.isInteger(value)) {
      addError(path, `Expected integer, got ${actualType}`);
      return false;
    }
  }

  return true;
}

/**
 * Validate string format
 */
function validateFormat(value, format, path) {
  if (typeof value !== 'string') return true;

  switch (format) {
    case 'uri':
      try {
        new URL(value);
      } catch {
        addError(path, `Invalid URI format: ${value}`);
        return false;
      }
      break;
    case 'date-time':
      const date = new Date(value);
      if (isNaN(date.getTime())) {
        addError(path, `Invalid date-time format: ${value}`);
        return false;
      }
      break;
    case 'email':
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
        addWarning(path, `Possibly invalid email format: ${value}`);
      }
      break;
  }

  return true;
}

/**
 * Validate a string against a pattern
 */
function validatePattern(value, pattern, path) {
  if (typeof value !== 'string') return true;

  try {
    const regex = new RegExp(pattern);
    if (!regex.test(value)) {
      addError(path, `Value "${value}" does not match pattern: ${pattern}`);
      return false;
    }
  } catch (err) {
    addWarning(path, `Invalid pattern in schema: ${pattern}`);
  }

  return true;
}

/**
 * Validate enum values
 */
function validateEnum(value, enumValues, path) {
  if (!enumValues.includes(value)) {
    addError(path, `Value "${value}" not in allowed values: ${enumValues.join(', ')}`);
    return false;
  }
  return true;
}

/**
 * Validate string length constraints
 */
function validateStringLength(value, schema, path) {
  if (typeof value !== 'string') return true;

  if (schema.minLength !== undefined && value.length < schema.minLength) {
    addError(path, `String length ${value.length} is less than minimum ${schema.minLength}`);
    return false;
  }

  if (schema.maxLength !== undefined && value.length > schema.maxLength) {
    addError(path, `String length ${value.length} exceeds maximum ${schema.maxLength}`);
    return false;
  }

  return true;
}

/**
 * Validate array constraints
 */
function validateArray(value, schema, path) {
  if (!Array.isArray(value)) return true;

  let valid = true;

  if (schema.minItems !== undefined && value.length < schema.minItems) {
    addError(path, `Array length ${value.length} is less than minimum ${schema.minItems}`);
    valid = false;
  }

  if (schema.maxItems !== undefined && value.length > schema.maxItems) {
    addError(path, `Array length ${value.length} exceeds maximum ${schema.maxItems}`);
    valid = false;
  }

  // Validate items
  if (schema.items && value.length > 0) {
    for (let i = 0; i < value.length; i++) {
      if (!validateValue(value[i], schema.items, `${path}[${i}]`)) {
        valid = false;
      }
    }
  }

  return valid;
}

/**
 * Validate object against schema
 */
function validateObject(value, schema, path) {
  if (getType(value) !== 'object') return true;

  let valid = true;

  // Check required properties
  if (schema.required) {
    for (const prop of schema.required) {
      if (!(prop in value)) {
        addError(path, `Missing required property: ${prop}`);
        valid = false;
      }
    }
  }

  // Validate defined properties
  if (schema.properties) {
    for (const [propName, propSchema] of Object.entries(schema.properties)) {
      if (propName in value) {
        if (!validateValue(value[propName], propSchema, `${path}.${propName}`)) {
          valid = false;
        }
      }
    }
  }

  // Check for additional properties
  if (schema.additionalProperties === false) {
    const allowedProps = new Set(Object.keys(schema.properties || {}));
    for (const prop of Object.keys(value)) {
      if (!allowedProps.has(prop)) {
        addWarning(path, `Unexpected property: ${prop}`);
      }
    }
  } else if (typeof schema.additionalProperties === 'object') {
    // Validate additional properties against schema
    const definedProps = new Set(Object.keys(schema.properties || {}));
    for (const [propName, propValue] of Object.entries(value)) {
      if (!definedProps.has(propName)) {
        if (!validateValue(propValue, schema.additionalProperties, `${path}.${propName}`)) {
          valid = false;
        }
      }
    }
  }

  return valid;
}

/**
 * Main validation function for any value
 */
function validateValue(value, schema, path = '$') {
  if (!schema) return true;

  let valid = true;

  // Handle type validation
  if (schema.type) {
    if (!validateType(value, schema.type, path)) {
      return false; // Stop validation if type doesn't match
    }
  }

  // Handle format validation
  if (schema.format) {
    if (!validateFormat(value, schema.format, path)) {
      valid = false;
    }
  }

  // Handle pattern validation
  if (schema.pattern) {
    if (!validatePattern(value, schema.pattern, path)) {
      valid = false;
    }
  }

  // Handle enum validation
  if (schema.enum) {
    if (!validateEnum(value, schema.enum, path)) {
      valid = false;
    }
  }

  // Handle string constraints
  if (schema.type === 'string') {
    if (!validateStringLength(value, schema, path)) {
      valid = false;
    }
  }

  // Handle array validation
  if (schema.type === 'array' || Array.isArray(value)) {
    if (!validateArray(value, schema, path)) {
      valid = false;
    }
  }

  // Handle object validation
  if (schema.type === 'object' || (getType(value) === 'object' && schema.properties)) {
    if (!validateObject(value, schema, path)) {
      valid = false;
    }
  }

  return valid;
}

/**
 * Additional semantic validations specific to manifest files
 */
function validateManifestSemantics(manifest) {
  // Check for duplicate page IDs
  if (manifest.pages && Array.isArray(manifest.pages)) {
    const pageIds = new Set();
    for (const page of manifest.pages) {
      if (page.id) {
        if (pageIds.has(page.id)) {
          addError('$.pages', `Duplicate page ID: ${page.id}`);
        }
        pageIds.add(page.id);
      }
    }
  }

  // Validate screenshot files exist (warning only)
  if (manifest.pages) {
    for (const page of manifest.pages) {
      if (page.screenshots) {
        for (const screenshot of page.screenshots) {
          if (screenshot.file && !screenshot.file.match(/\.(png|jpg|jpeg|webp|gif)$/i)) {
            addWarning(`$.pages[${page.id}].screenshots`,
              `Unusual screenshot extension: ${screenshot.file}`);
          }
        }
      }
    }
  }

  // Check platform URL is valid
  if (manifest.platform && manifest.platform.url) {
    try {
      new URL(manifest.platform.url);
    } catch {
      addError('$.platform.url', `Invalid URL: ${manifest.platform.url}`);
    }
  }

  // Warn if no pages defined
  if (!manifest.pages || manifest.pages.length === 0) {
    addWarning('$.pages', 'Manifest has no pages defined');
  }

  // Warn if design tokens are empty
  if (manifest.designTokens) {
    const hasColors = manifest.designTokens.colors &&
      Object.keys(manifest.designTokens.colors).length > 0;
    const hasTypography = manifest.designTokens.typography &&
      Object.keys(manifest.designTokens.typography).length > 0;

    if (!hasColors && !hasTypography) {
      addWarning('$.designTokens', 'Design tokens are empty - consider adding colors and typography');
    }
  }
}

/**
 * Print validation results
 */
function printResults() {
  const hasErrors = errors.length > 0;
  const hasWarnings = warnings.length > 0;

  if (!hasErrors && !hasWarnings) {
    console.log('Validation passed! No errors or warnings.');
    return true;
  }

  if (hasErrors) {
    console.log(`\nErrors (${errors.length}):`);
    for (const error of errors) {
      console.log(`  [ERROR] ${error.path}: ${error.message}`);
    }
  }

  if (hasWarnings) {
    console.log(`\nWarnings (${warnings.length}):`);
    for (const warning of warnings) {
      console.log(`  [WARN]  ${warning.path}: ${warning.message}`);
    }
  }

  console.log('');

  if (hasErrors) {
    console.log('Validation FAILED with errors.');
    return false;
  } else {
    console.log('Validation passed with warnings.');
    return true;
  }
}

/**
 * Main execution
 */
function main() {
  const { manifestPath, schemaPath } = parseArgs();

  console.log('Manifest Validation');
  console.log('===================');
  console.log(`Manifest: ${manifestPath}`);
  console.log(`Schema:   ${schemaPath}`);
  console.log('');

  // Reset validation state
  errors = [];
  warnings = [];

  // Load files
  const manifest = loadJsonFile(manifestPath, 'Manifest file');
  const schema = loadJsonFile(schemaPath, 'Schema file');

  // Validate against schema
  console.log('Validating against schema...');
  validateValue(manifest, schema);

  // Run semantic validations
  console.log('Running semantic validations...');
  validateManifestSemantics(manifest);

  // Print results
  const success = printResults();

  process.exit(success ? 0 : 1);
}

// Run if executed directly
if (require.main === module) {
  main();
}

// Export for testing
module.exports = {
  validateValue,
  validateManifestSemantics,
  loadJsonFile
};
