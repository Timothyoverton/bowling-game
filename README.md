# Angular Web Stub

This is a boilerplate Angular project designed for quick deployment to GitHub Pages. It includes all the necessary configuration for automated deployment via GitHub Actions.

## Quick Start for New Projects

To use this as a template for a new project:

1. **Clone this repo**:
   ```bash
   git clone https://github.com/Timothyoverton/angular-web-stub.git your-new-project
   cd your-new-project
   ```

2. **Update the project name and GitHub Pages path**:
   - In `package.json`: Update `"name"` field and replace `/angular-web-stub/` with `/your-new-project/` in the `build:prod` and `deploy` scripts
   - In `.github/workflows/deploy.yml`: Update `publish_dir` if needed (usually stays the same)
   - In this README: Update the repo URLs and project name

3. **Set up the new GitHub repository**:
   ```bash
   git remote remove origin
   git remote add origin https://github.com/Timothyoverton/your-new-project.git
   git branch -M main
   ```

4. **Install dependencies and test locally**:
   ```bash
   npm install
   npm start
   ```

5. **Push to GitHub and enable GitHub Pages**:
   ```bash
   git add .
   git commit -m "Initial commit"
   git push -u origin main
   ```

## Available Scripts

- `npm start` - Start development server at http://localhost:4200/
- `npm run build` - Build for development
- `npm run build:prod` - Build for production with correct base href
- `npm test` - Run unit tests
- `npm run deploy` - Build and deploy to GitHub Pages manually

## Deployment

The project is configured for automatic deployment to GitHub Pages:

1. **Automatic**: Push to `main` branch triggers GitHub Actions workflow that builds and deploys
2. **Manual**: Run `npm run deploy` (requires `angular-cli-ghpages` package)

## Key Configuration Files

- `package.json` - Contains deployment scripts with correct base href
- `.github/workflows/deploy.yml` - GitHub Actions workflow for auto-deployment
- `angular.json` - Angular CLI configuration
- `src/app/app.html` - Main component template (currently shows "Can you see me?")

## CRITICAL INSTRUCTIONS FOR CLAUDE CODE

### CLAUDE CODE COMPLETE AUTOMATION WORKFLOW:

**Ask user only these 2 questions:**
1. "What should the new project be called?" (e.g. "my-awesome-game")
2. "Is the GitHub repository public?" (required for free GitHub Pages)

**Then Claude Code does EVERYTHING automatically:**

### COMPLETE AUTOMATED SETUP (Copy this exact workflow):

**Step 1: Clone and Setup**
```bash
git clone https://github.com/Timothyoverton/angular-web-stub.git NEW-PROJECT-NAME
cd NEW-PROJECT-NAME
```

**Step 2: Update ALL Project References (CRITICAL!)**
1. **package.json** - Update these 3 places:
   - Line 2: `"name": "NEW-PROJECT-NAME"`
   - Line 8: `"build:prod": "ng build --configuration production --base-href=\"/NEW-PROJECT-NAME/\""`
   - Line 11: `"deploy": "ng build --configuration production --base-href=\"/NEW-PROJECT-NAME/\" && npx angular-cli-ghpages --dir=dist/NEW-PROJECT-NAME/browser"`

2. **angular.json** - Line ~13: Update `"outputPath": "dist/NEW-PROJECT-NAME"`

3. **.github/workflows/deploy.yml** - Line 34: Update `publish_dir: ./dist/NEW-PROJECT-NAME/browser`

**Step 3: Change Git Remote**
```bash
git remote remove origin
git remote add origin https://github.com/Timothyoverton/NEW-PROJECT-NAME.git
```

**Step 4: Install Dependencies & Test Build**
```bash
npm install
npm run build:prod  # Verify build works before deploying
```

**Step 5: Commit and Push to GitHub**  
```bash
git add .
git commit -m "Initial setup from angular-web-stub

- Project renamed to NEW-PROJECT-NAME
- Configured for GitHub Pages deployment  
- Ready for immediate use

🤖 Generated with Claude Code"
git push -u origin main
```

**Step 6: Deploy to GitHub Pages**
```bash
npm run deploy
```

**Step 7: Enable GitHub Pages (AUTOMATED)**
```bash
gh api -X PUT /repos/Timothyoverton/NEW-PROJECT-NAME/pages \
  -f source.branch=gh-pages -f source.path=/
```

