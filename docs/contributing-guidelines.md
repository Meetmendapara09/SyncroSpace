# Contributing to SyncroSpace

Thank you for your interest in contributing to SyncroSpace! This document provides guidelines and instructions for contributing to the project. By participating, you are expected to uphold this code and encourage a positive, inclusive community.

## Table of Contents
1. [Code of Conduct](#code-of-conduct)
2. [Getting Started](#getting-started)
3. [Development Workflow](#development-workflow)
4. [Pull Request Process](#pull-request-process)
5. [Coding Standards](#coding-standards)
6. [Commit Message Guidelines](#commit-message-guidelines)
7. [Testing Guidelines](#testing-guidelines)
8. [Documentation Guidelines](#documentation-guidelines)
9. [Issue Reporting Guidelines](#issue-reporting-guidelines)
10. [Feature Request Guidelines](#feature-request-guidelines)

## Code of Conduct

### Our Pledge

We are committed to providing a friendly, safe, and welcoming environment for all contributors and participants, regardless of level of experience, gender identity and expression, sexual orientation, disability, personal appearance, body size, race, ethnicity, age, religion, or nationality.

### Expected Behavior

* Use welcoming and inclusive language
* Be respectful of differing viewpoints and experiences
* Gracefully accept constructive criticism
* Focus on what is best for the community
* Show empathy towards other community members

### Unacceptable Behavior

* Harassment of any participants in any form
* Deliberate intimidation, stalking, or following
* Publishing others' private information without explicit permission
* The use of sexualized language or imagery and unwelcome sexual attention
* Other conduct which could reasonably be considered inappropriate in a professional setting

## Getting Started

### Prerequisites

* Node.js (v20.x or later)
* npm (v9.x or later)
* Git
* Firebase project (for testing)

### Setup Steps

1. Fork the repository on GitHub
2. Clone your fork locally:
   ```bash
   git clone https://github.com/YOUR-USERNAME/SyncroSpace.git
   cd SyncroSpace
   ```
3. Add the original repository as an upstream remote:
   ```bash
   git remote add upstream https://github.com/Meetmendapara09/SyncroSpace.git
   ```
4. Install dependencies:
   ```bash
   npm install
   ```
5. Set up your environment variables by copying `.env.example` to `.env.local` and updating the values
6. Start the development server:
   ```bash
   npm run dev
   ```

## Development Workflow

1. Create a new branch for your feature or bugfix:
   ```bash
   git checkout -b feature/your-feature-name
   # or
   git checkout -b fix/issue-you-are-fixing
   ```

2. Make your changes and test them thoroughly

3. Keep your branch updated with the main branch:
   ```bash
   git fetch upstream
   git rebase upstream/main
   ```

4. Run tests to ensure your changes don't break existing functionality:
   ```bash
   npm run test
   ```

5. Format and lint your code:
   ```bash
   npm run format
   npm run lint
   ```

## Pull Request Process

1. Update the README.md or relevant documentation with details of changes, if applicable

2. Ensure all tests pass, the code follows the style guide, and you've added tests for new features

3. Submit your pull request to the `main` branch of the original repository

4. The PR title should follow the [conventional commits specification](#commit-message-guidelines)

5. In the PR description, include:
   - A summary of the changes
   - Any related issue numbers (e.g., "Fixes #123")
   - Screenshots or GIFs for UI changes
   - Notes about any breaking changes

6. Your PR will be reviewed by maintainers who may request changes

7. Once approved, a maintainer will merge your PR

## Coding Standards

SyncroSpace follows specific coding standards to maintain code quality and consistency.

### TypeScript

* Use TypeScript for all new code
* Ensure proper type definitions for functions, variables, and components
* Minimize use of `any` type

### React

* Use functional components with hooks
* Follow React's best practices for state management
* Use proper component structure with clear separation of concerns

### File Structure

* Components should be in the `src/components` directory
* Pages should be in the `src/app` directory
* Utilities should be in the `src/lib` directory

### Naming Conventions

* **Components**: PascalCase (e.g., `UserProfile.tsx`)
* **Hooks**: camelCase with `use` prefix (e.g., `useAuth.ts`)
* **Functions/Variables**: camelCase
* **Constants**: UPPER_SNAKE_CASE
* **CSS Classes**: kebab-case

## Commit Message Guidelines

We follow the [Conventional Commits](https://www.conventionalcommits.org/) specification:

```
<type>[optional scope]: <description>

[optional body]

[optional footer(s)]
```

Types include:
* **feat**: A new feature
* **fix**: A bug fix
* **docs**: Documentation changes
* **style**: Changes that don't affect code functionality (formatting, etc.)
* **refactor**: Code changes that neither fix bugs nor add features
* **perf**: Performance improvements
* **test**: Adding or modifying tests
* **build**: Changes to build process or tools
* **ci**: Changes to CI configuration
* **chore**: Other changes that don't modify src or test files

Example:
```
feat(auth): add Google authentication provider

Adds the ability for users to sign in with Google accounts.
Uses Firebase Auth for implementation.

Closes #42
```

## Testing Guidelines

### Test Requirements

* Write tests for all new features
* Maintain or improve code coverage
* Fix tests if your changes break them

### Types of Tests

* **Unit Tests**: Test individual functions and components
* **Integration Tests**: Test interactions between components
* **E2E Tests**: Test complete user flows

### Running Tests

```bash
# Run all tests
npm run test

# Run specific tests
npm run test -- -t "test name"

# Run tests with coverage
npm run test:coverage
```

## Documentation Guidelines

### Code Documentation

* Use JSDoc comments for functions, classes, and interfaces
* Document complex logic within functions
* Keep comments updated when changing code

### Project Documentation

* Update documentation when adding or changing features
* Use clear language and provide examples
* Include screenshots for UI changes

## Issue Reporting Guidelines

When reporting issues, please use one of the issue templates and provide:

1. **Description**: Clear description of the issue
2. **Steps to Reproduce**: Detailed steps to reproduce the problem
3. **Expected Behavior**: What should happen
4. **Actual Behavior**: What actually happens
5. **Environment**: Browser, OS, device, etc.
6. **Screenshots/Videos**: If applicable
7. **Possible Solution**: If you have suggestions

## Feature Request Guidelines

For feature requests:

1. Check if the feature has already been suggested
2. Describe the feature clearly and concisely
3. Explain why this feature would be useful
4. Provide examples of how it would be used
5. Consider implications on other parts of the system

---

Thank you for contributing to SyncroSpace! Your efforts help make the platform better for everyone.