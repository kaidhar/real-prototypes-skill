#!/bin/bash

# Setup script for creating a new Next.js prototype project
# Usage: ./setup-prototype.sh [project-name]

PROJECT_NAME=${1:-prototype}
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SKILL_DIR="$(dirname "$SCRIPT_DIR")"
ROOT_DIR="$(dirname "$(dirname "$(dirname "$SKILL_DIR")")")"

echo "Setting up prototype project: $PROJECT_NAME"

# Check if project already exists
if [ -d "$ROOT_DIR/$PROJECT_NAME" ]; then
    echo "Project directory already exists. Skipping scaffold."
else
    echo "Creating Next.js project..."
    cd "$ROOT_DIR"
    npx create-next-app@latest "$PROJECT_NAME" \
        --typescript \
        --tailwind \
        --eslint \
        --app \
        --src-dir \
        --no-import-alias \
        --use-npm
fi

cd "$ROOT_DIR/$PROJECT_NAME"

# Initialize shadcn/ui
echo "Initializing shadcn/ui..."
npx shadcn@latest init -d -y

# Add common components
echo "Adding shadcn/ui components..."
npx shadcn@latest add button card input label dialog table tabs -y

# Create platform color tokens in tailwind config
echo "Updating Tailwind config with platform tokens..."
cat > tailwind.config.ts << 'EOF'
import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        platform: {
          primary: "var(--platform-primary, #3B82F6)",
          secondary: "var(--platform-secondary, #10B981)",
          background: "var(--platform-background, #FFFFFF)",
          foreground: "var(--platform-foreground, #1F2937)",
          muted: "var(--platform-muted, #F3F4F6)",
          border: "var(--platform-border, #E5E7EB)",
        },
      },
      fontFamily: {
        platform: ["var(--platform-font, Inter)", "sans-serif"],
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};

export default config;
EOF

# Create CSS variables file
mkdir -p src/styles
cat > src/styles/platform-tokens.css << 'EOF'
/* Platform Design Tokens
   These values will be replaced by the extract-tokens script
   based on the captured platform styles */

:root {
  --platform-primary: #3B82F6;
  --platform-secondary: #10B981;
  --platform-background: #FFFFFF;
  --platform-foreground: #1F2937;
  --platform-muted: #F3F4F6;
  --platform-border: #E5E7EB;
  --platform-font: "Inter", sans-serif;
}
EOF

# Update global CSS to import tokens
cat > src/app/globals.css << 'EOF'
@import "../styles/platform-tokens.css";
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  * {
    @apply border-platform-border;
  }
  body {
    @apply bg-platform-background text-platform-foreground font-platform;
  }
}
EOF

# Create features directory
mkdir -p src/components/features

# Create example feature component
cat > src/components/features/ExampleFeature.tsx << 'EOF'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface ExampleFeatureProps {
  title?: string;
}

export function ExampleFeature({ title = "New Feature" }: ExampleFeatureProps) {
  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle className="text-platform-primary">{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-platform-foreground/80">
          This is a prototype feature matching your platform&apos;s design.
        </p>
        <Button className="bg-platform-primary hover:bg-platform-primary/90">
          Take Action
        </Button>
      </CardContent>
    </Card>
  );
}
EOF

# Create feature page
mkdir -p src/app/feature
cat > src/app/feature/page.tsx << 'EOF'
import { ExampleFeature } from "@/components/features/ExampleFeature";

export default function FeaturePage() {
  return (
    <main className="min-h-screen bg-platform-background p-8">
      <div className="max-w-4xl mx-auto space-y-8">
        <h1 className="text-3xl font-bold text-platform-foreground">
          Feature Prototype
        </h1>
        <ExampleFeature title="Your New Feature" />
      </div>
    </main>
  );
}
EOF

echo ""
echo "✓ Prototype project setup complete!"
echo ""
echo "Next steps:"
echo "  cd $PROJECT_NAME"
echo "  npm run dev"
echo ""
echo "View prototype at: http://localhost:3000/feature"
EOF
