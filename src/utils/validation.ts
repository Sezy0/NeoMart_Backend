import { z } from 'zod';
import { Role, StoreStatus, OrderStatus, PaymentMethod, OtpType } from '@prisma/client';

// Auth validation schemas
export const registerSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(100, 'Name must be less than 100 characters'),
  email: z.string().email('Invalid email format').toLowerCase(),
  password: z.string().min(8, 'Password must be at least 8 characters').max(128, 'Password must be less than 128 characters'),
});

export const loginSchema = z.object({
  email: z.string().email('Invalid email format').toLowerCase(),
  password: z.string().min(1, 'Password is required'),
});

export const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token is required'),
});

// OTP validation schemas
export const otpSendSchema = z.object({
  email: z.string().email('Invalid email format').toLowerCase(),
  type: z.nativeEnum(OtpType),
});

export const otpVerifySchema = z.object({
  email: z.string().email('Invalid email format').toLowerCase(),
  code: z.string().regex(/^\d{6}$/, 'OTP must be exactly 6 digits'),
  type: z.nativeEnum(OtpType),
});

// User validation schemas
export const updateUserSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(100, 'Name must be less than 100 characters').optional(),
  image: z.string().url('Invalid image URL').optional(),
});

export const updateCartSchema = z.object({
  items: z.array(z.object({
    productId: z.string().cuid('Invalid product ID'),
    quantity: z.number().int().min(1, 'Quantity must be at least 1').max(100, 'Quantity cannot exceed 100'),
    price: z.number().positive('Price must be positive'),
  })),
});

// Store validation schemas
export const createStoreSchema = z.object({
  name: z.string().min(2, 'Store name must be at least 2 characters').max(100, 'Store name must be less than 100 characters'),
  description: z.string().min(10, 'Description must be at least 10 characters').max(1000, 'Description must be less than 1000 characters'),
  username: z.string().min(3, 'Username must be at least 3 characters').max(50, 'Username must be less than 50 characters').regex(/^[a-zA-Z0-9_-]+$/, 'Username can only contain letters, numbers, hyphens, and underscores'),
  address: z.string().min(10, 'Address must be at least 10 characters').max(500, 'Address must be less than 500 characters'),
  logo: z.string().url('Invalid logo URL').optional(),
  banner: z.string().url('Invalid banner URL').optional(),
  socialLinks: z.record(z.string().url('Invalid social link URL')).optional(),
});

export const updateStoreSchema = createStoreSchema.partial();

export const storeActionSchema = z.object({
  rejectionReason: z.string().min(10, 'Rejection reason must be at least 10 characters').max(500, 'Rejection reason must be less than 500 characters').optional(),
});

// Product validation schemas
export const createProductSchema = z.object({
  name: z.string().min(2, 'Product name must be at least 2 characters').max(200, 'Product name must be less than 200 characters'),
  description: z.string().min(10, 'Description must be at least 10 characters').max(2000, 'Description must be less than 2000 characters'),
  mrp: z.number().positive('MRP must be positive').max(10000000, 'MRP cannot exceed 10,000,000'),
  price: z.number().positive('Price must be positive').max(10000000, 'Price cannot exceed 10,000,000'),
  images: z.array(z.string().url('Invalid image URL')).min(1, 'At least one image is required').max(10, 'Maximum 10 images allowed'),
  category: z.string().min(2, 'Category must be at least 2 characters').max(100, 'Category must be less than 100 characters'),
  tags: z.array(z.string().min(1, 'Tag cannot be empty').max(50, 'Tag must be less than 50 characters')).max(20, 'Maximum 20 tags allowed').optional(),
});

export const updateProductSchema = createProductSchema.partial();

export const productFiltersSchema = z.object({
  category: z.string().optional(),
  minPrice: z.number().positive().optional(),
  maxPrice: z.number().positive().optional(),
  search: z.string().min(1).max(100).optional(),
  page: z.number().int().min(1).default(1),
  limit: z.number().int().min(1).max(100).default(20),
});

