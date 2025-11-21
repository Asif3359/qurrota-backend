# API Documentation - Anonymous User Support

## Overview

The API now supports both **authenticated** and **anonymous** users for cart and order operations. Anonymous users can add items to cart, create orders, and track orders using a `sessionId` instead of authentication tokens.

---

## Table of Contents

1. [Session Management](#session-management)
2. [Cart API Endpoints](#cart-api-endpoints)
3. [Order API Endpoints](#order-api-endpoints)
4. [Frontend Implementation Guide](#frontend-implementation-guide)
5. [Migration Guide](#migration-guide)

---

## Session Management

### Session ID Generation

Anonymous users need a unique `sessionId` (UUID) to maintain their cart and orders across sessions.

**Client-side generation:**
```javascript
// Using crypto.randomUUID() (built-in browser API)
const sessionId = crypto.randomUUID();

// Or using a UUID library (uuid package)
import { v4 as uuidv4 } from 'uuid';
const sessionId = uuidv4();
```

### Session ID Storage

Store the `sessionId` in browser storage:
```javascript
// Store sessionId
localStorage.setItem('sessionId', sessionId);

// Retrieve sessionId
const sessionId = localStorage.getItem('sessionId');
```

### Session ID Transmission

Send `sessionId` in one of these ways:

1. **HTTP Header (Recommended):**
   ```javascript
   headers: {
     'X-Session-Id': sessionId
   }
   ```

2. **Request Body:**
   ```javascript
   body: {
     sessionId: sessionId,
     // ... other data
   }
   ```

---

## Cart API Endpoints

All cart endpoints support both authenticated and anonymous users.

### Base URL
```
/api/cart
```

### Authentication
- **Authenticated:** Include `Authorization: Bearer <token>` header
- **Anonymous:** Include `X-Session-Id: <sessionId>` header

---

### 1. Get Cart

**Endpoint:** `GET /api/cart`

**Headers:**
- Authenticated: `Authorization: Bearer <token>`
- Anonymous: `X-Session-Id: <sessionId>` (optional - will generate if not provided)

**Response:**
```json
{
  "success": true,
  "data": {
    "_id": "cart_id",
    "user": "user_id_or_null",
    "sessionId": "session_id_or_null",
    "items": [
      {
        "_id": "item_id",
        "product": {
          "_id": "product_id",
          "name": "Product Name",
          "price": 99.99,
          "images": ["url1", "url2"],
          "brand": "Brand Name",
          "stock": 100
        },
        "variant": "variant_id_or_null",
        "quantity": 2,
        "price": 99.99,
        "addedAt": "2024-01-01T00:00:00.000Z",
        "notes": "Optional notes"
      }
    ],
    "isActive": true,
    "couponCode": "DISCOUNT10",
    "discountAmount": 10,
    "shippingAddress": { ... },
    "billingAddress": { ... },
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  },
  "message": "Cart retrieved successfully",
  "sessionId": "uuid-for-anonymous-users" // Only present for anonymous users
}
```

**Frontend Example:**
```typescript
async function getCart() {
  const sessionId = localStorage.getItem('sessionId');
  const token = localStorage.getItem('token'); // For authenticated users
  
  const headers: HeadersInit = {};
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  } else if (sessionId) {
    headers['X-Session-Id'] = sessionId;
  }
  
  const response = await fetch('/api/cart', { headers });
  const data = await response.json();
  
  // Store sessionId if returned (for anonymous users)
  if (data.sessionId) {
    localStorage.setItem('sessionId', data.sessionId);
  }
  
  return data;
}
```

---

### 2. Add Item to Cart

**Endpoint:** `POST /api/cart/add`

**Headers:**
- Authenticated: `Authorization: Bearer <token>`
- Anonymous: `X-Session-Id: <sessionId>` (optional - will generate if not provided)

**Body:**
```json
{
  "productId": "product_id",
  "quantity": 1,
  "variantId": "variant_id", // Optional
  "notes": "Special instructions", // Optional
  "sessionId": "uuid" // Optional - alternative to header
}
```

**Response:**
```json
{
  "success": true,
  "data": { /* cart object */ },
  "message": "Item added to cart",
  "sessionId": "uuid-for-anonymous-users" // Only present for anonymous users
}
```

**Frontend Example:**
```typescript
async function addToCart(productId: string, quantity: number = 1, variantId?: string) {
  const sessionId = localStorage.getItem('sessionId');
  const token = localStorage.getItem('token');
  
  const headers: HeadersInit = {
    'Content-Type': 'application/json'
  };
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  } else if (sessionId) {
    headers['X-Session-Id'] = sessionId;
  }
  
  const body: any = {
    productId,
    quantity,
    variantId
  };
  
  // Include sessionId in body if not using header
  if (!token && sessionId) {
    body.sessionId = sessionId;
  }
  
  const response = await fetch('/api/cart/add', {
    method: 'POST',
    headers,
    body: JSON.stringify(body)
  });
  
  const data = await response.json();
  
  // Store sessionId if returned
  if (data.sessionId) {
    localStorage.setItem('sessionId', data.sessionId);
  }
  
  return data;
}
```

---

### 3. Update Cart Item Quantity

**Endpoint:** `PUT /api/cart/items/:itemId`

**Headers:**
- Authenticated: `Authorization: Bearer <token>`
- Anonymous: `X-Session-Id: <sessionId>`

**Body:**
```json
{
  "quantity": 3
}
```

**Response:**
```json
{
  "success": true,
  "data": { /* updated cart object */ },
  "message": "Item quantity updated",
  "sessionId": "uuid-for-anonymous-users" // Only present for anonymous users
}
```

---

### 4. Remove Item from Cart

**Endpoint:** `DELETE /api/cart/items/:itemId`

**Headers:**
- Authenticated: `Authorization: Bearer <token>`
- Anonymous: `X-Session-Id: <sessionId>`

**Response:**
```json
{
  "success": true,
  "message": "Item removed from cart successfully",
  "sessionId": "uuid-for-anonymous-users" // Only present for anonymous users
}
```

---

### 5. Clear Cart

**Endpoint:** `DELETE /api/cart/clear`

**Headers:**
- Authenticated: `Authorization: Bearer <token>`
- Anonymous: `X-Session-Id: <sessionId>`

**Response:**
```json
{
  "success": true,
  "data": { /* empty cart object */ },
  "message": "Cart cleared",
  "sessionId": "uuid-for-anonymous-users" // Only present for anonymous users
}
```

---

### 6. Check Cart Status

**Endpoint:** `GET /api/cart/check?productId=<id>&variantId=<id>`

**Headers:**
- Authenticated: `Authorization: Bearer <token>`
- Anonymous: `X-Session-Id: <sessionId>`

**Query Parameters:**
- `productId` (required)
- `variantId` (optional)

**Response:**
```json
{
  "success": true,
  "data": {
    "isInCart": true,
    "quantity": 2
  },
  "message": "Product is in cart",
  "sessionId": "uuid-for-anonymous-users" // Only present for anonymous users
}
```

---

### 7. Apply Coupon

**Endpoint:** `POST /api/cart/coupon/apply`

**Headers:**
- Authenticated: `Authorization: Bearer <token>`
- Anonymous: `X-Session-Id: <sessionId>`

**Body:**
```json
{
  "couponCode": "DISCOUNT10"
}
```

**Response:**
```json
{
  "success": true,
  "data": { /* cart object with coupon applied */ },
  "message": "Coupon applied successfully",
  "sessionId": "uuid-for-anonymous-users" // Only present for anonymous users
}
```

---

### 8. Remove Coupon

**Endpoint:** `DELETE /api/cart/coupon`

**Headers:**
- Authenticated: `Authorization: Bearer <token>`
- Anonymous: `X-Session-Id: <sessionId>`

**Response:**
```json
{
  "success": true,
  "data": { /* cart object without coupon */ },
  "message": "Coupon removed successfully",
  "sessionId": "uuid-for-anonymous-users" // Only present for anonymous users
}
```

---

### 9. Update Shipping Address

**Endpoint:** `PUT /api/cart/shipping-address`

**Headers:**
- Authenticated: `Authorization: Bearer <token>`
- Anonymous: `X-Session-Id: <sessionId>`

**Body:**
```json
{
  "name": "John Doe",
  "street": "123 Main St",
  "city": "New York",
  "state": "NY",
  "zipCode": "10001",
  "country": "USA",
  "phone": "+1234567890"
}
```

**Response:**
```json
{
  "success": true,
  "data": { /* cart object with shipping address */ },
  "message": "Shipping address updated successfully",
  "sessionId": "uuid-for-anonymous-users" // Only present for anonymous users
}
```

---

### 10. Update Billing Address

**Endpoint:** `PUT /api/cart/billing-address`

**Headers:**
- Authenticated: `Authorization: Bearer <token>`
- Anonymous: `X-Session-Id: <sessionId>`

**Body:** Same as shipping address

**Response:**
```json
{
  "success": true,
  "data": { /* cart object with billing address */ },
  "message": "Billing address updated successfully",
  "sessionId": "uuid-for-anonymous-users" // Only present for anonymous users
}
```

---

### 11. Get Cart Summary

**Endpoint:** `GET /api/cart/summary`

**Headers:**
- Authenticated: `Authorization: Bearer <token>`
- Anonymous: `X-Session-Id: <sessionId>`

**Response:**
```json
{
  "success": true,
  "data": {
    "totalItems": 5,
    "subtotal": 499.95,
    "discountAmount": 10,
    "total": 489.95,
    "items": [ /* cart items */ ],
    "hasShippingAddress": true,
    "hasBillingAddress": true,
    "couponCode": "DISCOUNT10"
  },
  "message": "Cart summary retrieved successfully",
  "sessionId": "uuid-for-anonymous-users" // Only present for anonymous users
}
```

---

## Order API Endpoints

All order endpoints support both authenticated and anonymous users (except admin routes).

### Base URL
```
/api/orders
```

### Authentication
- **Authenticated:** Include `Authorization: Bearer <token>` header
- **Anonymous:** Include `X-Session-Id: <sessionId>` header

---

### 1. Create Order

**Endpoint:** `POST /api/orders`

**Headers:**
- Authenticated: `Authorization: Bearer <token>`
- Anonymous: `X-Session-Id: <sessionId>` (required for anonymous users)

**Body:**
```json
{
  "paymentMethod": "cash_on_delivery",
  "shippingAddress": {
    "name": "John Doe",
    "street": "123 Main St",
    "city": "New York",
    "state": "NY",
    "zipCode": "10001",
    "country": "USA",
    "phone": "+1234567890",
    "email": "john@example.com"
  },
  "billingAddress": { /* optional, defaults to shippingAddress */ },
  "notes": "Please leave at door",
  "couponCode": "DISCOUNT10",
  "discountAmount": 10,
  "shippingCost": 5.99,
  "taxAmount": 40.00,
  "sessionId": "uuid" // Required for anonymous users
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "_id": "order_id",
    "orderNumber": "ORD-1234567890-123",
    "user": "user_id_or_null",
    "sessionId": "session_id_or_null",
    "items": [ /* order items */ ],
    "status": "pending",
    "paymentStatus": "pending",
    "paymentMethod": "cash_on_delivery",
    "shippingAddress": { /* address object */ },
    "billingAddress": { /* address object */ },
    "subtotal": 499.95,
    "discountAmount": 10,
    "shippingCost": 5.99,
    "taxAmount": 40.00,
    "total": 535.94,
    "createdAt": "2024-01-01T00:00:00.000Z"
  },
  "message": "Order created successfully",
  "sessionId": "uuid-for-anonymous-users" // Only present for anonymous users
}
```

**Frontend Example:**
```typescript
async function createOrder(orderData: OrderData) {
  const sessionId = localStorage.getItem('sessionId');
  const token = localStorage.getItem('token');
  
  const headers: HeadersInit = {
    'Content-Type': 'application/json'
  };
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  } else if (sessionId) {
    headers['X-Session-Id'] = sessionId;
    // Include sessionId in body for anonymous users
    orderData.sessionId = sessionId;
  } else {
    throw new Error('Authentication or sessionId required');
  }
  
  // Validate shipping address for anonymous users
  if (!token && (!orderData.shippingAddress?.name || !orderData.shippingAddress?.email)) {
    throw new Error('Shipping address with name and email is required');
  }
  
  const response = await fetch('/api/orders', {
    method: 'POST',
    headers,
    body: JSON.stringify(orderData)
  });
  
  const data = await response.json();
  
  // Store sessionId if returned
  if (data.sessionId) {
    localStorage.setItem('sessionId', data.sessionId);
  }
  
  return data;
}
```

---

### 2. Get User Orders

**Endpoint:** `GET /api/orders`

**Headers:**
- Authenticated: `Authorization: Bearer <token>`
- Anonymous: `X-Session-Id: <sessionId>` (required)

**Query Parameters:**
- `status` (optional): Filter by order status
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 10)

**Response:**
```json
{
  "success": true,
  "data": {
    "orders": [ /* array of order objects */ ],
    "pagination": {
      "current": 1,
      "pages": 5,
      "total": 50
    }
  },
  "message": "Orders retrieved successfully",
  "sessionId": "uuid-for-anonymous-users" // Only present for anonymous users
}
```

---

### 3. Get Order by ID

**Endpoint:** `GET /api/orders/:orderId`

**Headers:**
- Authenticated: `Authorization: Bearer <token>`
- Anonymous: `X-Session-Id: <sessionId>` (required)

**Response:**
```json
{
  "success": true,
  "data": { /* order object */ },
  "message": "Order retrieved successfully",
  "sessionId": "uuid-for-anonymous-users" // Only present for anonymous users
}
```

---

### 4. Get Order by Order Number

**Endpoint:** `GET /api/orders/number/:orderNumber`

**Headers:**
- Authenticated: `Authorization: Bearer <token>` (optional)
- Anonymous: `X-Session-Id: <sessionId>` (optional)

**Note:** This endpoint allows public lookup by order number. Authentication is optional.

**Response:**
```json
{
  "success": true,
  "data": { /* order object */ },
  "message": "Order retrieved successfully",
  "sessionId": "uuid-for-anonymous-users" // Only present for anonymous users
}
```

**Frontend Example (Order Tracking):**
```typescript
async function trackOrder(orderNumber: string) {
  // No authentication required for order tracking
  const response = await fetch(`/api/orders/number/${orderNumber}`);
  const data = await response.json();
  return data;
}
```

---

### 5. Cancel Order

**Endpoint:** `PUT /api/orders/:orderId/cancel`

**Headers:**
- Authenticated: `Authorization: Bearer <token>`
- Anonymous: `X-Session-Id: <sessionId>` (required)

**Body:**
```json
{
  "reason": "Changed my mind"
}
```

**Response:**
```json
{
  "success": true,
  "data": { /* updated order object */ },
  "message": "Order cancelled successfully",
  "sessionId": "uuid-for-anonymous-users" // Only present for anonymous users
}
```

---

### 6. Get Order Summary

**Endpoint:** `GET /api/orders/summary`

**Headers:**
- Authenticated: `Authorization: Bearer <token>`
- Anonymous: `X-Session-Id: <sessionId>` (required)

**Response:**
```json
{
  "success": true,
  "data": {
    "totalOrders": 10,
    "totalSpent": 4999.50,
    "pendingOrders": 2,
    "deliveredOrders": 7,
    "cancelledOrders": 1
  },
  "message": "Order summary retrieved successfully",
  "sessionId": "uuid-for-anonymous-users" // Only present for anonymous users
}
```

---

## Frontend Implementation Guide

### 1. Create Session Utility

Create a utility file for session management:

```typescript
// utils/session.ts
export function getSessionId(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('sessionId');
}

export function setSessionId(sessionId: string): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem('sessionId', sessionId);
}

export function generateSessionId(): string {
  if (typeof window === 'undefined') {
    // Server-side: use crypto from Node.js
    const crypto = require('crypto');
    return crypto.randomUUID();
  }
  // Client-side: use browser crypto API
  return crypto.randomUUID();
}

export function getOrCreateSessionId(): string {
  let sessionId = getSessionId();
  if (!sessionId) {
    sessionId = generateSessionId();
    setSessionId(sessionId);
  }
  return sessionId;
}
```

---

### 2. Create API Client with Session Support

```typescript
// lib/api.ts
import { getSessionId, setSessionId } from '@/utils/session';

interface ApiOptions extends RequestInit {
  requireAuth?: boolean;
}

export async function apiRequest<T>(
  endpoint: string,
  options: ApiOptions = {}
): Promise<T & { sessionId?: string }> {
  const { requireAuth = false, ...fetchOptions } = options;
  
  const token = localStorage.getItem('token');
  const sessionId = getSessionId();
  
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...fetchOptions.headers,
  };
  
  // Add authentication
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  } else if (sessionId && !requireAuth) {
    headers['X-Session-Id'] = sessionId;
  } else if (requireAuth && !token) {
    throw new Error('Authentication required');
  }
  
  // Include sessionId in body for POST/PUT requests
  if (fetchOptions.body && typeof fetchOptions.body === 'string') {
    try {
      const body = JSON.parse(fetchOptions.body);
      if (!token && sessionId) {
        body.sessionId = sessionId;
        fetchOptions.body = JSON.stringify(body);
      }
    } catch (e) {
      // Body is not JSON, skip
    }
  }
  
  const response = await fetch(`/api${endpoint}`, {
    ...fetchOptions,
    headers,
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'API request failed');
  }
  
  const data = await response.json();
  
  // Store sessionId if returned
  if (data.sessionId) {
    setSessionId(data.sessionId);
  }
  
  return data;
}
```

---

### 3. Update Cart Hook/Context

```typescript
// hooks/useCart.ts or context/CartContext.tsx
import { useState, useEffect } from 'react';
import { apiRequest } from '@/lib/api';
import { getOrCreateSessionId } from '@/utils/session';

export function useCart() {
  const [cart, setCart] = useState(null);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    // Ensure sessionId exists
    getOrCreateSessionId();
    loadCart();
  }, []);
  
  async function loadCart() {
    try {
      setLoading(true);
      const data = await apiRequest('/cart');
      setCart(data.data);
    } catch (error) {
      console.error('Failed to load cart:', error);
    } finally {
      setLoading(false);
    }
  }
  
  async function addToCart(productId: string, quantity: number = 1, variantId?: string) {
    try {
      const data = await apiRequest('/cart/add', {
        method: 'POST',
        body: JSON.stringify({ productId, quantity, variantId }),
      });
      setCart(data.data);
      return data;
    } catch (error) {
      console.error('Failed to add to cart:', error);
      throw error;
    }
  }
  
  async function updateItemQuantity(itemId: string, quantity: number) {
    try {
      const data = await apiRequest(`/cart/items/${itemId}`, {
        method: 'PUT',
        body: JSON.stringify({ quantity }),
      });
      setCart(data.data);
      return data;
    } catch (error) {
      console.error('Failed to update item:', error);
      throw error;
    }
  }
  
  async function removeFromCart(itemId: string) {
    try {
      await apiRequest(`/cart/items/${itemId}`, {
        method: 'DELETE',
      });
      await loadCart(); // Reload cart
    } catch (error) {
      console.error('Failed to remove item:', error);
      throw error;
    }
  }
  
  async function clearCart() {
    try {
      const data = await apiRequest('/cart/clear', {
        method: 'DELETE',
      });
      setCart(data.data);
      return data;
    } catch (error) {
      console.error('Failed to clear cart:', error);
      throw error;
    }
  }
  
  return {
    cart,
    loading,
    addToCart,
    updateItemQuantity,
    removeFromCart,
    clearCart,
    reloadCart: loadCart,
  };
}
```

---

### 4. Update Order Creation

```typescript
// hooks/useOrder.ts
import { apiRequest } from '@/lib/api';
import { getSessionId } from '@/utils/session';

export function useOrder() {
  async function createOrder(orderData: {
    paymentMethod: string;
    shippingAddress: {
      name: string;
      email: string;
      street: string;
      city: string;
      state: string;
      zipCode: string;
      country: string;
      phone: string;
    };
    billingAddress?: any;
    notes?: string;
    shippingCost?: number;
    taxAmount?: number;
  }) {
    const sessionId = getSessionId();
    const token = localStorage.getItem('token');
    
    // For anonymous users, ensure sessionId is included
    if (!token && sessionId) {
      orderData.sessionId = sessionId;
    }
    
    try {
      const data = await apiRequest('/orders', {
        method: 'POST',
        body: JSON.stringify(orderData),
      });
      return data;
    } catch (error) {
      console.error('Failed to create order:', error);
      throw error;
    }
  }
  
  async function getOrders(filters?: { status?: string; page?: number; limit?: number }) {
    try {
      const queryParams = new URLSearchParams();
      if (filters?.status) queryParams.append('status', filters.status);
      if (filters?.page) queryParams.append('page', filters.page.toString());
      if (filters?.limit) queryParams.append('limit', filters.limit.toString());
      
      const query = queryParams.toString();
      const endpoint = `/orders${query ? `?${query}` : ''}`;
      
      const data = await apiRequest(endpoint);
      return data;
    } catch (error) {
      console.error('Failed to get orders:', error);
      throw error;
    }
  }
  
  async function getOrderById(orderId: string) {
    try {
      const data = await apiRequest(`/orders/${orderId}`);
      return data;
    } catch (error) {
      console.error('Failed to get order:', error);
      throw error;
    }
  }
  
  async function trackOrder(orderNumber: string) {
    try {
      // No authentication required
      const data = await apiRequest(`/orders/number/${orderNumber}`);
      return data;
    } catch (error) {
      console.error('Failed to track order:', error);
      throw error;
    }
  }
  
  async function cancelOrder(orderId: string, reason?: string) {
    try {
      const data = await apiRequest(`/orders/${orderId}/cancel`, {
        method: 'PUT',
        body: JSON.stringify({ reason }),
      });
      return data;
    } catch (error) {
      console.error('Failed to cancel order:', error);
      throw error;
    }
  }
  
  return {
    createOrder,
    getOrders,
    getOrderById,
    trackOrder,
    cancelOrder,
  };
}
```

---

### 5. Initialize Session on App Load

```typescript
// app/layout.tsx or pages/_app.tsx
import { useEffect } from 'react';
import { getOrCreateSessionId } from '@/utils/session';

export default function App({ Component, pageProps }) {
  useEffect(() => {
    // Ensure sessionId exists when app loads
    getOrCreateSessionId();
  }, []);
  
  return <Component {...pageProps} />;
}
```

---

## Migration Guide

### For Existing Authenticated Users

No changes required! Existing authenticated users will continue to work as before. The API automatically detects authentication tokens and uses them instead of sessionId.

### For New Anonymous Users

1. **Generate sessionId** on first visit
2. **Store sessionId** in localStorage
3. **Include sessionId** in all cart/order API requests
4. **Update sessionId** from API responses if provided

### Checklist

- [ ] Create session utility functions
- [ ] Update API client to include sessionId in headers/body
- [ ] Update cart hooks/context to handle sessionId
- [ ] Update order creation to include sessionId for anonymous users
- [ ] Initialize sessionId on app load
- [ ] Test cart operations for anonymous users
- [ ] Test order creation for anonymous users
- [ ] Test order tracking by order number
- [ ] Update UI to handle both authenticated and anonymous states

---

## Error Handling

### Common Errors

1. **Missing SessionId (Anonymous Users)**
   ```json
   {
     "success": false,
     "message": "Session ID is required for anonymous users"
   }
   ```
   **Solution:** Generate and store sessionId before making requests

2. **Missing Shipping Address**
   ```json
   {
     "success": false,
     "message": "Shipping address with name and email is required"
   }
   ```
   **Solution:** Ensure shipping address includes name and email fields

3. **Cart Not Found**
   ```json
   {
     "success": false,
     "message": "Cart not found"
   }
   ```
   **Solution:** Cart will be auto-created on first add operation

---

## Best Practices

1. **Always check for sessionId in responses** and update localStorage
2. **Generate sessionId early** - on app initialization or first cart operation
3. **Use headers for sessionId** when possible (cleaner than body)
4. **Handle both authenticated and anonymous states** in UI
5. **Show appropriate UI** based on authentication status
6. **Consider session expiration** - carts expire after 30 days
7. **Allow users to convert** anonymous cart to authenticated cart on login

---

## Notes

- SessionId is a UUID string (e.g., `"550e8400-e29b-41d4-a716-446655440000"`)
- Carts expire after 30 days of inactivity
- Anonymous orders require shipping address with email for communication
- Order tracking by order number is public (no auth required)
- Admin routes still require authentication and admin role

