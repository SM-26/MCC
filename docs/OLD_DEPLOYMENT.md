# Deployment Guide - GitHub Pages

## Quick Start

### 1. Initialize Git Repository

```bash
cd /home/sm26/webgame
git init
git add .
git commit -m "Initial commit: WebGame Svelte application"
```

### 2. Create GitHub Repository

1. Go to GitHub.com
2. Click "+" → "New repository"
3. Name it (e.g., `webgame`)
4. Keep it public or private as preferred
5. Don't initialize with README, .gitignore, or license (we have our own)
6. Click "Create repository"

### 3. Connect and Push

```bash
# Replace with your GitHub username and repo name
git remote add origin https://github.com/YOUR_USERNAME/webgame.git
git branch -M main
git push -u origin main
```

### 4. Enable GitHub Pages

1. Go to your repository on GitHub
2. Click "Settings" tab
3. Scroll to "Pages" section
4. Under "Source", select:
   - Branch: `main`
   - Folder: `/ (root)`
5. Click "Save"

### 5. Wait for Build

GitHub Actions will automatically:
- Install dependencies
- Run tests
- Build the project
- Deploy to GitHub Pages

Your site will be live at:
```
https://YOUR_USERNAME.github.io/webgame/
```

## Custom Domain (Optional)

### Add Custom Domain

1. Go to repository Settings → Pages
2. Under "Custom domain", enter your domain
3. Click "Save"
4. Follow DNS configuration instructions from GitHub

### Verify SSL

GitHub Pages automatically provides HTTPS for custom domains.

## Manual Build and Deploy

If you want to build locally first:

```bash
# Install dependencies
pnpm install

# Run tests
pnpm test:run

# Build for production
pnpm build

# Preview locally
pnpm preview
```

Then push the `dist/` folder:

```bash
git add dist/
git commit -m "Build for deployment"
git push origin main
```

## CI/CD Workflow

The `.github/workflows/deploy.yml` file handles automatic deployment:

- Triggers on push to `main` branch
- Runs tests before deploying
- Deploys only if tests pass
- Provides build artifacts for inspection

## Troubleshooting

### Tests Failing

```bash
# Run tests locally to see errors
pnpm test:run

# Fix issues, then commit and push again
git add .
git commit -m "Fix test failures"
git push origin main
```

### Build Errors

Check the GitHub Actions logs for detailed error messages. Common issues:

- Missing dependencies: `pnpm install`
- TypeScript errors: Check `tsconfig.json`
- Svelte compilation errors: Review component syntax

### Pages Shows Blank Page

1. Check browser console for JavaScript errors
2. Verify `index.html` exists in `/dist`
3. Ensure all assets are properly referenced

## Environment Variables

For sensitive data (API keys, etc.):

1. Go to repository Settings → Secrets and variables → Actions
2. Click "New repository secret"
3. Name: `NODE_ENV`
4. Value: `production`
5. Add additional secrets as needed

## Post-Deployment Checklist

- [ ] Site loads without errors
- [ ] All navigation works
- [ ] Touch gestures function on mobile
- [ ] PWA install prompt appears
- [ ] Lighthouse score meets targets
- [ ] Accessibility audit passes
- [ ] No console errors

## Performance Optimization

### Before Deploying

```bash
# Analyze bundle size
pnpm build

# Check generated files
ls -lh dist/assets/
```

### Tree Shaking

Svelte and Vite automatically tree-shake unused code. Ensure you're not importing entire libraries when only parts are needed.

### Image Optimization

Convert images to WebP format and use proper sizing for different screen sizes.

## Monitoring

After deployment:

1. Check GitHub Actions logs for build status
2. Monitor Lighthouse scores
3. Review accessibility audit results
4. Test on multiple devices and browsers

## Updating Content

To update the application:

1. Make changes in source files
2. Commit and push to main branch
3. GitHub Actions will rebuild and redeploy automatically
4. Changes typically appear within 1-5 minutes

## Rollback

If deployment fails or causes issues:

```bash
# View deployment history
git log --oneline -10

# Reset to previous commit if needed
git reset --hard HEAD~1
git push origin main --force
```

## Next Steps

After successful deployment:

1. Share the URL with users
2. Monitor analytics (if integrated)
3. Plan next features or improvements
4. Set up automated backups if needed
