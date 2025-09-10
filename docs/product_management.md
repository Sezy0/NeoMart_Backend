# Product Management API Documentation

## Overview

Dokumentasi lengkap untuk mengelola produk dalam sistem NeoMart. API ini mendukung operasi CRUD produk, sistem rating & review, pencarian advanced, dan kategorisasi produk.

## Endpoints

### Product Endpoints

| Method | Endpoint | Description | Auth | Role |
|--------|----------|-------------|------|------|
| GET | `/api/products` | Get all products with filters | Optional | Any |
| GET | `/api/products/:id` | Get product by ID | Optional | Any |
| POST | `/api/products` | Create new product | Required | SELLER+ |
| PUT | `/api/products/:id` | Update product | Required | Owner/Admin |
| DELETE | `/api/products/:id` | Delete product | Required | Owner/Admin |
| POST | `/api/products/:id/rating` | Add product rating | Required | USER (after purchase) |
| GET | `/api/products/:id/ratings` | Get product ratings | Optional | Any |

## Request Examples

### 1. Get All Products (With Filters)

```http
GET /api/products?category=electronics&minPrice=100&maxPrice=1000&page=1&limit=20&search=iphone
```

**Query Parameters:**
- `category` (string): Filter by category
- `minPrice` (number): Minimum price filter
- `maxPrice` (number): Maximum price filter
- `search` (string): Search in name/description
- `page` (number): Page number (default: 1)
- `limit` (number): Items per page (default: 20)
- `sortBy` (string): Sort field (price, createdAt, name)
- `sortOrder` (string): asc or desc

**Response:**
```json
{
  "status": "success",
  "message": "Products retrieved successfully",
  "data": [
    {
      "id": "clux1234567890",
      "name": "iPhone 15 Pro",
      "description": "Latest iPhone with Pro features",
      "mrp": 1299.99,
      "price": 1199.99,
      "images": [
        "https://cdn.neomart.com/products/iphone15-1.jpg",
        "https://cdn.neomart.com/products/iphone15-2.jpg"
      ],
      "category": "Electronics",
      "tags": ["smartphone", "apple", "premium"],
      "createdAt": "2024-01-15T10:30:00Z",
      "store": {
        "id": "clux0987654321",
        "name": "Tech Store",
        "username": "techstore",
        "logo": "https://cdn.neomart.com/stores/techstore-logo.jpg"
      },
      "averageRating": 4.5,
      "totalRatings": 128
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 150,
    "totalPages": 8,
    "hasNext": true,
    "hasPrev": false
  }
}
```

### 2. Get Product by ID

```http
GET /api/products/clux1234567890
```

**Response:**
```json
{
  "status": "success",
  "message": "Product retrieved successfully",
  "data": {
    "id": "clux1234567890",
    "name": "iPhone 15 Pro",
    "description": "Latest iPhone with Pro features and advanced camera system...",
    "mrp": 1299.99,
    "price": 1199.99,
    "images": [
      "https://cdn.neomart.com/products/iphone15-1.jpg",
      "https://cdn.neomart.com/products/iphone15-2.jpg"
    ],
    "category": "Electronics",
    "tags": ["smartphone", "apple", "premium"],
    "inStock": true,
    "createdAt": "2024-01-15T10:30:00Z",
    "updatedAt": "2024-01-16T14:20:00Z",
    "store": {
      "id": "clux0987654321",
      "name": "Tech Store",
      "username": "techstore",
      "logo": "https://cdn.neomart.com/stores/techstore-logo.jpg",
      "description": "Premium technology products",
      "user": {
        "name": "John Doe"
      }
    },
    "averageRating": 4.5,
    "totalRatings": 128,
    "ratings": [
      {
        "id": "clux1111111111",
        "rating": 5,
        "review": "Excellent phone with amazing camera!",
        "createdAt": "2024-01-20T09:15:00Z",
        "user": {
          "name": "Alice Smith",
          "image": "https://cdn.neomart.com/users/alice.jpg"
        }
      }
    ]
  }
}
```

### 3. Create Product

