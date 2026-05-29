# WebGame - Material 3 Responsive Application

A Svelte-based web application featuring Material 3 design, PWA support, and responsive navigation.

## Features

- **Material 3 Design System**: Full implementation of Material 3 color system, typography, and components
- **Responsive Navigation**: Text labels on desktop, emoji icons on mobile
- **PWA Support**: Splash screen with install prompt and in-app installation button
- **Touch & Gesture Support**: Swipe navigation, pinch gestures, touch-friendly targets
- **TypeScript**: Full type safety with separate state management
- **Svelte Stores**: Centralized state management for app context, game state, and navigation
- **ESLint**: Code quality enforcement
- **Vitest**: Testing framework integration
- **Lighthouse**: Performance and accessibility auditing

## Getting Started

### Prerequisites

- Node.js 18+ with pnpm
- Modern web browser

### Installation

```bash
cd /home/sm26/webgame
pnpm install
```

### Development Server

```bash
pnpm dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

### Build for Production

```bash
pnpm build
```

The production build will be in the `dist/` directory.

### Preview Production Build

```bash
pnpm preview
```

## Project Structure

```
webgame/
├── src/
│   ├── components/
│   │   ├── App.svelte              # Main app component
│   │   ├── Navbar.svelte           # Responsive navigation bar
│   │   ├── Splash.svelte           # PWA install splash screen
│   │   └── TabContent.svelte       # Tab content renderer
│   ├── stores/
│   │   └── index.ts                # Svelte stores (appContext, gameState, navigation)
│   ├── styles/
│   │   ├── main.css                # Entry point for CSS
│   │   ├── variables.css           # Material 3 color system
│   │   ├── reset.css               # CSS reset and base styles
│   │   ├── material3.css           # Material 3 component styles
│   │   └── responsive.css          # Responsive breakpoints
│   ├── types.ts                    # TypeScript type definitions
│   ├── App.svelte                  # Main app entry
│   └── main.ts                     # Application bootstrap
├── public/
│   └── favicon.svg                 # App favicon
├── index.html                      # HTML entry point
├── package.json                    # Dependencies and scripts
├── tsconfig.json                   # TypeScript configuration
├── vite.config.ts                  # Vite build configuration
└── README.md                       # This file
```

## Development Commands

```bash
# Start development server
pnpm dev

# Run ESLint
pnpm lint

# Run tests
pnpm test
pnpm test:run  # Run without watch mode

# Build for production
pnpm build

# Preview production build
pnpm preview

# Lighthouse audit (requires lighthouse-ci)
pnpm lighthouse
```

## PWA Installation

The app includes a splash screen that prompts users to install the PWA. You can also trigger installation manually:

1. Open the app on a mobile device or in incognito mode
2. Click "Install App" in the prompt
3. Or click "Open Store" to download from your app store

## Touch & Gesture Controls

- **Swipe Left/Right**: Navigate between tabs
- **Tap Tab Icons**: Direct navigation
- **Pinch**: Placeholder for zoom gestures (future enhancement)

## Accessibility

- Semantic HTML with proper ARIA labels
- Keyboard navigation support
- High contrast color scheme
- Responsive touch targets (minimum 48x48px on mobile)

## Deployment

### GitHub Pages

1. Create a GitHub repository
2. Push the project files
3. Enable GitHub Pages in repository settings
4. The app will be served from the `dist/` folder after building

```bash
# Build and deploy to GitHub Pages
pnpm build
git add dist/
git commit -m "Build for deployment"
git push origin main
```

### Docker (Production)

For containerized deployment, create a `Dockerfile`:

```dockerfile
FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN pnpm install --frozen-lockfile
COPY . .
RUN pnpm build

FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

## License

MIT