// Order validation schemas
export const createOrderSchema = z.object({
  paymentMethod: z.nativeEnum(PaymentMethod),
  couponCode: z.string().min(3, 'Coupon code must be at least 3 characters').max(50, 'Coupon code must be less than 50 characters').optional(),
  shippingAddress: z.object({
    name: z.string().min(2, 'Name must be at least 2 characters').max(100, 'Name must be less than 100 characters'),
    address: z.string().min(10, 'Address must be at least 10 characters').max(500, 'Address must be less than 500 characters'),
    phone: z.string().regex(/^(\+62|62|0)8[1-9][0-9]{6,9}$/, 'Invalid Indonesian phone number format'),
  }),
});

export const updateOrderStatusSchema = z.object({
  status: z.nativeEnum(OrderStatus),
});

// Coupon validation schemas
export const createCouponSchema = z.object({
  code: z.string().min(3, 'Coupon code must be at least 3 characters').max(50, 'Coupon code must be less than 50 characters').regex(/^[A-Z0-9_-]+$/, 'Coupon code can only contain uppercase letters, numbers, hyphens, and underscores'),
  description: z.string().min(10, 'Description must be at least 10 characters').max(500, 'Description must be less than 500 characters'),
  discount: z.number().positive('Discount must be positive').max(100, 'Percentage discount cannot exceed 100%'),
  discountType: z.enum(['PERCENTAGE', 'FIXED']),
  forNewUser: z.boolean().default(false),
  forMember: z.boolean().default(false),
  isPublic: z.boolean().default(true),
  usageLimit: z.number().int().min(0, 'Usage limit cannot be negative').default(0),
  expiresAt: z.string().datetime('Invalid expiration date'),
});

export const updateCouponSchema = createCouponSchema.partial();

export const applyCouponSchema = z.object({
  code: z.string().min(3, 'Coupon code must be at least 3 characters').max(50, 'Coupon code must be less than 50 characters'),
});

// Rating validation schemas
export const createRatingSchema = z.object({
  rating: z.number().int().min(1, 'Rating must be at least 1').max(5, 'Rating cannot exceed 5'),
  review: z.string().max(1000, 'Review must be less than 1000 characters').optional(),
  orderId: z.string().cuid('Invalid order ID'),
});

// Upload validation schemas
export const uploadImageSchema = z.object({
  folder: z.enum(['products', 'stores', 'users']).default('general'),
});

// Pagination validation schema
export const paginationSchema = z.object({
  page: z.number().int().min(1).default(1),
  limit: z.number().int().min(1).max(100).default(20),
});

// ID parameter validation
export const idParamSchema = z.object({
  id: z.string().cuid('Invalid ID format'),
});

// Email validation
export const emailSchema = z.object({
  email: z.string().email('Invalid email format').toLowerCase(),
});

// Custom validation functions
export const validateIndonesianPhoneNumber = (phone: string): boolean => {
  const phoneRegex = /^(\+62|62|0)8[1-9][0-9]{6,9}$/;
  return phoneRegex.test(phone);
};

export const validateImageFile = (file: Express.Multer.File): { isValid: boolean; errors: string[] } => {
  const errors: string[] = [];
  const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
  const maxSize = 10 * 1024 * 1024; // 10MB

  if (!allowedMimeTypes.includes(file.mimetype)) {
    errors.push('Invalid file type. Only JPEG, PNG, WebP, and GIF are allowed');
  }

  if (file.size > maxSize) {
    errors.push('File size too large. Maximum size is 10MB');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

export const validateMultipleImages = (files: Express.Multer.File[]): { isValid: boolean; errors: string[] } => {
  const errors: string[] = [];
  const maxFiles = 10;

  if (files.length > maxFiles) {
    errors.push(`Too many files. Maximum ${maxFiles} files allowed`);
  }

  for (const file of files) {
    const validation = validateImageFile(file);
    if (!validation.isValid) {
      errors.push(...validation.errors);
    }
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};