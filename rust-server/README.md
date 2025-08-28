# Rust Server - Sales App Backend

This is a Rust implementation of the sales application backend, providing the same functionality as the original Node.js server but with improved performance and type safety.

## Features

- **Authentication & Authorization**: JWT-based authentication with role-based access control
- **Database**: SQLite with SQLx for type-safe database operations
- **API**: RESTful API built with Axum web framework
- **Caching**: In-memory caching with Moka
- **Logging**: Structured logging with tracing
- **CORS**: Cross-origin resource sharing support
- **Rate Limiting**: Built-in rate limiting protection
- **File Upload**: Support for file uploads
- **Excel Processing**: Excel file import/export capabilities

## Project Structure

```
src/
├── main.rs                 # Application entry point
├── database/              # Database connection and migrations
│   └── mod.rs
├── models/                # Data models and DTOs
│   ├── mod.rs
│   ├── user.rs
│   ├── customer.rs
│   ├── product.rs
│   ├── sale.rs
│   ├── purchase.rs
│   └── ...
├── services/              # Business logic services
│   ├── mod.rs
│   ├── auth_service.rs
│   ├── cache_service.rs
│   ├── user_service.rs
│   └── ...
├── routes/                # API route handlers
│   ├── mod.rs
│   ├── auth_routes.rs
│   ├── user_routes.rs
│   ├── customer_routes.rs
│   └── ...
├── middleware/            # HTTP middleware
│   ├── mod.rs
│   ├── auth_middleware.rs
│   └── ...
├── controllers/           # Request/response controllers
│   └── mod.rs
└── utils/                 # Utility functions
    └── mod.rs
```

## Database Schema

The server creates the following tables:

- **users**: User accounts and authentication
- **customers**: Customer information and credit management
- **products**: Product catalog with pricing
- **sales**: Sales transactions and invoices
- **purchases**: Purchase transactions from suppliers
- **inventory**: Stock levels and availability
- **stocks**: Stock batches and expiry tracking
- **debts**: Customer debt tracking
- **expenses**: Business expense tracking
- **employees**: Employee management
- **suppliers**: Supplier information
- **settings**: Application configuration
- **licenses**: Software licensing
- **devices**: Device management
- **money_boxes**: Cash management
- **cash_box**: Cash transactions
- **bills**: Customer billing
- **installments**: Debt installment plans
- **receipts**: Payment receipts
- **stock_movements**: Inventory movement tracking
- **delegates**: Sales delegate management

## Getting Started

### Prerequisites

- Rust 1.70+ (stable)
- SQLite3

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd rust-server
```

2. Install dependencies:
```bash
cargo build
```

3. Set up environment variables:
```bash
# Create .env file
cp .env.example .env

# Edit .env with your configuration
PORT=39000
JWT_SECRET=your_super_secret_jwt_key_here
RUST_LOG=info
```

4. Run the server:
```bash
cargo run
```

The server will start on `http://localhost:39000` (or the port specified in your .env file).

## API Endpoints

### Authentication
- `POST /login` - User login
- `POST /register` - User registration
- `GET /profile` - Get current user profile

### Users
- `GET /users` - List all users
- `POST /users` - Create new user
- `GET /users/{id}` - Get user by ID
- `PUT /users/{id}` - Update user
- `DELETE /users/{id}` - Delete user

### Customers
- `GET /customers` - List all customers
- `POST /customers` - Create new customer
- `GET /customers/{id}` - Get customer by ID
- `PUT /customers/{id}` - Update customer
- `DELETE /customers/{id}` - Delete customer

### Products
- `GET /products` - List all products
- `POST /products` - Create new product
- `GET /products/{id}` - Get product by ID
- `PUT /products/{id}` - Update product
- `DELETE /products/{id}` - Delete product

### Sales
- `GET /sales` - List all sales
- `POST /sales` - Create new sale
- `GET /sales/{id}` - Get sale by ID
- `PUT /sales/{id}` - Update sale
- `DELETE /sales/{id}` - Delete sale

### Inventory
- `GET /inventory` - List inventory levels
- `POST /inventory/update` - Update inventory
- `GET /inventory/low-stock` - Get low stock items

### Reports
- `GET /reports/sales` - Sales reports
- `GET /reports/purchases` - Purchase reports
- `GET /reports/debts` - Debt reports
- `GET /reports/expenses` - Expense reports

## Configuration

### Environment Variables

- `PORT`: Server port (default: 39000)
- `JWT_SECRET`: Secret key for JWT tokens
- `RUST_LOG`: Logging level (default: info)
- `DATABASE_URL`: Database connection string

### Database

The database file is automatically created at `~/.urcash/database.sqlite` on first run. The server will:

1. Create the database directory if it doesn't exist
2. Initialize all tables with proper schemas
3. Create indexes for optimal performance
4. Apply SQLite optimizations

## Development

### Building

```bash
# Development build
cargo build

# Release build
cargo build --release
```

### Testing

```bash
# Run tests
cargo test

# Run tests with output
cargo test -- --nocapture
```

### Code Quality

```bash
# Format code
cargo fmt

# Check for issues
cargo clippy

# Fix issues automatically
cargo fix
```

## Performance Optimizations

- **Connection Pooling**: SQLx connection pool for database operations
- **Caching**: In-memory caching for frequently accessed data
- **SQLite Optimizations**: WAL mode, memory-mapped I/O, optimized pragmas
- **Async/Await**: Non-blocking I/O throughout the application
- **Compression**: HTTP response compression
- **Rate Limiting**: Protection against abuse

## Security Features

- **JWT Authentication**: Secure token-based authentication
- **Password Hashing**: BCrypt password hashing
- **CORS Protection**: Configurable cross-origin policies
- **Rate Limiting**: Request rate limiting
- **Input Validation**: Request validation and sanitization
- **SQL Injection Protection**: Parameterized queries with SQLx

## Monitoring and Logging

- **Structured Logging**: JSON-formatted logs with tracing
- **Request Logging**: HTTP request/response logging
- **Error Tracking**: Comprehensive error handling and logging
- **Performance Monitoring**: Database and cache performance tracking

## Deployment

### Docker

```dockerfile
FROM rust:1.70 as builder
WORKDIR /app
COPY . .
RUN cargo build --release

FROM debian:bullseye-slim
RUN apt-get update && apt-get install -y sqlite3 && rm -rf /var/lib/apt/lists/*
COPY --from=builder /app/target/release/rust-server /usr/local/bin/
EXPOSE 39000
CMD ["rust-server"]
```

### Systemd Service

Create `/etc/systemd/system/rust-server.service`:

```ini
[Unit]
Description=Rust Sales App Server
After=network.target

[Service]
Type=simple
User=rust-server
WorkingDirectory=/opt/rust-server
ExecStart=/opt/rust-server/rust-server
Restart=always
Environment=RUST_LOG=info

[Install]
WantedBy=multi-user.target
```

## Migration from Node.js

This Rust server is designed to be a drop-in replacement for the Node.js server. Key differences:

1. **Performance**: Significantly faster due to Rust's zero-cost abstractions
2. **Memory Safety**: No runtime errors due to Rust's ownership system
3. **Type Safety**: Compile-time type checking prevents many bugs
4. **Concurrency**: Better async/await implementation with Tokio
5. **Database**: Type-safe database operations with SQLx

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Ensure all tests pass
6. Submit a pull request

## License

This project is licensed under the ISC License - see the LICENSE file for details.

## Support

For support and questions, please open an issue on the GitHub repository.