```http
POST /api/products
Authorization: Bearer YOUR_ACCESS_TOKEN
Content-Type: application/json

{
  "name": "Samsung Galaxy S24",
  "description": "Latest Samsung flagship smartphone with AI features",
  "mrp": 1099.99,
  "price": 999.99,
  "images": [
    "https://cdn.neomart.com/products/galaxy-s24-1.jpg",
    "https://cdn.neomart.com/products/galaxy-s24-2.jpg"
  ],
  "category": "Electronics",
  "tags": ["smartphone", "samsung", "android", "AI"]
}
```

**Response:**
```json
{
  "status": "success",
  "message": "Product created successfully",
  "data": {
    "id": "clux2222222222",
    "name": "Samsung Galaxy S24",
    "description": "Latest Samsung flagship smartphone with AI features",
    "mrp": 1099.99,
    "price": 999.99,
    "images": [
      "https://cdn.neomart.com/products/galaxy-s24-1.jpg",
      "https://cdn.neomart.com/products/galaxy-s24-2.jpg"
    ],
    "category": "Electronics",
    "tags": ["smartphone", "samsung", "android", "AI"],
    "inStock": true,
    "storeId": "clux0987654321",
    "createdAt": "2024-01-22T11:45:00Z",
    "updatedAt": "2024-01-22T11:45:00Z"
  }
}
```

### 4. Update Product

```http
PUT /api/products/clux2222222222
Authorization: Bearer YOUR_ACCESS_TOKEN
Content-Type: application/json

{
  "name": "Samsung Galaxy S24 Ultra",
  "price": 1199.99,
  "description": "Updated description with Ultra features",
  "inStock": true
}
```

### 5. Delete Product

```http
DELETE /api/products/clux2222222222
Authorization: Bearer YOUR_ACCESS_TOKEN
```

**Response:**
```json
{
  "status": "success",
  "message": "Product deleted successfully",
  "data": {
    "message": "Product deleted successfully"
  }
}
```

### 6. Add Product Rating

```http
POST /api/products/clux1234567890/rating
Authorization: Bearer YOUR_ACCESS_TOKEN
Content-Type: application/json

{
  "rating": 5,
  "review": "Amazing product! Highly recommended.",
  "orderId": "clux3333333333"
}
```

**Response:**
```json
{
  "status": "success",
  "message": "Rating added successfully",
  "data": {
    "id": "clux4444444444",
    "rating": 5,
    "review": "Amazing product! Highly recommended.",
    "userId": "clux5555555555",
    "productId": "clux1234567890",
    "orderId": "clux3333333333",
    "createdAt": "2024-01-23T16:30:00Z"
  }
}
```

### 7. Get Product Ratings

```http
GET /api/products/clux1234567890/ratings?page=1&limit=10
```

**Response:**
```json
{
  "status": "success",
  "message": "Ratings retrieved successfully",
  "data": [
    {
      "id": "clux4444444444",
      "rating": 5,
      "review": "Amazing product! Highly recommended.",
      "createdAt": "2024-01-23T16:30:00Z",
      "user": {
        "name": "Bob Johnson",
        "image": "https://cdn.neomart.com/users/bob.jpg"
      }
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 128,
    "totalPages": 13,
    "hasNext": true,
    "hasPrev": false
  }
}
```

## Implementation Examples

### JavaScript/Frontend Implementation

```javascript
class ProductService {
  constructor(apiClient) {
    this.apiClient = apiClient;
  }

  // Get products with filters
  async getProducts(filters = {}) {
    const params = new URLSearchParams();
    
    Object.keys(filters).forEach(key => {
      if (filters[key] !== undefined && filters[key] !== '') {
        params.append(key, filters[key]);
      }
    });

    const response = await this.apiClient.get(`/products?${params}`);
    return response.data;
  }

  // Get single product
  async getProduct(productId) {
    const response = await this.apiClient.get(`/products/${productId}`);
    return response.data;
  }

  // Create new product
  async createProduct(productData) {
    const response = await this.apiClient.post('/products', productData);
    return response.data;
  }

  // Update product
  async updateProduct(productId, updateData) {
    const response = await this.apiClient.put(`/products/${productId}`, updateData);
    return response.data;
  }

  // Delete product
  async deleteProduct(productId) {
    const response = await this.apiClient.delete(`/products/${productId}`);
    return response.data;
  }

  // Add product rating
  async addRating(productId, ratingData) {
    const response = await this.apiClient.post(`/products/${productId}/rating`, ratingData);
    return response.data;
  }

  // Get product ratings
  async getRatings(productId, page = 1, limit = 10) {
    const response = await this.apiClient.get(`/products/${productId}/ratings?page=${page}&limit=${limit}`);
    return response.data;
  }
}

// Usage example
const productService = new ProductService(apiClient);

// Get electronics products under $500
const products = await productService.getProducts({
  category: 'Electronics',
  maxPrice: 500,
  page: 1,
  limit: 20
});

// Create new product
const newProduct = await productService.createProduct({
  name: 'Wireless Headphones',
  description: 'High-quality wireless headphones with noise cancellation',
  mrp: 199.99,
  price: 149.99,
  images: ['image1.jpg', 'image2.jpg'],
  category: 'Electronics',
  tags: ['audio', 'wireless', 'headphones']
});
```

