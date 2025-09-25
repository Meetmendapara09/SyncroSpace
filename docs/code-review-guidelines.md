# SyncroSpace Code Review Guidelines

## Purpose
These guidelines aim to maintain high-quality code, prevent configuration issues before they reach production, and ensure consistent practices across the codebase.

## Pre-Commit Checklist

### 1. TypeScript Type Safety
- [ ] All TypeScript errors are resolved or properly annotated
- [ ] No use of `any` type without justification
- [ ] Type assertions (`as`) are used sparingly and only when necessary
- [ ] Generic types are properly constrained
- [ ] No suppression of TypeScript errors with `// @ts-ignore` without thorough documentation

### 2. React Component Best Practices
- [ ] Props are properly typed with interfaces/types
- [ ] Components have clean separation of concerns
- [ ] Proper use of React hooks (useEffect, useState, etc.)
- [ ] No unnecessary re-renders
- [ ] Key props are provided for list items
- [ ] No direct DOM manipulation outside useRef/useEffect

### 3. Configuration Files
- [ ] Configuration formats are valid (e.g., array vs object in tailwind.config.js)
- [ ] Environmental variables are properly referenced
- [ ] Secret keys are not hardcoded
- [ ] Proper error handling for missing configuration

### 4. Build Process
- [ ] Build completes successfully locally before committing
- [ ] No new TypeScript errors are introduced
- [ ] Optimized build performance (no unnecessary dependencies)
- [ ] All required environment variables are documented

### 5. External Dependencies
- [ ] All dependencies are properly imported and used
- [ ] Icons and assets are properly loaded and typed
- [ ] Firebase and BigQuery configurations are tested
- [ ] Third-party APIs have proper error handling

### 6. Testing
- [ ] Components have unit tests for critical functionality
- [ ] Edge cases are considered and tested
- [ ] Mock data is representative of real-world scenarios
- [ ] Tests run successfully before committing

## Code Review Process

### For Submitters
1. **Self-Review**: Before requesting a review, ensure your code passes all checks in the pre-commit checklist
2. **Documentation**: Add comments for complex logic and update README.md if necessary
3. **Focused Changes**: Keep PRs small and focused on a single feature/fix
4. **Tests**: Include tests for new functionality or fixes

### For Reviewers
1. **Comprehensive Review**: Check against all items in the pre-commit checklist
2. **Build Verification**: Pull the branch and ensure it builds correctly
3. **Testing**: Run tests to verify functionality
4. **Configuration**: Specifically check configuration files for correctness
5. **Dependency Changes**: Pay extra attention to package.json changes
6. **Optimization**: Consider performance implications of changes

## Common Issues to Watch For

1. **Tailwind Configuration Issues**:
   - Ensure plugins are configured as an array, not an object
   - Check for proper module and content paths

2. **Icon Library Problems**:
   - Verify icons exist in the specified library before use
   - Provide fallbacks for potentially missing icons

3. **TypeScript Type Issues**:
   - Check Firebase data typing against actual database schema
   - Ensure null/undefined handling for optional properties

4. **Environment Variables**:
   - Verify all required variables are documented in .env.example
   - Check for proper fallbacks when variables might be missing

5. **Build Performance**:
   - Watch for large dependencies that might impact build time
   - Check for memory usage issues during build

## Automated Checks
- TypeScript compilation with `npm run typecheck`
- ESLint with `npm run lint`
- Jest tests with `npm run test`
- Build verification with `npm run build:optimized`

By following these guidelines, we can prevent many common issues and maintain a high-quality codebase.