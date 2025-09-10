import { Request } from 'express';
import { User, Role, StoreStatus, OrderStatus, PaymentMethod, OtpType } from '@prisma/client';

// Extend Express Request type
export interface AuthenticatedRequest extends Request {
  user?: User;
}

// API Response types
export interface SuccessResponse<T = any> {
  status: 'success';
  message: string;
  data?: T;
}

export interface ErrorResponse {
  status: 'error';
  message: string;
  errors?: ValidationError[];
}

export interface ValidationError {
  field: string;
  message: string;
}

// Auth types
export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  name: string;
  email: string;
  password: string;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  user: {
    id: string;
    email: string;
    name: string;
    role: Role;
    discordId?: string;
    discordUsername?: string;
    discordAvatar?: string;
  };
}

// OTP types
export interface OtpRequest {
  email: string;
  type: OtpType;
}

export interface OtpVerifyRequest {
  email: string;
  code: string;
  type: OtpType;
}

// Store types
export interface CreateStoreRequest {
  name: string;
  description: string;
  username: string;
  address: string;
  logo?: string;
  banner?: string;
  socialLinks?: Record<string, string>;
}

// Product types
export interface CreateProductRequest {
  name: string;
  description: string;
  mrp: number;
  price: number;
  images: string[];
  category: string;
  tags?: string[];
}

export interface ProductFilters {
  category?: string;
  minPrice?: number;
  maxPrice?: number;
  search?: string;
  page?: number;
  limit?: number;
}

// Order types
export interface CreateOrderRequest {
  paymentMethod: PaymentMethod;
  couponCode?: string;
  shippingAddress: {
    name: string;
    address: string;
    phone: string;
  };
}

// Upload types
export interface UploadResponse {
  fileId: string;
  url: string;
  thumbnailUrl: string;
  name: string;
  size: number;
  filePath: string;
}

// Coupon types
export interface CreateCouponRequest {
  code: string;
  description: string;
  discount: number;
  discountType: 'PERCENTAGE' | 'FIXED';
  forNewUser?: boolean;
  forMember?: boolean;
  isPublic?: boolean;
  usageLimit?: number;
  expiresAt: Date;
}

// Rating types
export interface CreateRatingRequest {
  rating: number;
  review?: string;
  orderId: string;
}

// JWT Payload
export interface JwtPayload {
  userId: string;
  email: string;
  role: Role;
  sessionId: string;
}

// Discord OAuth types
export interface DiscordProfile {
  id: string;
  username: string;
  discriminator: string;
  avatar?: string;
  email?: string;
}

// Cart types
export interface CartItem {
  productId: string;
  quantity: number;
  price: number;
}

export interface Cart {
  items: CartItem[];
  total: number;
}

// Pagination types
export interface PaginationQuery {
  page?: number;
  limit?: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

// Export Prisma types
export {
  User,
  Role,
  StoreStatus,
  OrderStatus,
  PaymentMethod,
  OtpType
};