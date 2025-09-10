# Login Implementation Guide

## Overview

Panduan lengkap implementasi sistem login untuk frontend applications menggunakan NeoMart Backend API. Dokumen ini mencakup implementasi dalam berbagai teknologi frontend populer.

## Table of Contents

1. [Vanilla JavaScript Implementation](#vanilla-javascript-implementation)
2. [React.js Implementation](#reactjs-implementation)
3. [Vue.js Implementation](#vuejs-implementation)
4. [Angular Implementation](#angular-implementation)
5. [React Native Implementation](#react-native-implementation)
6. [Flutter Implementation](#flutter-implementation)
7. [Error Handling](#error-handling)
8. [Security Best Practices](#security-best-practices)

## Vanilla JavaScript Implementation

### 1. Basic Login Function

```javascript
class AuthService {
  constructor() {
    this.baseURL = 'http://localhost:4000/api';
    this.accessToken = localStorage.getItem('accessToken');
    this.refreshToken = localStorage.getItem('refreshToken');
  }

  async login(email, password) {
    try {
      const response = await fetch(`${this.baseURL}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          password
        })
      });

      const result = await response.json();

      if (result.status === 'success') {
        // Store tokens securely
        this.accessToken = result.data.accessToken;
        this.refreshToken = result.data.refreshToken;
        
        localStorage.setItem('accessToken', this.accessToken);
        localStorage.setItem('refreshToken', this.refreshToken);
        localStorage.setItem('user', JSON.stringify(result.data.user));

        return {
          success: true,
          user: result.data.user,
          tokens: {
            access: result.data.accessToken,
            refresh: result.data.refreshToken
          }
        };
      } else {
        throw new Error(result.message);
      }
    } catch (error) {
      console.error('Login failed:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  async refreshAccessToken() {
    try {
      const response = await fetch(`${this.baseURL}/auth/refresh`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          refreshToken: this.refreshToken
        })
      });

      const result = await response.json();

      if (result.status === 'success') {
        this.accessToken = result.data.accessToken;
        this.refreshToken = result.data.refreshToken;
        
        localStorage.setItem('accessToken', this.accessToken);
        localStorage.setItem('refreshToken', this.refreshToken);
        
        return true;
      }
      return false;
    } catch (error) {
      console.error('Token refresh failed:', error);
      return false;
    }
  }

  async logout() {
    try {
      await fetch(`${this.baseURL}/auth/logout`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.accessToken}`
        }
      });
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      // Clear local storage regardless of API call result
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('user');
      this.accessToken = null;
      this.refreshToken = null;
    }
  }

  isAuthenticated() {
    return !!this.accessToken;
  }

  getUser() {
    const user = localStorage.getItem('user');
    return user ? JSON.parse(user) : null;
  }
}

// Usage example
const authService = new AuthService();

// Login form handler
document.getElementById('loginForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const email = document.getElementById('email').value;
  const password = document.getElementById('password').value;
  const errorDiv = document.getElementById('error');
  const loginButton = document.getElementById('loginButton');
  
  // Show loading state
  loginButton.disabled = true;
  loginButton.textContent = 'Logging in...';
  errorDiv.textContent = '';
  
  const result = await authService.login(email, password);
  
  if (result.success) {
    // Redirect to dashboard or update UI
    window.location.href = '/dashboard';
  } else {
    errorDiv.textContent = result.error;
    loginButton.disabled = false;
    loginButton.textContent = 'Login';
  }
});
```

### 2. Automatic Token Refresh

```javascript
class APIClient {
  constructor() {
    this.authService = new AuthService();
  }

  async makeRequest(url, options = {}) {
    const defaultOptions = {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      }
    };

    // Add authorization header if authenticated
    if (this.authService.isAuthenticated()) {
      defaultOptions.headers.Authorization = `Bearer ${this.authService.accessToken}`;
    }

    try {
      let response = await fetch(url, { ...options, ...defaultOptions });

      // Handle token expiration
      if (response.status === 401) {
        const refreshed = await this.authService.refreshAccessToken();
        
        if (refreshed) {
          // Retry with new token
          defaultOptions.headers.Authorization = `Bearer ${this.authService.accessToken}`;
          response = await fetch(url, { ...options, ...defaultOptions });
        } else {
          // Refresh failed, redirect to login
          window.location.href = '/login';
          return null;
        }
      }

      return response;
    } catch (error) {
      console.error('API request failed:', error);
      throw error;
    }
  }
}
```

## React.js Implementation

### 1. Auth Context

```jsx
// contexts/AuthContext.js
import React, { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [accessToken, setAccessToken] = useState(localStorage.getItem('accessToken'));
  const [refreshToken, setRefreshToken] = useState(localStorage.getItem('refreshToken'));

  const baseURL = process.env.REACT_APP_API_URL || 'http://localhost:4000/api';

  useEffect(() => {
    // Check if user is already logged in
    const savedUser = localStorage.getItem('user');
    if (savedUser && accessToken) {
      setUser(JSON.parse(savedUser));
    }
    setLoading(false);
  }, [accessToken]);

  const login = async (email, password) => {
    try {
      const response = await fetch(`${baseURL}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      const result = await response.json();

      if (result.status === 'success') {
        const { accessToken, refreshToken, user } = result.data;
        
        setAccessToken(accessToken);
        setRefreshToken(refreshToken);
        setUser(user);
        
        localStorage.setItem('accessToken', accessToken);
        localStorage.setItem('refreshToken', refreshToken);
        localStorage.setItem('user', JSON.stringify(user));

        return { success: true, user };
      } else {
        throw new Error(result.message);
      }
    } catch (error) {
      return { success: false, error: error.message };
    }
  };

  const logout = async () => {
    try {
      if (accessToken) {
        await fetch(`${baseURL}/auth/logout`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
          },
        });
      }
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setUser(null);
      setAccessToken(null);
      setRefreshToken(null);
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('user');
    }
  };

  const refreshAccessToken = async () => {
    try {
      const response = await fetch(`${baseURL}/auth/refresh`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ refreshToken }),
      });

      const result = await response.json();

      if (result.status === 'success') {
        const { accessToken: newAccessToken, refreshToken: newRefreshToken } = result.data;
        
        setAccessToken(newAccessToken);
        setRefreshToken(newRefreshToken);
        
        localStorage.setItem('accessToken', newAccessToken);
        localStorage.setItem('refreshToken', newRefreshToken);
        
        return newAccessToken;
      }
      return null;
    } catch (error) {
      console.error('Token refresh failed:', error);
      return null;
    }
  };

  const value = {
    user,
    login,
    logout,
    refreshAccessToken,
    isAuthenticated: !!user,
    loading,
    accessToken,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
```

### 2. Login Component

```jsx
// components/Login.js
import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!email || !password) {
      setError('Please fill in all fields');
      return;
    }

    setLoading(true);
    setError('');

    const result = await login(email, password);

    if (result.success) {
      navigate('/dashboard');
    } else {
      setError(result.error);
    }
    
    setLoading(false);
  };

  return (
    <div className="login-container">
      <form onSubmit={handleSubmit} className="login-form">
        <h2>Login to NeoMart</h2>
        
        {error && <div className="error-message">{error}</div>}
        
        <div className="form-group">
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            disabled={loading}
          />
        </div>
        
        <div className="form-group">
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            disabled={loading}
          />
        </div>
        
        <button type="submit" disabled={loading} className="login-button">
          {loading ? 'Logging in...' : 'Login'}
        </button>
        
        <div className="login-options">
          <a href="/api/auth/discord" className="discord-login">
            Login with Discord
          </a>
          <a href="/register">Don't have an account? Register</a>
        </div>
      </form>
    </div>
  );
};

