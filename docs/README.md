# NeoMart Backend API Documentation

Selamat datang di dokumentasi lengkap NeoMart Backend API. Dokumentasi ini menyediakan panduan komprehensif untuk mengintegrasikan dan menggunakan semua fitur API NeoMart.

## 📚 Daftar Dokumentasi

### Core Documentation

1. **[Authentication Documentation](./auth_docs.md)**
   - JWT Token System
   - Discord OAuth2 Integration
   - Session Management
   - Role-Based Access Control
   - Security Features & Best Practices

2. **[Login Implementation Guide](./login_implementasi.md)**
   - Vanilla JavaScript Implementation
   - React.js Implementation
   - Vue.js Implementation
   - React Native Implementation
   - Error Handling & Security

3. **[Product Management](./product_management.md)**
   - Product CRUD Operations
   - Advanced Search & Filtering
   - Rating & Review System
   - Image Management
   - Inventory Tracking

### Quick Start

#### Base URL
```
http://localhost:4000/api
```

#### Authentication Header
```http
Authorization: Bearer YOUR_ACCESS_TOKEN
```

#### Standard Response Format
```json
{
  "status": "success|error",
  "message": "Human readable message",
  "data": {} // Response data (success only)
}
```

## 🚀 Getting Started

### 1. Setup Development Environment

```bash
# Clone repository
git clone https://github.com/Sezy0/NeoMart_Backend.git
cd NeoMart_Backend

# Install dependencies
npm install

# Setup environment
cp .env.example .env
# Edit .env with your configuration

# Setup database
npm run db:generate
npm run db:migrate
npm run db:seed

# Start development server
npm run dev
```

### 2. Basic Authentication Flow

```javascript
// 1. Register user
const registerResponse = await fetch('/api/auth/register', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    name: 'John Doe',
    email: 'john@example.com',
    password: 'SecurePass123!'
  })
});

// 2. Login user
const loginResponse = await fetch('/api/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: 'john@example.com',
    password: 'SecurePass123!'
  })
});

const { accessToken, refreshToken, user } = loginResponse.data;

// 3. Use access token for authenticated requests
const protectedResponse = await fetch('/api/users/me', {
  headers: {
    'Authorization': `Bearer ${accessToken}`
  }
});
```

### 3. Common API Patterns

#### Pagination
```javascript
// Most list endpoints support pagination
const products = await fetch('/api/products?page=1&limit=20');
```

#### Filtering & Search
```javascript
// Advanced filtering capabilities
const filteredProducts = await fetch('/api/products?category=electronics&minPrice=100&search=smartphone');
```

#### Error Handling
```javascript
try {
  const response = await fetch('/api/products');
  const result = await response.json();
  
  if (result.status === 'error') {
    console.error('API Error:', result.message);
  }
} catch (error) {
  console.error('Network Error:', error);
}
```

## 📋 API Endpoints Overview

### Authentication Endpoints
- `POST /auth/register` - Register new user
- `POST /auth/login` - User login
- `POST /auth/refresh` - Refresh access token
- `POST /auth/logout` - Logout user
- `GET /auth/discord` - Discord OAuth2 login

### User Management
- `GET /users/me` - Get current user profile
- `PUT /users/me` - Update user profile
- `GET|POST|DELETE /users/cart` - Cart management

### Store Management
- `POST /stores` - Create new store
- `GET /stores` - List all stores
- `GET /stores/:id` - Get store details
- `PUT /stores/:id` - Update store
- `POST /stores/:id/approve` - Approve store (Admin)

### Product Management
- `GET /products` - List products with filters
- `GET /products/:id` - Get product details
- `POST /products` - Create product (Seller)
- `PUT /products/:id` - Update product
- `DELETE /products/:id` - Delete product

### Order Management
- `POST /orders` - Create new order
- `GET /orders/:id` - Get order details
- `GET /orders/user/:userId` - User orders
- `PUT /orders/:id/status` - Update order status

### File Upload
- `POST /upload/image` - Upload single image
- `POST /upload/images` - Upload multiple images
- `DELETE /upload/:fileId` - Delete uploaded file

### OTP Management
- `POST /otp/send` - Send OTP via email
- `POST /otp/verify` - Verify OTP code

## 🛡️ Security & Rate Limiting

### Rate Limits
- **General API**: 100 requests per 15 minutes
- **Authentication**: 10 requests per 15 minutes
- **Login Attempts**: 10 per 15 minutes per IP/email
- **OTP Requests**: 5 per 15 minutes per email

