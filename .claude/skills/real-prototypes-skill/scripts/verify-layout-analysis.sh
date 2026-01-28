#!/bin/bash

# Verification script for layout analysis output
# Checks that all expected files are present and valid

set -e

echo "🔍 Verifying Layout Analysis Output"
echo "===================================="
echo ""

# Get the references directory (passed as argument or use default)
REFERENCES_DIR="${1:-../../../references}"

# Check if references directory exists
if [ ! -d "$REFERENCES_DIR" ]; then
    echo "❌ Error: References directory not found at $REFERENCES_DIR"
    exit 1
fi

echo "✓ References directory exists: $REFERENCES_DIR"

# Check for structure-manifest.json
if [ ! -f "$REFERENCES_DIR/structure-manifest.json" ]; then
    echo "❌ Error: structure-manifest.json not found"
    echo "   Run: node analyze-layout.js"
    exit 1
fi

echo "✓ structure-manifest.json exists"

# Validate JSON structure (use absolute path)
MANIFEST_PATH="$(cd "$REFERENCES_DIR" && pwd)/structure-manifest.json"
if ! node -e "require('$MANIFEST_PATH')" 2>/dev/null; then
    echo "❌ Error: structure-manifest.json is not valid JSON"
    exit 1
fi

echo "✓ structure-manifest.json is valid JSON"

# Check for component maps
COMPONENT_MAPS=$(ls "$REFERENCES_DIR"/component-map-*.json 2>/dev/null | wc -l)
if [ "$COMPONENT_MAPS" -eq 0 ]; then
    echo "❌ Error: No component-map-*.json files found"
    echo "   Run: node analyze-layout.js"
    exit 1
fi

echo "✓ Found $COMPONENT_MAPS component map files"

# Extract key metrics from structure-manifest.json
echo ""
echo "📊 Analysis Metrics:"
echo "-------------------"

PAGES_ANALYZED=$(node -e "console.log(require('$MANIFEST_PATH').pagesAnalyzed)")
echo "Pages analyzed: $PAGES_ANALYZED"

UI_LIBRARY=$(node -e "console.log(require('$MANIFEST_PATH').library)")
echo "UI library: $UI_LIBRARY"

LAYOUT_TYPE=$(node -e "console.log(require('$MANIFEST_PATH').layout.type)")
echo "Layout type: $LAYOUT_TYPE"

COMPONENT_TYPES=$(node -e "console.log(Object.keys(require('$MANIFEST_PATH').components).join(', '))")
echo "Component types: $COMPONENT_TYPES"

TOTAL_COMPONENTS=$(node -e "const m=require('$MANIFEST_PATH'); console.log(Object.values(m.components).reduce((sum,c)=>sum+c.totalCount,0))")
echo "Total components: $TOTAL_COMPONENTS"

echo ""
echo "✅ All verification checks passed!"
echo ""
echo "💡 Next steps:"
echo "   1. Review structure-manifest.json for layout patterns"
echo "   2. Review component-map-*.json for page-specific details"
echo "   3. Run: node test-analyze-layout.js $REFERENCES_DIR"
