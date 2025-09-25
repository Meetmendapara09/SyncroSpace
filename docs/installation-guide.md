# SyncroSpace Installation and Setup Guide

## Table of Contents
1. [Prerequisites](#prerequisites)
2. [Local Development Setup](#local-development-setup)
3. [Environment Configuration](#environment-configuration)
4. [Firebase Setup](#firebase-setup)
5. [BigQuery Integration Setup](#bigquery-integration-setup)
6. [Common Installation Issues](#common-installation-issues)
7. [Development Tools](#development-tools)

## Prerequisites

Before installing SyncroSpace, ensure you have the following:

- **Node.js** (v20.x or later)
- **npm** (v9.x or later)
- **Git** (for version control)
- A **Firebase** project with the following services enabled:
  - Firebase Authentication
  - Firestore Database
  - Firebase Storage
  - Firebase Realtime Database
- A **Google Cloud** project with BigQuery enabled (for AI features)
- A code editor (we recommend VS Code)

## Local Development Setup

### 1. Clone the Repository

```bash
git clone https://github.com/Meetmendapara09/SyncroSpace.git
cd SyncroSpace
```

### 2. Install Dependencies

```bash
npm install
```

If you encounter any dependency conflicts, try:

```bash
npm install --legacy-peer-deps
```

### 3. Set up Environment Variables

Create a `.env.local` file in the project root with the following variables:

```env
# Firebase Configuration
NEXT_PUBLIC_FIREBASE_API_KEY="your-api-key"
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN="your-auth-domain"
NEXT_PUBLIC_FIREBASE_PROJECT_ID="your-project-id"
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET="your-storage-bucket"
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID="your-messaging-sender-id"
NEXT_PUBLIC_FIREBASE_APP_ID="your-app-id"
NEXT_PUBLIC_FIREBASE_DATABASE_URL="your-rtdb-url"

# BigQuery Configuration (for AI features)
GOOGLE_APPLICATION_CREDENTIALS="./bigquery-credentials.json"
NEXT_PUBLIC_BIGQUERY_PROJECT_ID="your-gcp-project-id"
NEXT_PUBLIC_BIGQUERY_DATASET="syncrospace_analytics"

# Optional: Excalidraw Collaboration Server
NEXT_PUBLIC_EXCALIDRAW_SERVER="wss://your-excalidraw-server.com"

# App Configuration
NEXT_PUBLIC_APP_URL="http://localhost:9002"
```

### 4. Start the Development Server

```bash
npm run dev
```

The application will be available at `http://localhost:9002`.

## Environment Configuration

### Development vs. Production Settings

The application uses different configurations based on the environment:

- **Development**: Uses the `.env.local` file
- **Production**: Uses environment variables set in your hosting platform

### Advanced Configuration Options

For advanced configuration, you can modify the following files:

- `next.config.js` - Next.js configuration
- `tailwind.config.js` - Tailwind CSS settings
- `firebase.json` - Firebase settings

## Firebase Setup

### 1. Create a Firebase Project

1. Go to the [Firebase Console](https://console.firebase.google.com/)
2. Click "Add Project" and follow the setup wizard
3. Once created, add a web app to your project

### 2. Enable Required Services

1. **Authentication**: Enable desired sign-in methods (Google, Email/Password, Phone)
2. **Firestore**: Create a database in production mode with appropriate region
3. **Storage**: Set up Firebase Storage with default rules
4. **Realtime Database**: Create a database instance

### 3. Configure Security Rules

1. Update `firestore.rules` with your custom security rules
2. Deploy the rules:

```bash
npx firebase deploy --only firestore:rules
```

## BigQuery Integration Setup

For AI-powered features, set up BigQuery integration:

1. Create a GCP service account with BigQuery permissions
2. Download the JSON credentials file and save it as `bigquery-credentials.json` in the project root
3. Run the BigQuery setup script:

```bash
npm run bigquery:setup
```

4. Test the integration:

```bash
npm run bigquery:test
```

## Common Installation Issues

### Firebase Authentication Issues

- **Issue**: "Firebase App named 'default' already exists"
  - **Solution**: Ensure Firebase is only initialized once in your application

### Next.js Build Errors

- **Issue**: "Module not found" errors
  - **Solution**: Check that all dependencies are installed and import paths are correct

### BigQuery Connection Issues

- **Issue**: "Permission denied" when accessing BigQuery
  - **Solution**: Verify service account credentials and permissions

## Development Tools

To enhance your development experience, we recommend:

1. **VS Code Extensions**:
   - ESLint
   - Prettier
   - Tailwind CSS IntelliSense
   - Firebase Explorer

2. **Browser Extensions**:
   - React Developer Tools
   - Redux DevTools (if using Redux)

3. **Firebase Emulator Suite**:
   - Run Firebase services locally during development

```bash
npx firebase emulators:start
```

## Next Steps

After successful installation, consult the following guides:
- [Developer Guide](./developer-guide.md)
- [API Documentation](./api-documentation.md)
- [System Workflows](./system-workflows.md)
- [Contributing Guidelines](./contributing-guidelines.md)