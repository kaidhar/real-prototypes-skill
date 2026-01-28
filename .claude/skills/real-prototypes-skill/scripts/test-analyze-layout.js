#!/usr/bin/env node

/**
 * Test/Demo Script for analyze-layout.js
 *
 * Demonstrates how to use the structure manifest and component maps
 * to extract useful information for prototype generation.
 */

const fs = require('fs');
const path = require('path');

function testStructureManifest(manifestPath) {
  console.log('\n🧪 Testing Structure Manifest Analysis\n');
  console.log('='.repeat(60));

  // Load manifest
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));

  // 1. Basic Stats
  console.log('\n📊 BASIC STATISTICS');
  console.log('-'.repeat(60));
  console.log(`Pages Analyzed: ${manifest.pagesAnalyzed}`);
  console.log(`Generated At: ${new Date(manifest.generatedAt).toLocaleString()}`);
  console.log(`Primary UI Library: ${manifest.library}`);
  console.log(`Layout Type: ${manifest.layout.type}`);

  // 2. Component Analysis
  console.log('\n🧩 COMPONENT ANALYSIS');
  console.log('-'.repeat(60));

  Object.entries(manifest.components).forEach(([type, data]) => {
    console.log(`\n${type.toUpperCase()}:`);
    console.log(`  Total Count: ${data.totalCount}`);
    console.log(`  Variants: ${Object.keys(data.variants).join(', ')}`);

    // Show variant details
    Object.entries(data.variants).forEach(([variant, vData]) => {
      console.log(`    - ${variant}: ${vData.count} instances`);
    });

    // Show example styles
    if (data.examples && data.examples[0]) {
      const example = data.examples[0];
      console.log(`  Example Styles:`);
      console.log(`    - Background: ${example.styles.backgroundColor}`);
      console.log(`    - Color: ${example.styles.color}`);
      console.log(`    - Padding: ${example.styles.padding}`);
      console.log(`    - Border: ${example.styles.border}`);
      console.log(`    - Border Radius: ${example.styles.borderRadius}`);
      if (example.styles.boxShadow && example.styles.boxShadow !== 'none') {
        console.log(`    - Box Shadow: ${example.styles.boxShadow}`);
      }
    }
  });

  // 3. Layout Analysis
  console.log('\n📐 LAYOUT ANALYSIS');
  console.log('-'.repeat(60));

  if (manifest.layout) {
    console.log(`Layout Type: ${manifest.layout.type}`);

    if (manifest.layout.sidebar) {
      console.log('\nSidebar:');
      console.log(`  Width: ${manifest.layout.sidebar.width}`);
      console.log(`  Position: ${manifest.layout.sidebar.position}`);
    }

    if (manifest.layout.grid) {
      console.log('\nGrid System:');
      console.log(`  Columns: ${manifest.layout.grid.columns}`);
      console.log(`  Gap: ${manifest.layout.grid.gap}`);
    }

    if (manifest.layout.flex) {
      console.log('\nFlexbox:');
      console.log(`  Direction: ${manifest.layout.flex.direction}`);
      console.log(`  Justify Content: ${manifest.layout.flex.justifyContent}`);
      console.log(`  Align Items: ${manifest.layout.flex.alignItems}`);
      console.log(`  Gap: ${manifest.layout.flex.gap}`);
    }

    if (manifest.layout.containers && manifest.layout.containers.maxWidth) {
      console.log('\nContainer:');
      console.log(`  Max Width: ${manifest.layout.containers.maxWidth}`);
    }
  }

  // 4. Design Token Extraction
  console.log('\n🎨 EXTRACTED DESIGN TOKENS');
  console.log('-'.repeat(60));

  const designTokens = extractDesignTokens(manifest);

  console.log('\nColors:');
  designTokens.colors.forEach(color => {
    console.log(`  ${color.name}: ${color.value}`);
  });

  console.log('\nTypography:');
  designTokens.fonts.forEach(font => {
    console.log(`  ${font.property}: ${font.value}`);
  });

  console.log('\nSpacing:');
  designTokens.spacing.forEach(space => {
    console.log(`  ${space.name}: ${space.value}`);
  });

  console.log('\nBorder Radius:');
  designTokens.borderRadius.forEach(radius => {
    console.log(`  ${radius.name}: ${radius.value}`);
  });

  // 5. Recommendations
  console.log('\n💡 RECOMMENDATIONS FOR PROTOTYPE GENERATION');
  console.log('-'.repeat(60));

  if (manifest.library === 'material-ui') {
    console.log('✓ Use @mui/material for components');
    console.log('✓ Install: npm install @mui/material @emotion/react @emotion/styled');
  } else if (manifest.library === 'custom') {
    console.log('✓ Build custom components using extracted styles');
    console.log('✓ Use shadcn/ui as base and customize with extracted tokens');
  }

  console.log('\nLayout Recommendation:');
  if (manifest.layout.type === 'sidebar-main') {
    console.log('✓ Create sidebar layout with fixed navigation');
  } else if (manifest.layout.type === 'single-main') {
    console.log('✓ Create single column layout with header navigation');
  } else {
    console.log('✓ Analyze component-map files for specific page layouts');
  }

  console.log('\nComponent Priority:');
  const sortedComponents = Object.entries(manifest.components)
    .sort((a, b) => b[1].totalCount - a[1].totalCount);

  sortedComponents.slice(0, 3).forEach(([type, data]) => {
    console.log(`✓ ${type}: ${data.totalCount} instances - HIGH PRIORITY`);
  });

  console.log('\n' + '='.repeat(60));
}

