#!/bin/bash

###############################################################################
# Accessibility Integration Script
#
# Integrates accessibility validation into the prototype build process
# Installs dependencies, configures ESLint, and runs validation
###############################################################################

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../../../.." && pwd)"
PROTOTYPE_DIR="$PROJECT_ROOT/prototype"

echo "=================================================="
echo "Accessibility Integration Script"
echo "=================================================="
echo ""
echo "Project Root: $PROJECT_ROOT"
echo "Prototype Dir: $PROTOTYPE_DIR"
echo ""

# Check if prototype directory exists
if [ ! -d "$PROTOTYPE_DIR" ]; then
  echo "❌ Error: Prototype directory not found at $PROTOTYPE_DIR"
  echo "   Run setup-prototype.sh first to create the prototype project"
  exit 1
fi

cd "$PROTOTYPE_DIR"

# Step 1: Install accessibility dependencies
echo "📦 Installing accessibility dependencies..."
echo ""

if [ -f "package.json" ]; then
  # Check if dependencies are already installed
  if grep -q "eslint-plugin-jsx-a11y" package.json; then
    echo "✅ Accessibility dependencies already in package.json"
  else
    echo "Adding dependencies to package.json..."
    npm install --save-dev \
      eslint@^8.57.0 \
      eslint-config-next@^15.1.4 \
      eslint-plugin-jsx-a11y@^6.10.2
  fi

  # Ensure dependencies are installed
  npm install
  echo "✅ Dependencies installed"
else
  echo "❌ Error: package.json not found"
  exit 1
fi

echo ""

# Step 2: Create/update ESLint configuration
echo "🔧 Configuring ESLint for accessibility..."
echo ""

ESLINT_CONFIG="$PROTOTYPE_DIR/.eslintrc.json"

if [ -f "$ESLINT_CONFIG" ]; then
  echo "✅ ESLint config already exists at $ESLINT_CONFIG"
else
  echo "Creating ESLint configuration..."
  cp "$SCRIPT_DIR/../.eslintrc.json.template" "$ESLINT_CONFIG" 2>/dev/null || {
    echo "Template not found, using built-in config..."
    cat > "$ESLINT_CONFIG" <<'EOF'
{
  "extends": [
    "next/core-web-vitals",
    "plugin:jsx-a11y/recommended"
  ],
  "plugins": ["jsx-a11y"],
  "rules": {
    "jsx-a11y/alt-text": "error",
    "jsx-a11y/anchor-has-content": "error",
    "jsx-a11y/anchor-is-valid": "error",
    "jsx-a11y/aria-props": "error",
    "jsx-a11y/aria-role": "error",
    "jsx-a11y/click-events-have-key-events": "error",
    "jsx-a11y/heading-has-content": "error",
    "jsx-a11y/interactive-supports-focus": "error",
    "jsx-a11y/label-has-associated-control": "error",
    "jsx-a11y/no-noninteractive-element-interactions": "error",
    "jsx-a11y/role-has-required-aria-props": "error"
  }
}
EOF
  }
  echo "✅ ESLint config created"
fi

echo ""

# Step 3: Update package.json scripts
echo "📝 Adding accessibility validation scripts..."
echo ""

if grep -q "validate:a11y" package.json; then
  echo "✅ Validation scripts already in package.json"
else
  # Add scripts using node
  node -e "
    const fs = require('fs');
    const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
    pkg.scripts = pkg.scripts || {};
    pkg.scripts['lint:a11y'] = 'eslint . --ext .ts,.tsx,.js,.jsx';
    pkg.scripts['validate:a11y'] = 'node ../.claude/skills/real-prototypes/scripts/validate-accessibility.js . --verbose';
    fs.writeFileSync('package.json', JSON.stringify(pkg, null, 2));
  "
  echo "✅ Scripts added to package.json"
fi

echo ""

# Step 4: Create references directory if needed
echo "📁 Ensuring references directory exists..."
echo ""

REFERENCES_DIR="$PROJECT_ROOT/references"
if [ ! -d "$REFERENCES_DIR" ]; then
  mkdir -p "$REFERENCES_DIR"
  echo "✅ Created references directory"
else
  echo "✅ References directory exists"
fi

echo ""

# Step 5: Run initial validation
echo "🔍 Running initial accessibility validation..."
echo ""

node "$SCRIPT_DIR/validate-accessibility.js" "$PROTOTYPE_DIR" --verbose

echo ""
echo "=================================================="
echo "✅ Accessibility Integration Complete!"
echo "=================================================="
echo ""
echo "Next steps:"
echo ""
echo "1. Review the accessibility report:"
echo "   → $REFERENCES_DIR/accessibility-report.json"
echo ""
echo "2. Review fixes documentation:"
echo "   → $REFERENCES_DIR/accessibility-fixes.md"
echo ""
echo "3. Run validation anytime:"
echo "   → npm run validate:a11y"
echo ""
echo "4. Run ESLint for accessibility:"
echo "   → npm run lint:a11y"
echo ""
echo "5. Fix any issues found and re-run validation"
echo ""
echo "=================================================="
