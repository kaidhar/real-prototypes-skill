# Quick Start Guide

Get started with Platform Prototype Skill in 5 minutes.

---

## 1️⃣ Install (1 minute)

```bash
cd ~/.claude/skills
git clone https://github.com/kaidhar/platform-prototype-skill.git
```

## 2️⃣ Open Claude Code

```bash
cd your-project
claude-code
```

## 3️⃣ Tell Claude What You Want

```
I want to create a shopping cart modal for Amazon India
that matches their design. It should show items, quantities,
and a checkout button.
```

## 4️⃣ Watch Claude Work

Claude will automatically:
- ✅ Capture Amazon India's design
- ✅ Extract colors and fonts
- ✅ Generate a Next.js component
- ✅ Create functional cart logic

## 5️⃣ Run Your Prototype

```bash
cd projects/amazon-cart/prototype
npm install
npm run dev
```

Open http://localhost:3000 🎉

---

## 📖 What Happens Behind the Scenes

### Phase 1: Capture (30 seconds)
- Opens https://www.amazon.in
- Takes screenshots
- Extracts design tokens
- Saves to `references/`

### Phase 2: Generate (1 minute)
- Creates Next.js + TypeScript project
- Builds React components
- Applies exact colors from capture
- Adds functional features

### Phase 3: You Run It!
- `npm install` - Install dependencies
- `npm run dev` - Start server
- View at localhost:3000

---

## 💡 Try These Examples

### E-commerce Checkout
```
Create a checkout flow for Shopify that matches their admin design
```

### Dashboard Widget
```
Build a notifications panel for Slack matching their color scheme
```

### Product Card
```
Generate a product card component matching Airbnb's style
```

---

## 📂 Project Structure

After running, you'll have:

```
projects/
└── your-prototype/
    ├── references/
    │   ├── design-tokens.json  ← Captured colors, fonts
    │   └── screenshots/        ← Platform screenshots
    └── prototype/
        ├── src/
        │   ├── app/
        │   └── components/     ← Your components here!
        └── package.json
```

---

## 🎨 Using Design Tokens

Your components automatically use captured colors:

```typescript
// Generated component uses exact Amazon colors
const colors = {
  orange: '#FF9900',    // From captured design
  dark: '#131921',      // From captured design
  yellow: '#FFD814',    // From captured design
}

// Applied in components
style={{ backgroundColor: colors.orange }}
```

---

## ✨ What You Can Build

- 🛒 Shopping carts and checkout flows
- 📊 Dashboard widgets and panels
- 💬 Chat interfaces and modals
- 📱 Product cards and listings
- ⚙️ Settings panels
- 🔔 Notification systems
- 📝 Forms and inputs
- 🎯 Landing page sections

---

## 🔧 Customization

### Change Captured Platform

Edit `CLAUDE.md` in your project:
```markdown
PLATFORM_URL=https://your-platform.com
```

### Modify Design Tokens

Edit `references/design-tokens.json`:
```json
{
  "colors": {
    "primary": "#YOUR_COLOR"
  }
}
```

### Add More Features

Just tell Claude:
```
Add a quantity selector to the cart items
Add remove button for each item
Add shipping cost calculation
```

---

## 🎯 Tips for Best Results

### Be Specific
❌ "Make a widget"
✅ "Create a product search widget with autocomplete and filters"

### Reference the Platform
❌ "Use nice colors"
✅ "Match Amazon India's color scheme"

### Describe Functionality
❌ "Add buttons"
✅ "Add 'Add to Cart' and 'Buy Now' buttons that update the cart counter"

### Iterate
```
Can you add a loading state?
Make it responsive for mobile
Add error handling
```

---

## 📚 Learn More

- **Full Documentation**: [README.md](./README.md)
- **Installation Help**: [INSTALL.md](./INSTALL.md)
- **Skill Details**: [SKILL.md](./SKILL.md)
- **Examples**: [examples/](./examples/)

---

## 🐛 Common Issues

### "Skill not found"
```bash
# Make sure it's in the right place
ls ~/.claude/skills/platform-prototype-skill/SKILL.md
```

### "agent-browser-skill missing"
```bash
cd ~/.claude/skills
git clone https://github.com/anthropics/agent-browser-skill.git
```

### "Colors don't match"
Make sure generated code uses design tokens:
```typescript
// ✅ Correct
style={{ color: "#FF9900" }}

// ❌ Wrong
className="text-orange-500"
```

---

## 🎉 You're Ready!

Now you can:
- ✅ Capture any platform's design
- ✅ Generate matching prototypes
- ✅ Build features in minutes
- ✅ Iterate with Claude

**Start building amazing prototypes!** 🚀

---

Need help? [Open an issue](https://github.com/kaidhar/platform-prototype-skill/issues)
