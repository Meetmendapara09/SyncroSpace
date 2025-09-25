# SyncroSpace Run & Build Instructions

This document provides instructions for running and building the SyncroSpace application, with special considerations for static exports and Firebase integration.

## Development with Real Firebase

For normal development with real Firebase connections:

```bash
npm run dev
```

This requires a properly configured `.env.local` file with valid Firebase credentials.

## Development with Mock Firebase

To run the application with mock Firebase services (useful for development without Firebase access):

```bash
./scripts/run-with-mock-firebase.sh
```

This runs the application with simulated Firebase services that don't make actual API calls.

## Building the Application

### Standard Build

For a standard build that includes server-side features:

```bash
npm run build
```

### Static Export Build

To build the application for static export with mock Firebase:

```bash
./scripts/build-with-mock-firebase.sh
```

This creates a static build with simulated Firebase services, suitable for deployment to static hosting providers like GitHub Pages, Netlify, or Vercel (static).

## Fixed Issues

The following issues have been addressed in the latest build:

1. **Input autocomplete attributes**: Added proper `autocomplete="username"` attributes to email input fields in login, signup, and password recovery forms.

2. **Firebase Authentication Errors**: Created a mock Firebase implementation that can be used for static builds to prevent HTTP 400 errors.

3. **Webpack Configuration**: Updated webpack configuration to handle Node.js modules properly and conditionally use mock Firebase when needed.

4. **Build Configuration**: Created separate build scripts for different deployment scenarios.

## Known Limitations

When using the mock Firebase implementation:

1. User authentication will not work (simulated only)
2. Data storage and retrieval will be limited or unavailable
3. Real-time features will not function

These limitations are expected when using static hosting without backend services.

## Next Steps for Production

For a fully functional production deployment:

1. Set up proper Firebase project and update environment variables
2. Deploy to a hosting service that supports server-side rendering (if needed)
3. Consider using Firebase Hosting for optimal integration