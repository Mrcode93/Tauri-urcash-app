# URCash - Point of Sale & Inventory Management System

A comprehensive Point of Sale (POS) and inventory management system built with Tauri, React, TypeScript, and Rust. URCash provides a modern, cross-platform solution for retail businesses with advanced features for sales, inventory, customer management, and financial tracking.

## 🚀 Features

### Core Features
- **Point of Sale (POS)**: Fast and intuitive sales interface with barcode scanning
- **Inventory Management**: Complete stock tracking with movements and adjustments
- **Customer Management**: Customer profiles, receipts, and debt tracking
- **Supplier Management**: Supplier profiles and payment tracking
- **Sales & Purchases**: Comprehensive sales and purchase management
- **Financial Management**: Cash box management, expenses, and financial reports
- **User Management**: Role-based access control with granular permissions
- **Reports & Analytics**: Detailed reports and performance indicators

### Advanced Features
- **Multi-device Support**: Main and secondary device configurations
- **Cloud Backup**: Automated cloud backup system
- **License Management**: Built-in license verification and protection
- **Print Integration**: Thermal printer and bill printing support
- **Barcode Generation**: Custom barcode generation and printing
- **Real-time Sync**: Live data synchronization between devices
- **Performance Monitoring**: System performance tracking and optimization

## 🛠️ Technology Stack

### Frontend
- **React 18** with TypeScript
- **Redux Toolkit** for state management
- **Tailwind CSS** for styling
- **Shadcn/ui** for UI components
- **Vite** for build tooling
- **React Router** for navigation

### Backend
- **Rust** with Axum framework
- **SQLite** database with SQLx
- **JWT** authentication
- **Role-based permissions** system

### Desktop Application
- **Tauri 2.0** for cross-platform desktop app
- **Rust** backend server
- **WebView** frontend

## 📋 Prerequisites

Before running this project, make sure you have the following installed:

- **Node.js** (v18 or higher)
- **Rust** (latest stable)
- **Cargo** (comes with Rust)
- **Tauri CLI** (`cargo install tauri-cli --version ^2.0.0`)
- **Git**

### System Dependencies

#### Ubuntu/Debian
```bash
sudo apt-get update
sudo apt-get install -y libwebkit2gtk-4.0-dev libwebkit2gtk-4.1-dev libappindicator3-dev librsvg2-dev patchelf
```

#### macOS
```bash
# Install Xcode Command Line Tools
xcode-select --install
```

#### Windows
```bash
# Install Visual Studio Build Tools
# Download from: https://visualstudio.microsoft.com/downloads/#build-tools-for-visual-studio-2022
```

## 🚀 Quick Start

### 1. Clone the Repository
```bash
git clone https://github.com/yourusername/urcash.git
cd urcash
```

### 2. Install Dependencies

#### Frontend Dependencies
```bash
cd frontend
npm install
```

#### Rust Dependencies
```bash
cd rust-server
cargo build
```

### 3. Environment Setup

#### Frontend Environment
```bash
cd frontend
cp .env.example .env
# Edit .env with your configuration
```

#### Backend Environment
```bash
cd rust-server
cp .env.example .env
# Edit .env with your configuration
```

### 4. Development

#### Start Frontend Development Server
```bash
cd frontend
npm run dev
```

#### Start Rust Backend Server
```bash
cd rust-server
cargo run
```

#### Start Tauri Development
```bash
# From project root
cargo tauri dev
```

### 5. Build for Production

#### Build Frontend
```bash
cd frontend
npm run build
```

#### Build Rust Server
```bash
cd rust-server
cargo build --release
```

#### Build Tauri Application
```bash
# From project root
cargo tauri build
```

## 📁 Project Structure

```
urcash/
├── frontend/                 # React frontend application
│   ├── src/
│   │   ├── components/      # Reusable UI components
│   │   ├── features/        # Feature-based modules
│   │   ├── pages/          # Page components
│   │   ├── hooks/          # Custom React hooks
│   │   ├── lib/            # Utility libraries
│   │   └── utils/          # Helper utilities
│   ├── public/             # Static assets
│   └── package.json
├── rust-server/            # Rust backend server
│   ├── src/
│   │   ├── routes/         # API routes
│   │   ├── services/       # Business logic
│   │   ├── models/         # Data models
│   │   ├── middleware/     # HTTP middleware
│   │   └── database/       # Database operations
│   └── Cargo.toml
├── src-tauri/              # Tauri desktop application
│   ├── src/               # Tauri-specific code
│   ├── bin/               # Binary files
│   └── tauri.conf.json    # Tauri configuration
├── server/                # Legacy Node.js server (for reference)
└── README.md
```

## 🔧 Configuration

### Database Configuration
The application uses SQLite as the primary database. The database file is automatically created on first run.

### License Configuration
Set up your license key in the environment variables:
```env
LICENSE_KEY=your_license_key_here
```

### Device Configuration
Configure main/secondary device settings in the application settings panel.

## 🧪 Testing

### Frontend Tests
```bash
cd frontend
npm test
```

### Backend Tests
```bash
cd rust-server
cargo test
```

## 📦 Building for Distribution

### Using GitHub Actions
The project includes GitHub Actions workflows for automated builds:

1. Push to `main` branch or create a tag starting with `v`
2. GitHub Actions will automatically build for all platforms
3. Releases are created automatically for tags

### Manual Build
```bash
# Build for current platform
cargo tauri build

# Build for specific target
cargo tauri build --target x86_64-unknown-linux-gnu
```

## 🔐 Security Features

- **JWT Authentication**: Secure token-based authentication
- **Role-based Access Control**: Granular permission system
- **Input Validation**: Comprehensive input sanitization
- **SQL Injection Protection**: Parameterized queries
- **License Protection**: Built-in license verification

## 📊 Performance

- **Fast Startup**: Optimized application startup
- **Efficient Database**: SQLite with proper indexing
- **Memory Management**: Optimized memory usage
- **Caching**: Intelligent caching strategies

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Development Guidelines

- Follow TypeScript best practices
- Use Rust idioms and patterns
- Write comprehensive tests
- Update documentation for new features
- Follow the existing code style

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

For support and questions:

- Create an issue on GitHub
- Check the documentation in the `/docs` folder
- Review the troubleshooting guide

## 🗺️ Roadmap

- [ ] Mobile application
- [ ] Advanced analytics dashboard
- [ ] Multi-language support
- [ ] API for third-party integrations
- [ ] Advanced reporting features
- [ ] Cloud synchronization improvements

## 🙏 Acknowledgments

- Tauri team for the excellent desktop framework
- React team for the amazing frontend library
- Rust team for the safe and fast programming language
- All contributors and users of this project

---

**URCash** - Empowering retail businesses with modern technology.