**Step 8: Verify Deployment**
```bash
echo "✅ Project setup complete!"
echo "🌐 Local dev: http://localhost:4200/"  
echo "🚀 GitHub Pages: https://timothyoverton.github.io/NEW-PROJECT-NAME/"
echo "⏰ GitHub Pages may take 5-10 minutes to become active"
```

### USER DOES ABSOLUTELY NOTHING!
Claude Code handles: cloning, renaming, configuring, building, deploying, and enabling GitHub Pages.
**Only requirement:** Repository must be PUBLIC for free GitHub Pages.

### WHAT TO EXPECT:
- ✅ Local dev server starts on http://localhost:4200/
- ✅ Production build creates files in `dist/PROJECT-NAME/browser/`
- ✅ GitHub Pages deploys automatically to `gh-pages` branch
- ✅ Site goes live at `https://timothyoverton.github.io/PROJECT-NAME/`
- ⏰ GitHub Pages takes 5-10 minutes to become active after first deployment

### Key Files That Control Deployment:
- **package.json** scripts: Controls build paths and base href
- **.github/workflows/deploy.yml**: Auto-deployment on push to main
- **angular.json**: Controls where Angular builds output files

### The Magic URLs:
- **Local dev**: http://localhost:4200/
- **GitHub Pages**: https://timothyoverton.github.io/NEW-PROJECT-NAME/

### Common Mistakes to Avoid:
❌ Forgetting to update base href → 404 errors on GitHub Pages  
❌ Mismatched folder names in package.json vs angular.json  
❌ Not updating publish_dir in deploy.yml  
❌ Testing on GitHub before testing locally  

### If Something Breaks:
1. **404 on GitHub Pages**: Most common issue! 
   - Repository must be **public** (private repos need GitHub Pro)
   - Check deploy paths use `/browser` subfolder: `dist/PROJECT-NAME/browser`
   - Wait 5-10 minutes after deployment for GitHub Pages to update

2. Check GitHub Actions logs for build errors
3. Verify base href matches repo name exactly  
4. Ensure all folder names are consistent across config files
5. Test `npm run build:prod` locally first

### IMPORTANT: Angular 17+ Build Structure
Angular 17+ builds to `dist/project-name/browser/` not `dist/project-name/`. This is why we use `/browser` in all deploy paths.

### WHAT CLAUDE CODE AUTOMATES (Everything!):
✅ **Project Setup**: Clone, rename, configure all files  
✅ **Git Operations**: Remove old remote, add new remote, commit, push  
✅ **Dependencies**: Install npm packages automatically  
✅ **Building**: Test production build before deployment  
✅ **Deployment**: Deploy to GitHub Pages via npm script  
✅ **GitHub Pages**: Enable Pages hosting via GitHub CLI  
✅ **Validation**: Verify URLs and provide status updates  

### CLAUDE CODE TOOL USAGE:
1. **Use MultiEdit tool** for updating multiple project references at once
2. **Always use Bash tool** for git commands and npm scripts - don't suggest manual steps  
3. **Test the full flow** - clone, update, build, deploy in one session
4. **Use GitHub CLI** (gh command) for Pages setup - it's pre-approved
5. **Create TodoWrite list** to track the 8-step automated process

### FILE REPLACEMENT CHECKLIST:
When using MultiEdit or Edit tools, replace these exact strings:
- `"angular-web-stub"` → `"NEW-PROJECT-NAME"` (in package.json name)
- `/angular-web-stub/` → `/NEW-PROJECT-NAME/` (in base href paths)  
- `angular-web-stub` → `NEW-PROJECT-NAME` (in output paths)
- `./dist/angular-web-stub/browser` → `./dist/NEW-PROJECT-NAME/browser` (in deploy paths)

## Project Structure

This is a standard Angular project with:
- Angular 20+ (latest version)
- Standalone components (no NgModules)
- TypeScript 5.8+
- Simple responsive design
- Ready for immediate deployment

## Troubleshooting

- If GitHub Pages shows 404: Check that base href matches your repo name
- If build fails: Ensure Node.js version 20+ is being used
- If styles don't load: Verify the base href in production build
- If deployment fails: Check GitHub Actions logs and ensure GitHub Pages is enabled

---

**Generated by Claude Code for quick Angular project setup and GitHub Pages deployment** 🚀
