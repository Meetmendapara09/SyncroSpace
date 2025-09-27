#!/bin/bash

# SyncroSpace Monorepo Setup Script
echo "🚀 Setting up SyncroSpace Monorepo..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_title() {
    echo -e "${PURPLE}▓▓▓ $1 ▓▓▓${NC}"
}

# Install root dependencies
print_title "Installing Root Dependencies"
print_status "Installing main SyncroSpace dependencies..."
npm install

if [ $? -eq 0 ]; then
    print_success "Root dependencies installed successfully"
else
    print_error "Failed to install root dependencies"
    exit 1
fi

# Install CaveVerse Client dependencies
print_title "Installing CaveVerse Client Dependencies"
print_status "Installing CaveVerse client dependencies..."
cd space/client
npm install

if [ $? -eq 0 ]; then
    print_success "CaveVerse client dependencies installed successfully"
else
    print_error "Failed to install CaveVerse client dependencies"
    cd ../..
    exit 1
fi

cd ../..

# Install CaveVerse Server dependencies
print_title "Installing CaveVerse Server Dependencies"
print_status "Installing CaveVerse server dependencies..."
cd space/server
npm install

if [ $? -eq 0 ]; then
    print_success "CaveVerse server dependencies installed successfully"
else
    print_error "Failed to install CaveVerse server dependencies"
    cd ../..
    exit 1
fi

cd ../..

print_title "Setup Complete!"
print_success "All dependencies installed successfully!"
print_status "You can now run the following commands:"
echo ""
echo -e "${PURPLE}Development (all servers):${NC}"
echo "  npm run dev"
echo ""
echo -e "${PURPLE}Individual servers:${NC}"
echo "  npm run dev:main          # SyncroSpace main (port 9002)"
echo "  npm run dev:cave-client   # CaveVerse client (port 3001)"
echo "  npm run dev:cave-server   # CaveVerse server (port 2567)"
echo ""
echo -e "${PURPLE}Production build:${NC}"
echo "  npm run build"
echo "  npm run start"
echo ""
print_success "🎉 SyncroSpace Monorepo is ready to go!"