### React Component Example

```jsx
import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';

const ProductDetail = () => {
  const { productId } = useParams();
  const [product, setProduct] = useState(null);
  const [ratings, setRatings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchProduct = async () => {
      try {
        const [productData, ratingsData] = await Promise.all([
          productService.getProduct(productId),
          productService.getRatings(productId, 1, 5)
        ]);
        
        setProduct(productData.data);
        setRatings(ratingsData.data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchProduct();
  }, [productId]);

  const handleAddRating = async (ratingData) => {
    try {
      const result = await productService.addRating(productId, ratingData);
      // Refresh ratings
      const updatedRatings = await productService.getRatings(productId, 1, 5);
      setRatings(updatedRatings.data);
    } catch (err) {
      alert('Failed to add rating: ' + err.message);
    }
  };

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;
  if (!product) return <div>Product not found</div>;

  return (
    <div className="product-detail">
      <div className="product-images">
        {product.images.map((image, index) => (
          <img key={index} src={image} alt={`${product.name} ${index + 1}`} />
        ))}
      </div>
      
      <div className="product-info">
        <h1>{product.name}</h1>
        <p>{product.description}</p>
        
        <div className="pricing">
          <span className="mrp">₹{product.mrp}</span>
          <span className="price">₹{product.price}</span>
          <span className="discount">
            {Math.round(((product.mrp - product.price) / product.mrp) * 100)}% OFF
          </span>
        </div>
        
        <div className="rating">
          <span>⭐ {product.averageRating}</span>
          <span>({product.totalRatings} reviews)</span>
        </div>
        
        <div className="store-info">
          <img src={product.store.logo} alt={product.store.name} />
          <span>{product.store.name}</span>
        </div>
        
        <button className="add-to-cart">Add to Cart</button>
      </div>
      
      <div className="reviews-section">
        <h3>Customer Reviews</h3>
        {ratings.map(rating => (
          <div key={rating.id} className="review">
            <div className="review-header">
              <img src={rating.user.image} alt={rating.user.name} />
              <span>{rating.user.name}</span>
              <span>⭐ {rating.rating}</span>
            </div>
            <p>{rating.review}</p>
          </div>
        ))}
      </div>
    </div>
  );
};
```

## Advanced Features

### 1. Product Search with Elasticsearch (Future Enhancement)

```javascript
// Advanced search with multiple filters
const searchProducts = async (searchParams) => {
  const query = {
    bool: {
      must: [],
      filter: []
    }
  };

  // Text search
  if (searchParams.search) {
    query.bool.must.push({
      multi_match: {
        query: searchParams.search,
        fields: ['name^2', 'description', 'category', 'tags']
      }
    });
  }

  // Price range filter
  if (searchParams.minPrice || searchParams.maxPrice) {
    query.bool.filter.push({
      range: {
        price: {
          gte: searchParams.minPrice || 0,
          lte: searchParams.maxPrice || 999999
        }
      }
    });
  }

  // Category filter
  if (searchParams.category) {
    query.bool.filter.push({
      term: { category: searchParams.category }
    });
  }

  return await elasticsearchClient.search({
    index: 'products',
    body: { query }
  });
};
```

### 2. Product Recommendations

