# NeoMart Backend REST API

A production-ready multi-vendor e-commerce marketplace backend API built with Node.js, TypeScript, Express, and Prisma. The system supports comprehensive vendor operations with multiple authentication methods including traditional email/password and Discord OAuth2 integration.

## 🚀 Features

- **Dual Authentication System**: Email/password + Discord OAuth2 integration
- **Multi-role Authorization**: USER, SELLER, ADMIN, FOUNDER with granular permissions
- **Store Management**: Complete vendor workflow with admin approval process
- **Product Catalog**: Advanced search, filtering, and categorization
- **Order Processing**: Atomic transactions with payment gateway integration
- **Coupon System**: Flexible discount management with usage tracking
- **Rating & Review System**: Order-based review eligibility
- **OTP Verification**: Email verification and password reset workflows
- **File Storage**: ImageKit.io for image upload, optimization, and CDN delivery
- **Background Processing**: Redis.io (cloud) + BullMQ for email notifications and async tasks
- **Production Ready**: Comprehensive testing, CI/CD, and Docker deployment

## 🛠 Technology Stack

### Core Technologies
- **Runtime**: Node.js
- **Language**: TypeScript
- **Framework**: Express.js
- **Database**: MySQL with Prisma ORM
- **Cache/Session**: Redis.io (cloud service) for caching and session management
- **Queue**: BullMQ for background job processing
- **File Storage**: ImageKit.io for image upload, transformation, and CDN delivery
- **OAuth2**: Discord OAuth2 integration with passport.js

### Security & Validation
- **Authentication**: JWT (access + refresh tokens) stored in Session table
- **OAuth2**: Discord OAuth2 with passport-discord strategy
- **Password Hashing**: bcrypt for password-based accounts
- **Input Validation**: Zod for request/response validation
- **Security**: Helmet, CORS configuration, express-rate-limit
- **Rate Limiting**: IP-based limits on auth endpoints (login, register, OTP)
- **OTP System**: Email-based verification for account activation and password reset

## 📋 Prerequisites

- Node.js 18+ 
- MySQL 8.0+
- Redis.io cloud account (or local Redis for development)
- ImageKit.io account
- Discord OAuth2 application (optional)

## 🚀 Quick Start

### 1. Clone the repository
```bash
git clone https://github.com/Sezy0/NeoMart_Backend.git
cd NeoMart_Backend
```

### 2. Install dependencies
```bash
npm install
```

### 3. Environment setup
```bash
cp .env.example .env
```

Edit `.env` with your configuration:
```env
# Database
DATABASE_URL=mysql://user:pass@localhost:3306/neomart

# Server
PORT=4000
APP_HOST=http://localhost:4000
NODE_ENV=development

# JWT
JWT_ACCESS_SECRET=your_access_secret_key_here
JWT_REFRESH_SECRET=your_refresh_secret_key_here

# Discord OAuth2 (optional)
DISCORD_CLIENT_ID=your_discord_client_id
DISCORD_CLIENT_SECRET=your_discord_client_secret
DISCORD_REDIRECT_URI=http://localhost:4000/api/auth/discord/callback

# ImageKit.io
IMAGEKIT_PUBLIC_KEY=your_imagekit_public_key
IMAGEKIT_PRIVATE_KEY=your_imagekit_private_key
IMAGEKIT_URL_ENDPOINT=https://ik.imagekit.io/your_imagekit_id

# Redis.io Cloud
REDIS_URL=rediss://default:password@redis.io:port
```

### 4. Database setup
```bash
# Generate Prisma client
npm run db:generate

# Run database migrations
npm run db:migrate

# Seed database (optional)
npm run db:seed
```

### 5. Start development server
```bash
npm run dev
```

The API will be available at `http://localhost:4000`

## 🐳 Docker Deployment

### Development with Docker Compose
```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f app

# Stop services
docker-compose down
```

### Production Docker Build
```bash
# Build image
docker build -t neomart-api .

# Run container
docker run -p 4000:4000 --env-file .env neomart-api
```

## 📚 API Documentation

### Base URL
```
http://localhost:4000/api
```

### Authentication Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/auth/register` | Register new user |
| POST | `/auth/login` | User login |
| POST | `/auth/refresh` | Refresh access token |
| POST | `/auth/logout` | Logout user |
| GET | `/auth/discord` | Discord OAuth2 login |
| GET | `/auth/discord/callback` | Discord OAuth2 callback |

### Example: User Registration
```bash
curl -X POST http://localhost:4000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "John Doe",
    "email": "john@example.com",
    "password": "SecurePass123!"
  }'
```

### Example: User Login
```bash
curl -X POST http://localhost:4000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john@example.com",
    "password": "SecurePass123!"
  }'
```

## 🧪 Testing

```bash
# Run all tests
npm test

# Run tests with coverage
npm run test:coverage

# Run tests in watch mode
npm run test:watch
```

## 🔧 Development

### Code Quality
```bash
# Lint code
npm run lint

# Fix linting issues
npm run lint:fix

# Format code
npm run format

# Type check
npm run type-check
```

### Database Operations
```bash
# Generate Prisma client
npm run db:generate

# Create migration
npm run db:migrate

# Deploy migrations
npm run db:deploy

# Seed database
npm run db:seed
```

## 📁 Project Structure

```
src/
├── config/          # Configuration files
├── controllers/     # Route controllers
├── middleware/      # Express middleware
├── routes/          # API routes
├── services/        # Business logic
├── types/           # TypeScript types
├── utils/           # Utility functions
└── server.ts        # Application entry point

prisma/
├── schema.prisma    # Database schema
└── migrations/      # Database migrations

tests/
├── unit/            # Unit tests
├── integration/     # Integration tests
└── fixtures/        # Test data
```

## 🔐 Security Features

- **JWT Authentication**: Secure token-based authentication
- **Rate Limiting**: Prevent abuse with configurable rate limits
- **Input Validation**: Comprehensive request validation with Zod
- **Password Security**: bcrypt hashing with salt rounds
- **CORS Protection**: Configurable CORS policies
- **Helmet Security**: Standard security headers
- **Session Management**: Database-backed session tracking

## 🚀 Deployment

### Environment Variables for Production
```env
NODE_ENV=production
DATABASE_URL=mysql://user:pass@prod-mysql:3306/neomart
REDIS_URL=rediss://default:password@prod-redis.redis.io:port
JWT_ACCESS_SECRET=strong_production_secret
JWT_REFRESH_SECRET=strong_production_refresh_secret
```

### Health Check
```bash
curl http://localhost:4000/health
```

## 📊 Monitoring

The API includes built-in logging with Winston:
- Error logs: `logs/error.log`
- Combined logs: `logs/combined.log`
- Console output in development

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

For support, email support@neomart.com or create an issue on GitHub.

## 🔄 Changelog

See [CHANGELOG.md](CHANGELOG.md) for a list of changes and version history.