export default Login;
```

### 3. API Hook with Auto-Refresh

```jsx
// hooks/useAPI.js
import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';

export const useAPI = () => {
  const { accessToken, refreshAccessToken, logout } = useAuth();
  const baseURL = process.env.REACT_APP_API_URL || 'http://localhost:4000/api';

  const makeRequest = async (url, options = {}) => {
    const defaultOptions = {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    };

    if (accessToken) {
      defaultOptions.headers.Authorization = `Bearer ${accessToken}`;
    }

    try {
      let response = await fetch(`${baseURL}${url}`, {
        ...options,
        ...defaultOptions,
      });

      // Handle token expiration
      if (response.status === 401 && accessToken) {
        const newToken = await refreshAccessToken();
        
        if (newToken) {
          defaultOptions.headers.Authorization = `Bearer ${newToken}`;
          response = await fetch(`${baseURL}${url}`, {
            ...options,
            ...defaultOptions,
          });
        } else {
          logout();
          throw new Error('Session expired');
        }
      }

      return response;
    } catch (error) {
      throw error;
    }
  };

  return { makeRequest };
};
```

## Vue.js Implementation

### 1. Auth Store (Pinia)

```javascript
// stores/auth.js
import { defineStore } from 'pinia';

export const useAuthStore = defineStore('auth', {
  state: () => ({
    user: JSON.parse(localStorage.getItem('user')) || null,
    accessToken: localStorage.getItem('accessToken') || null,
    refreshToken: localStorage.getItem('refreshToken') || null,
    loading: false,
  }),

  getters: {
    isAuthenticated: (state) => !!state.accessToken && !!state.user,
  },

  actions: {
    async login(email, password) {
      this.loading = true;
      
      try {
        const response = await fetch('http://localhost:4000/api/auth/login', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ email, password }),
        });

        const result = await response.json();

        if (result.status === 'success') {
          this.user = result.data.user;
          this.accessToken = result.data.accessToken;
          this.refreshToken = result.data.refreshToken;

          localStorage.setItem('user', JSON.stringify(this.user));
          localStorage.setItem('accessToken', this.accessToken);
          localStorage.setItem('refreshToken', this.refreshToken);

          return { success: true };
        } else {
          throw new Error(result.message);
        }
      } catch (error) {
        return { success: false, error: error.message };
      } finally {
        this.loading = false;
      }
    },

    async logout() {
      try {
        if (this.accessToken) {
          await fetch('http://localhost:4000/api/auth/logout', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${this.accessToken}`,
            },
          });
        }
      } catch (error) {
        console.error('Logout error:', error);
      } finally {
        this.user = null;
        this.accessToken = null;
        this.refreshToken = null;
        
        localStorage.removeItem('user');
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
      }
    },

    async refreshAccessToken() {
      try {
        const response = await fetch('http://localhost:4000/api/auth/refresh', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ refreshToken: this.refreshToken }),
        });

        const result = await response.json();

        if (result.status === 'success') {
          this.accessToken = result.data.accessToken;
          this.refreshToken = result.data.refreshToken;
          
          localStorage.setItem('accessToken', this.accessToken);
          localStorage.setItem('refreshToken', this.refreshToken);
          
          return this.accessToken;
        }
        return null;
      } catch (error) {
        console.error('Token refresh failed:', error);
        return null;
      }
    },
  },
});
```

### 2. Login Component

```vue
<!-- components/Login.vue -->
<template>
  <div class="login-container">
    <form @submit.prevent="handleLogin" class="login-form">
      <h2>Login to NeoMart</h2>
      
      <div v-if="error" class="error-message">
        {{ error }}
      </div>
      
      <div class="form-group">
        <input
          v-model="email"
          type="email"
          placeholder="Email"
          required
          :disabled="loading"
        />
      </div>
      
      <div class="form-group">
        <input
          v-model="password"
          type="password"
          placeholder="Password"
          required
          :disabled="loading"
        />
      </div>
      
      <button type="submit" :disabled="loading" class="login-button">
        {{ loading ? 'Logging in...' : 'Login' }}
      </button>
      
      <div class="login-options">
        <a href="/api/auth/discord" class="discord-login">
          Login with Discord
        </a>
        <router-link to="/register">Don't have an account? Register</router-link>
      </div>
    </form>
  </div>
</template>

<script>
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '../stores/auth';

export default {
  name: 'Login',
  setup() {
    const email = ref('');
    const password = ref('');
    const error = ref('');
    const loading = ref(false);
    
    const router = useRouter();
    const authStore = useAuthStore();

    const handleLogin = async () => {
      if (!email.value || !password.value) {
        error.value = 'Please fill in all fields';
        return;
      }

      loading.value = true;
      error.value = '';

      const result = await authStore.login(email.value, password.value);

      if (result.success) {
        router.push('/dashboard');
      } else {
        error.value = result.error;
      }
      
      loading.value = false;
    };

    return {
      email,
      password,
      error,
      loading: authStore.loading,
      handleLogin,
    };
  },
};
</script>
```

## React Native Implementation

```javascript
// services/AuthService.js
import AsyncStorage from '@react-native-async-storage/async-storage';

class AuthService {
  constructor() {
    this.baseURL = 'http://localhost:4000/api';
  }

  async login(email, password) {
    try {
      const response = await fetch(`${this.baseURL}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      const result = await response.json();

      if (result.status === 'success') {
        await AsyncStorage.multiSet([
          ['accessToken', result.data.accessToken],
          ['refreshToken', result.data.refreshToken],
          ['user', JSON.stringify(result.data.user)],
        ]);

        return { success: true, user: result.data.user };
      } else {
        throw new Error(result.message);
      }
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async logout() {
    try {
      const accessToken = await AsyncStorage.getItem('accessToken');
      
      if (accessToken) {
        await fetch(`${this.baseURL}/auth/logout`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
          },
        });
      }
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      await AsyncStorage.multiRemove(['accessToken', 'refreshToken', 'user']);
    }
  }

  async isAuthenticated() {
    try {
      const token = await AsyncStorage.getItem('accessToken');
      return !!token;
    } catch (error) {
      return false;
    }
  }
}

export default new AuthService();
```

## Error Handling

### Common Error Scenarios

```javascript
const handleAuthError = (error, errorCode) => {
  const errorMessages = {
    'VALIDATION_ERROR': 'Please check your input and try again',
    'AUTHENTICATION_ERROR': 'Invalid email or password',
    'EMAIL_NOT_VERIFIED': 'Please verify your email before logging in',
    'ACCOUNT_DEACTIVATED': 'Your account has been deactivated',
    'RATE_LIMIT_EXCEEDED': 'Too many login attempts. Please try again later',
    'TOKEN_EXPIRED': 'Your session has expired. Please log in again',
    'NETWORK_ERROR': 'Network connection failed. Please check your internet connection'
  };

  return errorMessages[errorCode] || error.message || 'An unexpected error occurred';
};

// Usage in login function
try {
  const result = await login(email, password);
} catch (error) {
  const friendlyMessage = handleAuthError(error, error.code);
  setError(friendlyMessage);
}
```

### Retry Logic

```javascript
const loginWithRetry = async (email, password, maxRetries = 3) => {
  let lastError;
  
  for (let i = 0; i < maxRetries; i++) {
    try {
      const result = await login(email, password);
      return result;
    } catch (error) {
      lastError = error;
      
      // Don't retry for authentication errors
      if (error.code === 'AUTHENTICATION_ERROR') {
        throw error;
      }
      
      // Wait before retrying (exponential backoff)
      if (i < maxRetries - 1) {
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, i) * 1000));
      }
    }
  }
  
  throw lastError;
};
```

## Security Best Practices

### 1. Secure Token Storage

```javascript
// React Native - Use Keychain/Keystore
import * as Keychain from 'react-native-keychain';