### Security Headers Required
- `Content-Type: application/json`
- `Authorization: Bearer <token>` (for protected endpoints)

### CORS Policy
- Development: `http://localhost:3000`
- Production: Configure via `CORS_ORIGIN` environment variable

## 📊 Response Status Codes

| Code | Description |
|------|-------------|
| 200 | Success |
| 201 | Created |
| 400 | Bad Request (Validation Error) |
| 401 | Unauthorized (Authentication Required) |
| 403 | Forbidden (Insufficient Permissions) |
| 404 | Not Found |
| 409 | Conflict (Resource Already Exists) |
| 429 | Too Many Requests (Rate Limited) |
| 500 | Internal Server Error |

## 🔍 Error Codes Reference

| Code | Description | HTTP Status |
|------|-------------|-------------|
| `VALIDATION_ERROR` | Input validation failed | 400 |
| `AUTHENTICATION_ERROR` | Invalid credentials | 401 |
| `TOKEN_EXPIRED` | JWT token expired | 401 |
| `AUTHORIZATION_ERROR` | Insufficient permissions | 403 |
| `RESOURCE_NOT_FOUND` | Resource doesn't exist | 404 |
| `RESOURCE_EXISTS` | Resource already exists | 409 |
| `RATE_LIMIT_EXCEEDED` | Too many requests | 429 |

## 🧪 Testing & Development

### Using Postman
Import our Postman collection for easy API testing:
```bash
# Collection file location
./postman/NeoMart_API.postman_collection.json
```

### Using cURL
```bash
# Health check
curl http://localhost:4000/health

# Login
curl -X POST http://localhost:4000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@neomart.com","password":"Admin123!"}'

# Get products
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:4000/api/products
```

### Using JavaScript Fetch
```javascript
// Create API client utility
class NeoMartAPI {
  constructor(baseURL = 'http://localhost:4000/api') {
    this.baseURL = baseURL;
    this.accessToken = localStorage.getItem('accessToken');
  }

  async request(endpoint, options = {}) {
    const url = `${this.baseURL}${endpoint}`;
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    if (this.accessToken) {
      headers.Authorization = `Bearer ${this.accessToken}`;
    }

    const response = await fetch(url, {
      ...options,
      headers,
    });

    return response.json();
  }

  // Convenience methods
  get(endpoint, options) {
    return this.request(endpoint, { ...options, method: 'GET' });
  }

  post(endpoint, data, options) {
    return this.request(endpoint, {
      ...options,
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  put(endpoint, data, options) {
    return this.request(endpoint, {
      ...options,
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  delete(endpoint, options) {
    return this.request(endpoint, { ...options, method: 'DELETE' });
  }
}

// Usage
const api = new NeoMartAPI();
const products = await api.get('/products?category=electronics');
```

## 🔧 Environment Configuration

### Required Environment Variables
```env
# Database
DATABASE_URL=mysql://user:password@localhost:3306/neomart

# JWT Secrets
JWT_ACCESS_SECRET=your_access_secret
JWT_REFRESH_SECRET=your_refresh_secret

# Redis (Optional - for caching)
REDIS_URL=redis://localhost:6379

# ImageKit.io (For file uploads)
IMAGEKIT_PUBLIC_KEY=your_public_key
IMAGEKIT_PRIVATE_KEY=your_private_key
IMAGEKIT_URL_ENDPOINT=https://ik.imagekit.io/your_id

# Email Configuration (For OTP)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_password

# Discord OAuth2 (Optional)
DISCORD_CLIENT_ID=your_discord_client_id
DISCORD_CLIENT_SECRET=your_discord_client_secret
```

## 📞 Support & Contributing

### Getting Help
- 📧 Email: support@neomart.com
- 🐛 Issues: [GitHub Issues](https://github.com/Sezy0/NeoMart_Backend/issues)
- 📖 Documentation: This repository's `/docs` folder

### Contributing
1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

### Development Guidelines
- Follow TypeScript best practices
- Add tests for new features
- Update documentation for API changes
- Ensure proper error handling
- Follow security best practices

## 📋 Changelog

### Version 1.0.0
- ✅ Complete authentication system
- ✅ Multi-vendor store management
- ✅ Product catalog with search
- ✅ Order processing system
- ✅ Rating & review system
- ✅ File upload with ImageKit.io
- ✅ Redis caching integration
- ✅ Docker containerization
- ✅ Comprehensive API documentation

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](../LICENSE) file for details.

---

**Happy Coding! 🚀**

For detailed implementation examples, please refer to the specific documentation files in this folder.
