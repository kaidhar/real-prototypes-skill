# Installation Guide

Quick guide to install the Platform Prototype Skill in your Claude Code setup.

---

## 🚀 Method 1: Global Installation (Recommended)

Install the skill globally so it's available in all your Claude Code projects.

### Step 1: Navigate to Claude Skills Directory

```bash
cd ~/.claude/skills
```

If the directory doesn't exist, create it:
```bash
mkdir -p ~/.claude/skills
cd ~/.claude/skills
```

### Step 2: Clone This Repository

```bash
git clone https://github.com/kaidhar/platform-prototype-skill.git
```

### Step 3: Verify Installation

```bash
# List the skill directory
ls -la platform-prototype-skill

# You should see SKILL.md, README.md, cli.js, etc.
```

### Step 4: Restart Claude Code

```bash
# Exit Claude Code if running
# Then restart it in any project
cd ~/your-project
claude-code
```

### Step 5: Test the Skill

Tell Claude:
```
Use the platform-prototype-skill to capture design from amazon.in
```

Claude should recognize and invoke the skill!

---

## 📁 Method 2: Project-Specific Installation

Install the skill only for a specific project.

### Step 1: Navigate to Your Project

```bash
cd your-project
```

### Step 2: Create Skills Directory

```bash
mkdir -p .claude/skills
cd .claude/skills
```

### Step 3: Clone the Repository

```bash
git clone https://github.com/kaidhar/platform-prototype-skill.git
```

Or add as a submodule:
```bash
git submodule add https://github.com/kaidhar/platform-prototype-skill.git
```

### Step 4: Restart Claude Code in This Project

```bash
cd ../..  # Back to project root
claude-code
```

---

## ✅ Verify Installation

### Check if Skill is Loaded

```bash
# In Claude Code, type:
/help
```

Look for `platform-prototype-skill` in the list of available skills.

### Test Run

Tell Claude:
```
I want to create a prototype that matches Amazon's design.
Can you use the platform-prototype-skill?
```

If Claude responds that it's using the skill, you're all set! ✅

---

## 🔧 Troubleshooting

### "Skill not found"

**Problem**: Claude doesn't recognize the skill.

**Solution**:
1. Check the installation path:
   ```bash
   ls ~/.claude/skills/platform-prototype-skill/SKILL.md
   ```
2. Ensure `SKILL.md` exists (this is what Claude reads)
3. Restart Claude Code completely

### "agent-browser-skill not found"

**Problem**: The platform skill depends on `agent-browser-skill`.

**Solution**: Install the browser automation skill:
```bash
cd ~/.claude/skills
git clone https://github.com/anthropics/agent-browser-skill.git
```

### "Permission denied"

**Problem**: Can't write to `~/.claude/skills/`.

**Solution**: Create the directory with proper permissions:
```bash
mkdir -p ~/.claude/skills
chmod 755 ~/.claude/skills
```

### "Git clone failed"

**Problem**: Repository doesn't exist or network issue.

**Solution**:
1. Check if you're using the correct GitHub URL
2. Try with HTTPS instead of SSH:
   ```bash
   git clone https://github.com/kaidhar/platform-prototype-skill.git
   ```
3. Check your network connection

---

## 🔄 Updating the Skill

### Global Installation Update

```bash
cd ~/.claude/skills/platform-prototype-skill
git pull origin main
```

### Project-Specific Update

```bash
cd your-project/.claude/skills/platform-prototype-skill
git pull origin main
```

### Submodule Update

```bash
cd your-project
git submodule update --remote .claude/skills/platform-prototype-skill
```

---

## 🗑️ Uninstalling

### Remove Global Installation

```bash
rm -rf ~/.claude/skills/platform-prototype-skill
```

### Remove Project-Specific Installation

```bash
cd your-project
rm -rf .claude/skills/platform-prototype-skill
```

### Remove Submodule

```bash
cd your-project
git submodule deinit .claude/skills/platform-prototype-skill
git rm .claude/skills/platform-prototype-skill
rm -rf .git/modules/.claude/skills/platform-prototype-skill
```

---

## 📦 Dependencies

Make sure you have these installed:

### Required
- **Claude Code CLI** - [Install from claude.ai/code](https://claude.ai/code)
- **Node.js 18+** - [Download from nodejs.org](https://nodejs.org/)
- **npm or pnpm** - Comes with Node.js

### Check Versions

```bash
# Check Claude Code
claude --version

# Check Node.js
node --version

# Check npm
npm --version
```

---

## 🎓 Next Steps

After installation:

1. **Read the README** - `cat ~/.claude/skills/platform-prototype-skill/README.md`
2. **Try the examples** - Check out the Amazon chatbot example
3. **Build your first prototype** - Follow the usage guide in README.md

---

## 💬 Getting Help

- **GitHub Issues**: [Report a problem](https://github.com/kaidhar/platform-prototype-skill/issues)
- **Discussions**: [Ask questions](https://github.com/kaidhar/platform-prototype-skill/discussions)
- **Documentation**: [Read SKILL.md](./SKILL.md)

---

Happy prototyping! 🎨
