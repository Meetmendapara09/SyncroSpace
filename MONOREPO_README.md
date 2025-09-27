# SyncroSpace Monorepo

This project integrates SyncroSpace with CaveVerse to provide multiple virtual space experiences in a single monorepo structure.

## 🏗️ Architecture

```
SyncroSpace Monorepo
├── 📁 Main SyncroSpace App (Next.js)     → http://localhost:9002
├── 📁 space/client (CaveVerse Client)    → http://localhost:3001
└── 📁 space/server (CaveVerse Server)    → http://localhost:2567
```

## 🚀 Quick Start

### Option 1: Automatic Setup
```bash
# Run the setup script to install all dependencies
npm run install:all

# Start all servers concurrently
npm run dev
```

### Option 2: Manual Setup
```bash
# Install root dependencies
npm install

# Install CaveVerse client dependencies
cd space/client && npm install && cd ../..

# Install CaveVerse server dependencies  
cd space/server && npm install && cd ../..

# Start all servers
npm run dev
```

## 📚 Available Scripts

### Development
- `npm run dev` - Start all servers concurrently
- `npm run dev:main` - Start only SyncroSpace main app (port 9002)
- `npm run dev:cave-client` - Start only CaveVerse client (port 3001)
- `npm run dev:cave-server` - Start only CaveVerse server (port 2567)

### Production
- `npm run build` - Build all projects
- `npm run build:main` - Build only SyncroSpace main app
- `npm run build:cave-client` - Build only CaveVerse client
- `npm run build:cave-server` - Build only CaveVerse server
- `npm run start` - Start all production servers

### Utilities
- `npm run install:all` - Install dependencies for all projects
- `./scripts/setup-monorepo.sh` - Complete setup script

## 🌐 Accessing the Applications

1. **SyncroSpace Main**: http://localhost:9002
   - Traditional virtual office experience
   - Video conferencing, chat, collaboration tools
   - Navigate to `/space` to choose your experience

2. **CaveVerse Client**: http://localhost:3001
   - Immersive 2D virtual world
   - Real-time multiplayer interaction
   - Character movement and spatial audio

3. **CaveVerse Server**: http://localhost:2567
   - WebSocket server for real-time multiplayer
   - Handles game state synchronization

## 🔗 Navigation Flow

1. Users access SyncroSpace at http://localhost:9002
2. Click on "CaveVerse Experience" in the sidebar or navigate to `/space`
3. Choose between:
   - **CaveVerse Experience**: Redirects to http://localhost:3001 (new tab)
   - **Traditional Space**: Stay in SyncroSpace with virtual office

## 🛠️ Development Workflow

### Working on SyncroSpace Main
```bash
npm run dev:main
# Edit files in src/
# Access at http://localhost:9002
```

### Working on CaveVerse Client
```bash
npm run dev:cave-client
# Edit files in space/client/src/
# Access at http://localhost:3001
```

### Working on CaveVerse Server
```bash
npm run dev:cave-server
# Edit files in space/server/src/
# Server runs on http://localhost:2567
```

## 📦 Project Structure

```
/
├── src/                      # SyncroSpace main app
├── space/
│   ├── client/              # CaveVerse frontend (Vite + React)
│   │   ├── src/
│   │   ├── public/
│   │   └── package.json
│   └── server/              # CaveVerse backend (Colyseus)
│       ├── src/
│       ├── loadtest/
│       └── package.json
├── package.json             # Root workspace configuration
└── scripts/
    └── setup-monorepo.sh   # Setup script
```

## 🔧 Environment Configuration

Make sure you have the following environment variables set up:

### SyncroSpace Main (.env.local)
```env
NEXT_PUBLIC_FIREBASE_API_KEY=your_firebase_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_domain
# ... other Firebase config
```

### CaveVerse Client
Configuration is handled through vite config files in `space/client/vite/`

### CaveVerse Server
Server configuration in `space/server/src/index.ts`

## 🐛 Troubleshooting

### Port Conflicts
If you encounter port conflicts:
- SyncroSpace main: Change port in package.json `dev:main` script
- CaveVerse client: Change port in package.json `dev:cave-client` script  
- CaveVerse server: Modify `space/server/src/index.ts`

### Build Errors
1. Clear all node_modules: `rm -rf node_modules space/*/node_modules`
2. Reinstall: `npm run install:all`
3. Try building individually to isolate issues

### CaveVerse Connection Issues
1. Ensure CaveVerse server is running on port 2567
2. Check browser console for WebSocket connection errors
3. Verify firewall settings allow local connections

## 🤝 Contributing

1. Make changes to the respective project directories
2. Test each service individually
3. Test the integrated experience
4. Ensure all servers start with `npm run dev`

## 📋 Next Steps

- [ ] Add Docker configuration for easy deployment
- [ ] Set up CI/CD pipeline for all three services
- [ ] Add shared UI component library
- [ ] Implement user authentication sync between services
- [ ] Add monitoring and logging across services