const storeTokens = async (accessToken, refreshToken) => {
  await Keychain.setInternetCredentials(
    'NeoMart',
    'tokens',
    JSON.stringify({ accessToken, refreshToken })
  );
};

// Web - Use httpOnly cookies for refresh tokens (server-side implementation needed)
const login = async (email, password) => {
  const response = await fetch('/api/auth/login', {
    method: 'POST',
    credentials: 'include', // Include cookies
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  
  // Only store access token in memory/sessionStorage
  const result = await response.json();
  sessionStorage.setItem('accessToken', result.data.accessToken);
};
```

### 2. CSRF Protection

```javascript
// Add CSRF token to requests
const makeSecureRequest = async (url, options = {}) => {
  const csrfToken = document.querySelector('meta[name="csrf-token"]')?.content;
  
  const headers = {
    'Content-Type': 'application/json',
    'X-CSRF-Token': csrfToken,
    ...options.headers,
  };

  return fetch(url, { ...options, headers });
};
```

### 3. Input Validation

```javascript
const validateLoginInput = (email, password) => {
  const errors = [];

  // Email validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    errors.push('Please enter a valid email address');
  }

  // Password validation
  if (password.length < 8) {
    errors.push('Password must be at least 8 characters long');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
};
```

### 4. Rate Limiting Client-Side

```javascript
class RateLimiter {
  constructor(maxAttempts = 5, windowMs = 15 * 60 * 1000) {
    this.maxAttempts = maxAttempts;
    this.windowMs = windowMs;
    this.attempts = [];
  }

  canMakeRequest() {
    const now = Date.now();
    this.attempts = this.attempts.filter(time => now - time < this.windowMs);
    
    if (this.attempts.length >= this.maxAttempts) {
      return false;
    }
    
    this.attempts.push(now);
    return true;
  }

  getRetryAfter() {
    if (this.attempts.length === 0) return 0;
    
    const oldestAttempt = Math.min(...this.attempts);
    const retryAfter = this.windowMs - (Date.now() - oldestAttempt);
    
    return Math.max(0, Math.ceil(retryAfter / 1000));
  }
}

const loginRateLimiter = new RateLimiter();

const login = async (email, password) => {
  if (!loginRateLimiter.canMakeRequest()) {
    const retryAfter = loginRateLimiter.getRetryAfter();
    throw new Error(`Too many login attempts. Try again in ${retryAfter} seconds.`);
  }

  // Proceed with login...
};
```

## Testing Login Implementation

### Unit Tests (Jest)

```javascript
// __tests__/authService.test.js
import AuthService from '../services/AuthService';

// Mock fetch
global.fetch = jest.fn();

describe('AuthService', () => {
  beforeEach(() => {
    fetch.mockClear();
    localStorage.clear();
  });

  test('successful login stores tokens and user data', async () => {
    const mockResponse = {
      status: 'success',
      data: {
        accessToken: 'mock-access-token',
        refreshToken: 'mock-refresh-token',
        user: { id: '1', email: 'test@example.com' }
      }
    };

    fetch.mockResolvedValueOnce({
      json: async () => mockResponse,
    });

    const authService = new AuthService();
    const result = await authService.login('test@example.com', 'password');

    expect(result.success).toBe(true);
    expect(localStorage.getItem('accessToken')).toBe('mock-access-token');
    expect(localStorage.getItem('refreshToken')).toBe('mock-refresh-token');
  });

  test('failed login returns error', async () => {
    const mockResponse = {
      status: 'error',
      message: 'Invalid credentials'
    };

    fetch.mockResolvedValueOnce({
      json: async () => mockResponse,
    });

    const authService = new AuthService();
    const result = await authService.login('wrong@example.com', 'wrongpassword');

    expect(result.success).toBe(false);
    expect(result.error).toBe('Invalid credentials');
  });
});
```

Dokumentasi ini memberikan panduan lengkap untuk mengimplementasikan sistem login yang aman dan robust dengan NeoMart Backend API.