/**
 * Extract design tokens from manifest
 */
function extractDesignTokens(manifest) {
  const tokens = {
    colors: [],
    fonts: [],
    spacing: [],
    borderRadius: [],
  };

  // Extract colors from components
  const colorSet = new Set();
  Object.values(manifest.components).forEach(component => {
    if (component.examples) {
      component.examples.forEach(example => {
        if (example.styles) {
          if (example.styles.backgroundColor && example.styles.backgroundColor !== 'rgba(0, 0, 0, 0)') {
            colorSet.add(example.styles.backgroundColor);
          }
          if (example.styles.color && example.styles.color !== 'inherit') {
            colorSet.add(example.styles.color);
          }
        }
      });
    }
  });

  let colorIndex = 1;
  colorSet.forEach(color => {
    tokens.colors.push({
      name: `color-${colorIndex++}`,
      value: color,
    });
  });

  // Extract fonts
  const fontSet = new Set();
  const fontSizeSet = new Set();
  const fontWeightSet = new Set();

  Object.values(manifest.components).forEach(component => {
    if (component.examples) {
      component.examples.forEach(example => {
        if (example.styles) {
          if (example.styles.fontFamily) {
            fontSet.add(example.styles.fontFamily);
          }
          if (example.styles.fontSize) {
            fontSizeSet.add(example.styles.fontSize);
          }
          if (example.styles.fontWeight) {
            fontWeightSet.add(example.styles.fontWeight);
          }
        }
      });
    }
  });

  fontSet.forEach(font => {
    tokens.fonts.push({ property: 'fontFamily', value: font });
  });
  Array.from(fontSizeSet).sort().forEach(size => {
    tokens.fonts.push({ property: 'fontSize', value: size });
  });
  Array.from(fontWeightSet).sort().forEach(weight => {
    tokens.fonts.push({ property: 'fontWeight', value: weight });
  });

  // Extract spacing
  const spacingSet = new Set();
  Object.values(manifest.components).forEach(component => {
    if (component.examples) {
      component.examples.forEach(example => {
        if (example.styles) {
          if (example.styles.padding && example.styles.padding !== '0px') {
            spacingSet.add(example.styles.padding);
          }
          if (example.styles.margin && example.styles.margin !== '0px') {
            spacingSet.add(example.styles.margin);
          }
        }
      });
    }
  });

  let spacingIndex = 1;
  spacingSet.forEach(spacing => {
    tokens.spacing.push({
      name: `spacing-${spacingIndex++}`,
      value: spacing,
    });
  });

  // Extract border radius
  const radiusSet = new Set();
  Object.values(manifest.components).forEach(component => {
    if (component.examples) {
      component.examples.forEach(example => {
        if (example.styles && example.styles.borderRadius && example.styles.borderRadius !== '0px') {
          radiusSet.add(example.styles.borderRadius);
        }
      });
    }
  });

  let radiusIndex = 1;
  radiusSet.forEach(radius => {
    tokens.borderRadius.push({
      name: `radius-${radiusIndex++}`,
      value: radius,
    });
  });

  return tokens;
}

/**
 * Test component map
 */
function testComponentMap(componentMapPath) {
  console.log('\n🧪 Testing Component Map\n');
  console.log('='.repeat(60));

  const componentMap = JSON.parse(fs.readFileSync(componentMapPath, 'utf-8'));

  console.log(`\nPage: ${componentMap.page}`);
  console.log(`Layout Type: ${componentMap.layout.type}`);
  console.log(`UI Library: ${typeof componentMap.library === 'string' ? componentMap.library : componentMap.library.primary}`);

  console.log('\n📍 Landmarks:');
  if (componentMap.landmarks.header) {
    console.log('  ✓ Header found');
  }
  if (componentMap.landmarks.navigation.length > 0) {
    console.log(`  ✓ ${componentMap.landmarks.navigation.length} Navigation element(s) found`);
  }
  if (componentMap.landmarks.main) {
    console.log('  ✓ Main content area found');
  }
  if (componentMap.landmarks.aside.length > 0) {
    console.log(`  ✓ ${componentMap.landmarks.aside.length} Sidebar(s) found`);
  }
  if (componentMap.landmarks.footer) {
    console.log('  ✓ Footer found');
  }

  console.log('\n🧩 Components on this page:');
  Object.entries(componentMap.components).forEach(([type, data]) => {
    console.log(`  ${type}: ${data.count} instances`);
  });

  console.log('\n' + '='.repeat(60));
}

/**
 * Main execution
 */
function main() {
  const args = process.argv.slice(2);
  const referencesDir = args[0] || '../../../references';

  const structureManifestPath = path.join(referencesDir, 'structure-manifest.json');

  if (!fs.existsSync(structureManifestPath)) {
    console.error('❌ Error: structure-manifest.json not found');
    console.error(`   Expected at: ${structureManifestPath}`);
    console.error('\n💡 Run analyze-layout.js first to generate the manifest');
    process.exit(1);
  }

  // Test structure manifest
  testStructureManifest(structureManifestPath);

  // Test component maps (pick first one)
  const componentMapFiles = fs.readdirSync(referencesDir)
    .filter(f => f.startsWith('component-map-') && f.endsWith('.json'));

  if (componentMapFiles.length > 0) {
    const firstMap = path.join(referencesDir, componentMapFiles[0]);
    testComponentMap(firstMap);
  }

  console.log('\n✅ All tests passed!\n');
}

if (require.main === module) {
  main();
}

module.exports = { testStructureManifest, testComponentMap, extractDesignTokens };
