# Authentication Documentation

## Overview

NeoMart API menggunakan sistem autentikasi berbasis JWT (JSON Web Token) dengan dual-token approach (access token + refresh token) dan dukungan OAuth2 Discord. Sistem ini dirancang untuk keamanan tinggi dengan session management berbasis database.

## Authentication Flow

### 1. JWT Token System

```mermaid
graph LR
    A[Client] --> B[Login Request]
    B --> C[Server Validation]
    C --> D[Generate Access Token]
    C --> E[Generate Refresh Token]
    D --> F[Store Session in DB]
    E --> F
    F --> G[Return Both Tokens]
    G --> A
```

### 2. Token Types

#### Access Token
- **Lifetime**: 15 minutes
- **Purpose**: API access authorization
- **Storage**: Client memory/session storage
- **Contains**: userId, email, role, sessionId

#### Refresh Token  
- **Lifetime**: 7 days
- **Purpose**: Generate new access tokens
- **Storage**: Database + client secure storage
- **Contains**: userId, email, role

## API Endpoints

### Authentication Endpoints

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/api/auth/register` | Register new user | ❌ |
| POST | `/api/auth/login` | User login | ❌ |
| POST | `/api/auth/refresh` | Refresh access token | ❌ |
| POST | `/api/auth/logout` | Logout user | ✅ |
| POST | `/api/auth/logout-all` | Logout from all devices | ✅ |
| GET | `/api/auth/sessions` | Get active sessions | ✅ |
| DELETE | `/api/auth/sessions/:id` | Revoke specific session | ✅ |
| GET | `/api/auth/discord` | Discord OAuth2 login | ❌ |
| GET | `/api/auth/discord/callback` | Discord OAuth2 callback | ❌ |

## Request/Response Examples

### 1. User Registration

**Request:**
```http
POST /api/auth/register
Content-Type: application/json

{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "SecurePassword123!"
}
```

**Response (Success):**
```json
{
  "status": "success",
  "message": "User registered successfully. Please verify your email.",
  "data": {
    "message": "User registered successfully. Please verify your email."
  }
}
```

**Response (Error):**
```json
{
  "status": "error",
  "message": "User with this email already exists",
  "code": "VALIDATION_ERROR"
}
```

### 2. User Login

**Request:**
```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "john@example.com",
  "password": "SecurePassword123!"
}
```

**Response (Success):**
```json
{
  "status": "success",
  "message": "Login successful",
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": "cluv1234567890",
      "email": "john@example.com",
      "name": "John Doe",
      "role": "USER",
      "discordId": null,
      "discordUsername": null,
      "discordAvatar": null
    }
  }
}
```

### 3. Token Refresh

**Request:**
```http
POST /api/auth/refresh
Content-Type: application/json

