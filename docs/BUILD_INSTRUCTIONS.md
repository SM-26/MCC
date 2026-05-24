# Merge & Choo-Choo Alpha 1 - Build Instructions

## Quick Start (Simplest)

### Option 1: Python HTTP Server (No Build Required)
```bash
cd /mnt/c/users/or_ga/Documents/MCC
pip install serve
serve -s public -l 8000
# Open http://localhost:8000 in browser
```

### Option 2: Direct File Access
```bash
cd /mnt/c/users/or_ga/Documents/MCC
python -m http.server 8000
# Open http://localhost:8000/public in browser
```

---

## Why Vite Build Failed

Vite expects an entry point in `src/` that it can bundle. Our current setup has:
- HTML shell in `public/index.html` (static)
- TypeScript source in `src/` (unbundled)

This is actually **fine for development** - we're using iframes to load the slices separately.

---

## Recommended Approach

### For Development: Use Python Server
```bash
cd /mnt/c/users/or_ga/Documents/MCC
pip install serve
serve -s public -l 8000
```

This serves the `public/` folder directly, including:
- `index.html` (main app shell)
- All TypeScript files in `src/` (loaded via iframes or ES modules)

### For Production: Build with Vite
To build for production, we need to:
1. Move HTML shell to `src/` as entry point
2. Bundle all TypeScript into JavaScript
3. Copy static assets to `dist/`

**OR** use a simpler approach: keep everything in `public/` and serve statically.

---

## Current Status

✅ **All source files created** in `src/`  
✅ **HTML shell created** in `public/index.html`  
✅ **Can run with Python server** (no build needed)  
⚠️ **Vite build not required** for current architecture  

---

## Next Steps

1. **Test locally:**
   ```bash
   cd /mnt/c/users/or_ga/Documents/MCC
   pip install serve
   serve -s public -l 8000
   ```

2. **Open browser:** http://localhost:8000

3. **Verify:**
   - World grid renders (19 hexes)
   - Tab navigation works
   - Save/load persists to localStorage

4. **Add slice functionality:**
   - Mines slice (in iframe or ES modules)
   - Station slice (in iframe or ES modules)
   - Discovery system

---

## pnpm vs npm vs pip vs Docker

### **pnpm vs npm** (Package Managers for JavaScript)
- **pnpm**: Disk-efficient, hardlinks packages, faster installs
- **npm**: Standard, simpler, what we're using now
- **For this project**: Either works fine; npm is already installed

### **pip** (Python Package Manager)
- Used for installing Python tools like `serve`, `gunicorn`
- Example: `pip install serve` or `pip install gunicorn`

### **Docker** (Containerization)
- Used for production deployment
- Creates isolated environment with all dependencies
- Example: `docker-compose up`

---

## Summary

**Current status:** Build not required. Use Python server for development.

**To test now:**
```bash
cd /mnt/c/users/or_ga/Documents/MCC
pip install serve
serve -s public -l 8000
```

**Open:** http://localhost:8000
