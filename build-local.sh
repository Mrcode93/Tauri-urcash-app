#!/bin/bash
set -e

echo "🚀 Building URCash locally..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

# Check if we're on the right platform
PLATFORM=$(uname -s)
print_status "Detected platform: $PLATFORM"

# Build frontend
print_status "Building frontend..."
cd frontend
if ! npm ci; then
    print_error "Failed to install frontend dependencies"
    exit 1
fi

if ! npm run build; then
    print_error "Failed to build frontend"
    exit 1
fi
print_success "Frontend build complete"

cd ..

# Build rust-server for the current platform
print_status "Building rust-server..."
cd rust-server

if [[ "$PLATFORM" == "Darwin" ]]; then
    # macOS - build for both Intel and ARM
    print_status "Building rust-server for macOS (ARM64)..."
    if cargo build --release --target aarch64-apple-darwin; then
        mkdir -p ../src-tauri/bin
        cp target/aarch64-apple-darwin/release/rust-server ../src-tauri/bin/
        print_success "ARM64 rust-server built successfully"
    else
        print_error "Failed to build rust-server for ARM64"
        exit 1
    fi
elif [[ "$PLATFORM" == "Linux" ]]; then
    # Linux
    if cargo build --release; then
        mkdir -p ../src-tauri/bin
        cp target/release/rust-server ../src-tauri/bin/
        print_success "Linux rust-server built successfully"
    else
        print_error "Failed to build rust-server for Linux"
        exit 1
    fi
else
    print_warning "Unsupported platform for this script: $PLATFORM"
    exit 1
fi

cd ..

# Build Tauri app
print_status "Building Tauri application..."
cd src-tauri

if cargo tauri build; then
    print_success "Tauri application built successfully!"
    
    # Show build outputs
    print_status "Build outputs:"
    if [[ "$PLATFORM" == "Darwin" ]]; then
        echo "📦 macOS App: target/release/bundle/macos/أوركاش.app"
        echo "📀 macOS DMG: target/release/bundle/dmg/أوركاش_1.0.0_aarch64.dmg"
    elif [[ "$PLATFORM" == "Linux" ]]; then
        echo "📦 Linux AppImage: target/release/bundle/appimage/أوركاش_1.0.0_amd64.AppImage"  
        echo "📦 Linux DEB: target/release/bundle/deb/أوركاش_1.0.0_amd64.deb"
    fi
else
    print_error "Failed to build Tauri application"
    exit 1
fi

cd ..

print_success "🎉 Build complete! Check src-tauri/target/release/bundle/ for output files."

# Final instructions
echo ""
print_status "Next steps:"
if [[ "$PLATFORM" == "Darwin" ]]; then
    echo "  • Install: Open the DMG file and drag the app to Applications"
    echo "  • For Windows builds: Use GitHub Actions or build on a Windows machine"
elif [[ "$PLATFORM" == "Linux" ]]; then
    echo "  • Install DEB: sudo dpkg -i src-tauri/target/release/bundle/deb/*.deb"
    echo "  • Run AppImage: chmod +x *.AppImage && ./أوركاش_1.0.0_amd64.AppImage"
fi
echo "  • For distribution: Push to GitHub and create a release tag"