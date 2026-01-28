# Publishing to GitHub - Checklist

Follow this checklist to publish the Platform Prototype Skill on GitHub.

---

## 📋 Pre-Publish Checklist

### 1. Update Repository URLs

Replace `kaidhar` with your actual GitHub username in these files:

- [ ] `README.md` - Line 38, 51, 377, 430-432
- [ ] `INSTALL.md` - Line 15, 54, 61, 112, 152
- [ ] `QUICKSTART.md` - Line 7, 136

**Find and replace:**
```bash
cd .claude/skills/platform-prototype-skill
grep -r "kaidhar" . --include="*.md"
```

Replace with your actual username:
```bash
# Example:
sed -i 's/kaidhar/yourgithub/g' README.md
sed -i 's/kaidhar/yourgithub/g' INSTALL.md
sed -i 's/kaidhar/yourgithub/g' QUICKSTART.md
```

### 2. Create GitHub Repository

1. Go to https://github.com/new
2. Repository name: `platform-prototype-skill`
3. Description: `Claude Code skill for capturing platform designs and generating pixel-perfect Next.js prototypes`
4. ✅ Public
5. ❌ Don't initialize with README (we have one)
6. Click "Create repository"

### 3. Initialize Git (if not already)

```bash
cd .claude/skills/platform-prototype-skill
git init
git add .
git commit -m "Initial commit: Platform Prototype Skill v1.0"
```

### 4. Connect to GitHub

```bash
# Add remote (replace USERNAME)
git remote add origin https://github.com/USERNAME/platform-prototype-skill.git

# Push to GitHub
git branch -M main
git push -u origin main
```

### 5. Add Topics/Tags

On GitHub repository page:
- Click ⚙️ (Settings gear next to About)
- Add topics:
  - `claude-code`
  - `claude-skill`
  - `nextjs`
  - `prototype`
  - `design-tokens`
  - `tailwindcss`
  - `web-automation`

### 6. Enable GitHub Pages (Optional)

For documentation hosting:
1. Go to Settings → Pages
2. Source: Deploy from branch
3. Branch: main, folder: / (root)
4. Save

---

## 📝 Repository Settings

### About Section

**Description:**
```
Claude Code skill for capturing web platform designs and generating pixel-perfect Next.js prototypes
```

**Website:**
```
https://claude.ai/code
```

**Topics:**
```
claude-code, claude-skill, nextjs, prototype, design-tokens, tailwindcss, web-automation, react, typescript
```

### README Badges

Ensure these badges work:
- [ ] License badge links to LICENSE file
- [ ] Claude Code badge links to claude.ai/code

---

## 📦 Release Checklist

### Create First Release (v1.0.0)

1. Go to Releases → Create new release
2. Tag version: `v1.0.0`
3. Release title: `v1.0.0 - Initial Release`
4. Description:

```markdown
# Platform Prototype Skill v1.0.0

First stable release of the Platform Prototype Skill for Claude Code.

## ✨ Features

- 🎨 Capture design tokens from any web platform
- 📸 Automatic screenshot and HTML extraction
- 🚀 Generate Next.js + TypeScript prototypes
- 💅 Tailwind CSS with exact color matching
- ♿ WCAG 2.1 AA accessibility compliance
- 🛠️ CLI tool for validation

## 📚 Example

- Amazon India Shopping Chatbot (fully functional)

## 🚀 Installation

```bash
cd ~/.claude/skills
git clone https://github.com/USERNAME/platform-prototype-skill.git
```

See [INSTALL.md](./INSTALL.md) for details.

## 📖 Documentation

- [Quick Start](./QUICKSTART.md)
- [Full Documentation](./README.md)
- [Skill Guide](./SKILL.md)
```

3. Click "Publish release"

---

## 🔗 Post-Publish Tasks

### 1. Test Installation

Test the installation process:
```bash
# Remove local copy
rm -rf ~/.claude/skills/platform-prototype-skill

# Install from GitHub
cd ~/.claude/skills
git clone https://github.com/USERNAME/platform-prototype-skill.git

# Test it works
claude-code
```

### 2. Update Links

Create a `links.md` file with all relevant links:
- [ ] GitHub repository
- [ ] Installation guide
- [ ] Quick start
- [ ] Example projects
- [ ] Issue tracker

### 3. Social Media (Optional)

Share on:
- [ ] Twitter/X with #ClaudeCode hashtag
- [ ] Reddit r/ClaudeAI
- [ ] Dev.to article
- [ ] LinkedIn post

Sample post:
```
🚀 Just published Platform Prototype Skill for Claude Code!

Capture any platform's design and generate pixel-perfect prototypes:
✅ Automatic design token extraction
✅ Next.js + TypeScript generation
✅ Exact color matching
✅ Fully functional components

Example: Built an Amazon shopping chatbot in minutes!

#ClaudeCode #WebDev #Prototyping

https://github.com/USERNAME/platform-prototype-skill
```

---

## 🎯 Marketing README Features

Ensure README has:
- [ ] Clear "What it does" section
- [ ] Quick start (5 min setup)
- [ ] Visual examples (screenshots)
- [ ] Installation options (global/local)
- [ ] Troubleshooting section
- [ ] Contributing guide link
- [ ] License badge
- [ ] Star button callout

---

## 📊 Analytics Setup (Optional)

### GitHub Insights

Monitor:
- Stars ⭐
- Forks 🍴
- Issues 🐛
- Pull requests 🔀

### Useful Commands

```bash
# Check repository stats
gh repo view USERNAME/platform-prototype-skill

# List recent stars
gh api repos/USERNAME/platform-prototype-skill/stargazers

# List issues
gh issue list
```

---

## 🔄 Maintenance

### Regular Updates

Create a maintenance schedule:
- [ ] Weekly: Check issues
- [ ] Monthly: Update dependencies
- [ ] Quarterly: Major feature releases

### Version Numbering

Follow SemVer:
- **Major** (x.0.0): Breaking changes
- **Minor** (0.x.0): New features
- **Patch** (0.0.x): Bug fixes

---

## ✅ Final Checklist

Before announcing publicly:

- [ ] README.md is complete and clear
- [ ] INSTALL.md tested on clean machine
- [ ] QUICKSTART.md verified working
- [ ] All kaidhar replaced
- [ ] LICENSE file present
- [ ] Example project works
- [ ] No sensitive data (passwords, keys)
- [ ] Git history cleaned
- [ ] Release notes written
- [ ] GitHub topics added
- [ ] Repository description set

---

## 🎉 You're Ready to Publish!

Once all checkboxes are complete, your skill is ready for the community!

**Repository URL:**
```
https://github.com/USERNAME/platform-prototype-skill
```

**Installation Command:**
```bash
cd ~/.claude/skills
git clone https://github.com/USERNAME/platform-prototype-skill.git
```

---

## 📞 Support

After publishing:
- Monitor GitHub issues
- Respond to questions
- Accept pull requests
- Update documentation

Good luck! 🚀
