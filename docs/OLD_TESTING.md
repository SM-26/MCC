# Testing Guide for WebGame

## Vitest Setup

The project uses Vitest as the testing framework with Svelte support.

### Running Tests

```bash
# Run tests in watch mode (default)
pnpm test

# Run tests without watch mode
pnpm test:run

# Run with coverage
pnpm test:run --coverage

# Run specific test file
pnpm test:run src/stores/__tests__/index.test.ts
```

### Test Structure

Tests are located in `src/stores/__tests__/` directory. Each store has its own test suite.

### Writing Tests

Example test structure:

```typescript
import { describe, it, expect } from 'vitest';
import { appContext } from '$stores/index';

describe('appContext store', () => {
  it('should have initial theme set to dark', () => {
    expect($appContext.theme).toBe('dark');
  });
});
```

### Test Coverage

To generate coverage report:

```bash
pnpm test:run --coverage
```

Coverage report will be in `coverage/` directory.

## ESLint Configuration

ESLint is configured with:
- TypeScript parser
- Svelte plugin rules
- Strict type checking
- Best practices enforcement

### Running ESLint

```bash
# Check for linting errors
pnpm lint

# Fix auto-fixable issues
pnpm lint --fix

# Watch mode
pnpm lint --watch
```

## Lighthouse Auditing

Lighthouse is configured for performance and accessibility auditing.

### Running Lighthouse

```bash
# Collect Lighthouse data
pnpm lighthouse

# Results will be in lighthouse-results/ directory
```

### Manual Lighthouse Audit

You can also run Lighthouse manually:

```bash
npm exec lhci@latest collect --view
```

This opens the Lighthouse viewer in your browser.

## CI Integration

Tests and linting are automatically run in GitHub Actions on every push to main branch.

### Workflow Steps

1. Checkout code
2. Setup pnpm and Node.js
3. Install dependencies
4. Run tests
5. Build project
6. Deploy to GitHub Pages

### Adding Custom Tests

Create new test files in `src/stores/__tests__/` or `src/components/__tests__/`.

Example component test:

```typescript
import { render, fireEvent } from '@testing-library/svelte';
import Navbar from '$components/Navbar.svelte';

describe('Navbar component', () => {
  it('should render navigation tabs', () => {
    const { container } = render(Navbar);
    
    // Add assertions here
  });
});
```

## Best Practices

1. **Test stores separately**: Each store should have its own test file
2. **Mock external dependencies**: Use Vitest mocks for API calls
3. **Test accessibility**: Include a11y tests in your suite
4. **Keep tests focused**: One assertion per test case when possible
5. **Document test setup**: Add beforeEach/afterEach for common setup

## Troubleshooting

### Tests Fail After Component Changes

```bash
# Clear Vitest cache
rm -rf node_modules/.vite
pnpm test:run
```

### TypeScript Errors in Tests

Ensure your test files have proper imports and type annotations.

### Coverage Not Working

Check that all source files are included in `vitest.config.ts`.