{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Response (Success):**
```json
{
  "status": "success",
  "message": "Token refreshed successfully",
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": "cluv1234567890",
      "email": "john@example.com",
      "name": "John Doe",
      "role": "USER"
    }
  }
}
```

### 4. Logout

**Request:**
```http
POST /api/auth/logout
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Response (Success):**
```json
{
  "status": "success",
  "message": "Logout successful",
  "data": {
    "message": "Logout successful"
  }
}
```

### 5. Get Active Sessions

**Request:**
```http
GET /api/auth/sessions
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Response (Success):**
```json
{
  "status": "success",
  "message": "Sessions retrieved successfully",
  "data": [
    {
      "id": "clux1234567890",
      "createdAt": "2024-01-15T10:30:00Z",
      "expiresAt": "2024-01-22T10:30:00Z",
      "current": true
    },
    {
      "id": "clux0987654321",
      "createdAt": "2024-01-14T15:20:00Z", 
      "expiresAt": "2024-01-21T15:20:00Z",
      "current": false
    }
  ]
}
```

## Discord OAuth2 Integration

### 1. Discord Login Flow

```mermaid
sequenceDiagram
    participant Client
    participant NeoMart API
    participant Discord OAuth
    participant Database

    Client->>NeoMart API: GET /api/auth/discord
    NeoMart API->>Discord OAuth: Redirect to Discord
    Discord OAuth->>Client: Discord Login Page
    Client->>Discord OAuth: Login Credentials
    Discord OAuth->>NeoMart API: Callback with code
    NeoMart API->>Discord OAuth: Exchange code for token
    Discord OAuth->>NeoMart API: User profile data
    NeoMart API->>Database: Create/Update user
    Database->>NeoMart API: User data
    NeoMart API->>Client: JWT tokens + user data
```

### 2. Discord Authentication URLs

**Initiate Discord Login:**
```http
GET /api/auth/discord
```

**Discord Callback (handled automatically):**
```http
GET /api/auth/discord/callback?code=DISCORD_CODE&state=STATE
```

## User Roles & Permissions

### Role Hierarchy

1. **USER** - Basic user privileges
2. **SELLER** - Can create and manage stores
3. **ADMIN** - System administration
4. **FOUNDER** - Full system access

### Role-Based Access Control

```javascript
// Example role check in middleware
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        status: 'error',
        message: 'Insufficient permissions'
      });
    }
    next();
  };
};

// Usage in routes
router.get('/admin', authenticate, authorize('ADMIN', 'FOUNDER'), handler);
```

## Security Features

### 1. Rate Limiting

- **Login attempts**: 10 per 15 minutes per IP/email
- **Registration**: 10 per 15 minutes per IP
- **Token refresh**: 100 per 15 minutes per IP
- **OTP requests**: 5 per 15 minutes per email

### 2. Password Requirements

- Minimum 8 characters
- At least 1 uppercase letter
- At least 1 lowercase letter  
- At least 1 number
- At least 1 special character

### 3. Session Security

- Database-backed sessions
- Automatic cleanup of expired sessions
- Session revocation capability
- Multi-device session management

## Error Codes

| Code | Description | HTTP Status |
|------|-------------|-------------|
| `VALIDATION_ERROR` | Input validation failed | 400 |
| `AUTHENTICATION_ERROR` | Invalid credentials | 401 |
| `TOKEN_EXPIRED` | Token has expired | 401 |
| `TOKEN_INVALID` | Token is malformed | 401 |
| `SESSION_EXPIRED` | Session no longer valid | 401 |
| `AUTHORIZATION_ERROR` | Insufficient permissions | 403 |
| `USER_NOT_FOUND` | User does not exist | 404 |
| `EMAIL_NOT_VERIFIED` | Email verification required | 401 |
| `ACCOUNT_DEACTIVATED` | User account is disabled | 401 |
| `RATE_LIMIT_EXCEEDED` | Too many requests | 429 |

## Best Practices

### 1. Client-Side Implementation

```javascript
// Store tokens securely
localStorage.setItem('accessToken', response.data.accessToken);
localStorage.setItem('refreshToken', response.data.refreshToken);

// Set up axios interceptor for automatic token refresh
axios.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      // Attempt token refresh
      const refreshToken = localStorage.getItem('refreshToken');
      const response = await refreshTokens(refreshToken);
      
      // Retry original request
      return axios(error.config);
    }
    return Promise.reject(error);
  }
);
```

### 2. Token Storage

- **Access Token**: Memory or sessionStorage
- **Refresh Token**: httpOnly cookies (recommended) or secure localStorage
- **Never**: Store tokens in plain text or unsecure locations

### 3. Session Management

```javascript
// Check session validity before important operations
const validateSession = async () => {
  try {
    const response = await axios.get('/api/auth/sessions');
    return response.data.status === 'success';
  } catch (error) {
    // Handle session validation error
    return false;
  }
};
```

## Troubleshooting

### Common Issues

1. **Token Expired Errors**
   - Implement automatic token refresh
   - Check system clock synchronization
   - Validate token expiry handling

2. **CORS Issues**
   - Ensure proper CORS configuration
   - Check allowed origins in server config
   - Verify request headers

3. **Rate Limiting**
   - Implement exponential backoff
   - Cache tokens to reduce requests
   - Monitor rate limit headers

4. **Discord OAuth Issues**
   - Verify Discord app configuration
   - Check callback URL matches exactly
   - Ensure proper scopes are requested

### Debug Mode

Enable debug logging by setting:
```env
NODE_ENV=development
```

This will provide detailed logs for authentication flows and error diagnosis.