```javascript
// Get recommended products based on user behavior
const getRecommendations = async (userId, productId = null) => {
  const recommendations = [];
  
  // Get user's purchase history
  const userOrders = await getUserOrders(userId);
  const purchasedCategories = userOrders.map(order => 
    order.items.map(item => item.product.category)
  ).flat();
  
  // Get products from frequently purchased categories
  const categoryRecommendations = await getProducts({
    category: { $in: [...new Set(purchasedCategories)] },
    limit: 10
  });
  
  recommendations.push(...categoryRecommendations);
  
  // If viewing a specific product, get similar products
  if (productId) {
    const currentProduct = await getProduct(productId);
    const similarProducts = await getProducts({
      category: currentProduct.category,
      tags: { $in: currentProduct.tags },
      _id: { $ne: productId },
      limit: 5
    });
    
    recommendations.push(...similarProducts);
  }
  
  return recommendations;
};
```

### 3. Inventory Management

```javascript
// Check and update product inventory
const updateInventory = async (productId, quantity, operation = 'decrease') => {
  const product = await Product.findById(productId);
  
  if (!product) {
    throw new Error('Product not found');
  }
  
  if (operation === 'decrease') {
    if (product.inventory < quantity) {
      throw new Error('Insufficient inventory');
    }
    product.inventory -= quantity;
    
    // Mark as out of stock if inventory is 0
    if (product.inventory === 0) {
      product.inStock = false;
    }
  } else if (operation === 'increase') {
    product.inventory += quantity;
    product.inStock = true;
  }
  
  await product.save();
  return product;
};
```

## Error Handling

### Common Error Responses

```json
// Product not found
{
  "status": "error",
  "message": "Product not found",
  "code": "PRODUCT_NOT_FOUND"
}

// Unauthorized to create/edit product
{
  "status": "error",
  "message": "Only sellers can create products",
  "code": "AUTHORIZATION_ERROR"
}

// Invalid product data
{
  "status": "error",
  "message": "Validation failed",
  "code": "VALIDATION_ERROR",
  "errors": [
    {
      "field": "price",
      "message": "Price must be a positive number"
    }
  ]
}

// Cannot rate product without purchase
{
  "status": "error",
  "message": "You can only rate products you have purchased",
  "code": "RATING_NOT_ALLOWED"
}
```

## Best Practices

### 1. Image Optimization

```javascript
// Optimize images before upload
const optimizeProductImages = async (images) => {
  const optimizedImages = [];
  
  for (const image of images) {
    // Resize to multiple sizes
    const sizes = [
      { width: 800, height: 600, suffix: '_large' },
      { width: 400, height: 300, suffix: '_medium' },
      { width: 150, height: 150, suffix: '_thumb' }
    ];
    
    for (const size of sizes) {
      const optimized = await sharp(image)
        .resize(size.width, size.height)
        .jpeg({ quality: 80 })
        .toBuffer();
        
      const uploadedImage = await uploadToImageKit(optimized, `${image.name}${size.suffix}`);
      optimizedImages.push(uploadedImage.url);
    }
  }
  
  return optimizedImages;
};
```

### 2. Caching Strategy

```javascript
// Cache frequently accessed products
const getCachedProduct = async (productId) => {
  const cacheKey = `product:${productId}`;
  
  // Try cache first
  let product = await cache.get(cacheKey);
  
  if (!product) {
    // Fetch from database
    product = await Product.findById(productId).populate('store');
    
    // Cache for 1 hour
    await cache.set(cacheKey, JSON.stringify(product), 3600);
  } else {
    product = JSON.parse(product);
  }
  
  return product;
};
```

### 3. SEO Optimization

```javascript
// Generate SEO-friendly URLs and meta data
const generateSEOData = (product) => {
  return {
    slug: product.name.toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, ''),
    title: `${product.name} - Buy Online at NeoMart`,
    description: product.description.substring(0, 160) + '...',
    keywords: product.tags.join(', '),
    canonicalUrl: `https://neomart.com/products/${product.id}`,
    structuredData: {
      '@context': 'https://schema.org',
      '@type': 'Product',
      'name': product.name,
      'description': product.description,
      'image': product.images,
      'offers': {
        '@type': 'Offer',
        'price': product.price,
        'priceCurrency': 'INR',
        'availability': product.inStock ? 'InStock' : 'OutOfStock'
      }
    }
  };
};
```
