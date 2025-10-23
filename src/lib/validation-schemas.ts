/**
 * Input Validation Schemas
 * Comprehensive validation for all API endpoints
 */

import { z } from 'zod';

// Base validation schemas
export const idSchema = z.string().uuid('Invalid ID format');
export const slugSchema = z.string().min(1).max(100).regex(/^[a-z0-9-]+$/, 'Invalid slug format');
export const emailSchema = z.string().email('Invalid email format');
export const urlSchema = z.string().url('Invalid URL format');

// Product validation
export const productSchema = z.object({
  name: z.string().min(1, 'Name is required').max(200, 'Name too long'),
  description: z.string().max(2000, 'Description too long').optional(),
  price: z.number().positive('Price must be positive').max(999999, 'Price too high'),
  category_id: idSchema,
  available: z.boolean().optional(),
  sort_order: z.number().int().min(0).optional(),
  image_url: urlSchema.optional(),
  nutrition: z.record(z.string(), z.unknown()).optional(),
  recipe: z.array(z.object({
    ingredient: z.string().min(1).max(100),
    quantity: z.number().positive(),
    unit: z.string().min(1).max(20)
  })).optional()
});

export const productUpdateSchema = productSchema.partial();

// Category validation
export const categorySchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name too long'),
  description: z.string().max(500, 'Description too long').optional(),
  available: z.boolean().optional(),
  sort_order: z.number().int().min(0).optional(),
  image_url: urlSchema.optional()
});

export const categoryUpdateSchema = categorySchema.partial();

// Staff user validation
export const staffUserSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name too long'),
  email: emailSchema,
  role: z.enum(['admin', 'staff', 'manager']),
  pin: z.string().length(4, 'PIN must be 4 digits').regex(/^\d{4}$/, 'PIN must contain only digits'),
  restaurant_id: idSchema
});

export const staffUserUpdateSchema = staffUserSchema.partial();

// Recipe approval validation
export const recipeApprovalSchema = z.object({
  product_id: idSchema,
  proposed_recipe: z.array(z.object({
    ingredient: z.string().min(1).max(100),
    quantity: z.number().positive(),
    unit: z.string().min(1).max(20)
  })),
  notes: z.string().max(1000, 'Notes too long').optional()
});

// Product proposal validation
export const productProposalSchema = z.object({
  name: z.string().min(1, 'Name is required').max(200, 'Name too long'),
  description: z.string().max(2000, 'Description too long').optional(),
  price: z.number().positive('Price must be positive').max(999999, 'Price too high'),
  category_id: idSchema,
  has_recipe: z.boolean(),
  recipe: z.array(z.object({
    ingredient: z.string().min(1).max(100),
    quantity: z.number().positive(),
    unit: z.string().min(1).max(20)
  })).optional(),
  notes: z.string().max(1000, 'Notes too long').optional()
});

// Restaurant validation
export const restaurantSchema = z.object({
  name: z.string().min(1, 'Name is required').max(200, 'Name too long'),
  slug: slugSchema,
  description: z.string().max(1000, 'Description too long').optional(),
  address: z.string().max(500, 'Address too long').optional(),
  phone: z.string().max(20, 'Phone too long').optional(),
  email: emailSchema.optional(),
  website: urlSchema.optional(),
  logo_url: urlSchema.optional(),
  cover_url: urlSchema.optional()
});

export const restaurantUpdateSchema = restaurantSchema.partial();

// Popup validation
export const popupSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200, 'Title too long'),
  message: z.string().min(1, 'Message is required').max(1000, 'Message too long'),
  cta_text: z.string().max(50, 'CTA text too long').optional(),
  cta_url: urlSchema.optional(),
  image: urlSchema.optional(),
  frequency: z.enum(['once', 'every-visit', 'daily']).optional(),
  active: z.boolean().optional()
});

export const popupUpdateSchema = popupSchema.partial();

// Search and filter validation
export const searchSchema = z.object({
  query: z.string().max(100, 'Search query too long').optional(),
  category: idSchema.optional(),
  min_price: z.number().min(0).optional(),
  max_price: z.number().min(0).optional(),
  available: z.boolean().optional(),
  page: z.number().int().min(1).max(1000).optional(),
  limit: z.number().int().min(1).max(100).optional()
});

// File upload validation
export const fileUploadSchema = z.object({
  file: z.instanceof(File, { message: 'Invalid file' }),
  type: z.enum(['image', 'document']),
  max_size: z.number().int().positive().optional()
});

// Authentication validation
export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(8, 'Password too short').max(100, 'Password too long')
});

export const staffLoginSchema = z.object({
  pin: z.string().length(4, 'PIN must be 4 digits').regex(/^\d{4}$/, 'PIN must contain only digits')
});

// Common query parameters
export const paginationSchema = z.object({
  page: z.number().int().min(1).max(1000).optional(),
  limit: z.number().int().min(1).max(100).optional(),
  sort: z.string().max(50).optional(),
  order: z.enum(['asc', 'desc']).optional()
});

// Utility functions
export function validateInput<T>(schema: z.ZodSchema<T>, data: unknown): T {
  try {
    return schema.parse(data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errorMessages = error.issues.map(err => `${err.path.join('.')}: ${err.message}`);
      throw new Error(`Validation failed: ${errorMessages.join(', ')}`);
    }
    throw error;
  }
}

export function sanitizeString(input: string): string {
  return input
    .trim()
    .replace(/[<>]/g, '') // Remove potential HTML tags
    .replace(/['"]/g, '') // Remove quotes
    .replace(/[;]/g, '') // Remove semicolons
    .substring(0, 1000); // Limit length
}

export function validateFileUpload(file: File, allowedTypes: string[], maxSize: number): void {
  if (!allowedTypes.includes(file.type)) {
    throw new Error(`Invalid file type. Allowed: ${allowedTypes.join(', ')}`);
  }
  
  if (file.size > maxSize) {
    throw new Error(`File too large. Maximum size: ${maxSize} bytes`);
  }
}
