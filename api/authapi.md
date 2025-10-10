# Authentication API

# signup
curl -X POST http://localhost:3000/api/auth/signup -H 'Content-Type: application/json' -d '{"name":"Test","email":"asifahammednishst@gmail.com","password":"123456"}'



# login
curl -X POST http://localhost:3000/api/auth/login -H 'Content-Type: application/json' -d '{"email":"asifahammednishst@gmail.com","password":"123456"}'

# verify email (use code from email)
curl -X POST http://localhost:3000/api/auth/verify-email -H 'Content-Type: application/json' -d '{"email":"asifahammed359@gmail.com","code":"342999"}'

# forgot password
curl -X POST http://localhost:3000/api/auth/forgot-password -H 'Content-Type: application/json' -d '{"email":"asifahammednishst@gmail.com"}'

# reset password (use code from email)
curl -X POST http://localhost:3000/api/auth/reset-password -H 'Content-Type: application/json' -d '{"email":"asifahammednishst@gmail.com","code":"637688","newPassword":"12345678"}'

# Profile

# get profile
curl -X GET http://localhost:3000/api/profile \
  -H 'Authorization: Bearer YOUR_JWT_TOKEN'

# update profile (any fields optional)
curl -X PUT http://localhost:3000/api/profile \
  -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer YOUR_JWT_TOKEN' \
  -d '{
    "name": "Updated Name",
    "dateOfBirth": "1995-05-10",
    "phoneNumber": "+1234567890",
    "bio": "Short bio here",
    "preferences": { "theme": "dark" },
    "currentPassword": "123456",
    "newPassword": "12345678"
  }'

# update profile image (file upload; field name must be `image`)
curl -X PUT http://localhost:3000/api/profile/image \
  -H 'Authorization: Bearer YOUR_JWT_TOKEN' \
  -F 'image=@/absolute/path/to/your-image.jpg'

# update profile image via URL
curl -X PUT http://localhost:3000/api/profile/image-url \
  -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer YOUR_JWT_TOKEN' \
  -d '{"image": "https://example.com/path/to/image.jpg"}'

# delete account (requires current password)
curl -X DELETE http://localhost:3000/api/profile \
  -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer YOUR_JWT_TOKEN' \
  -d '{"password": "12345678"}'


# Products

# list products (public; supports q, brand, category, minPrice, maxPrice, page, limit)
curl -X GET 'http://localhost:3000/api/products?q=shirt&brand=Acme&page=1&limit=12'

# get product by id or slug (public)
curl -X GET http://localhost:3000/api/products/some-product-slug
curl -X GET http://localhost:3000/api/products/66f1c4c0d6b3a9b2f1a2c3d4

# create product (admin only)
curl -X POST http://localhost:3000/api/products \
  -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer YOUR_ADMIN_JWT_TOKEN' \
  -d '{
    "name": "Basic T-Shirt",
    "slug": "basic-t-shirt",            
    "description": "Soft cotton tee",
    "price": 19.99,
    "compareAtPrice": 24.99,
    "currency": "USD",
    "brand": "Acme",
    "categories": ["apparel", "tops"],
    "tags": ["tshirt", "cotton"],
    "isPublished": true,
    "images": [{ "url": "https://example.com/image.jpg", "alt": "Front view", "isPrimary": true }],
    "variants": [
      { 
        "name": "Red / M", 
        "sku": "TS-RED-M", 
        "price": 19.99, 
        "stock": 10, 
        "attributes": { "color": "Red", "size": "M" },
        "images": [
          { "url": "https://example.com/red-m-front.jpg", "alt": "Red M Front", "isPrimary": true },
          { "url": "https://example.com/red-m-back.jpg", "alt": "Red M Back" }
        ]
      },
      { 
        "name": "Red / L", 
        "sku": "TS-RED-L", 
        "price": 19.99, 
        "stock": 8,  
        "attributes": { "color": "Red", "size": "L" },
        "images": [
          { "url": "https://example.com/red-l-front.jpg", "alt": "Red L Front", "isPrimary": true }
        ]
      }
    ]
  }'

# update product (admin only)
curl -X PUT http://localhost:3000/api/products/66f1c4c0d6b3a9b2f1a2c3d4 \
  -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer YOUR_ADMIN_JWT_TOKEN' \
  -d '{
    "name": "Basic T-Shirt Updated",
    "price": 17.99,
    "isPublished": true
  }'

# delete product (admin only)
curl -X DELETE http://localhost:3000/api/products/66f1c4c0d6b3a9b2f1a2c3d4 \
  -H 'Authorization: Bearer YOUR_ADMIN_JWT_TOKEN'


# Wishlist API

# get wishlist
curl -X GET http://localhost:3000/api/wishlist \
  -H 'Authorization: Bearer YOUR_JWT_TOKEN'

# add product to wishlist
curl -X POST http://localhost:3000/api/wishlist/add \
  -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer YOUR_JWT_TOKEN' \
  -d '{
    "productId": "66f1c4c0d6b3a9b2f1a2c3d4",
    "notes": "Want this for birthday"
  }'

# remove product from wishlist
curl -X DELETE http://localhost:3000/api/wishlist/remove/66f1c4c0d6b3a9b2f1a2c3d4 \
  -H 'Authorization: Bearer YOUR_JWT_TOKEN'

# check if product is in wishlist
curl -X GET http://localhost:3000/api/wishlist/check/66f1c4c0d6b3a9b2f1a2c3d4 \
  -H 'Authorization: Bearer YOUR_JWT_TOKEN'

# update wishlist settings
curl -X PUT http://localhost:3000/api/wishlist/settings \
  -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer YOUR_JWT_TOKEN' \
  -d '{
    "name": "My Birthday Wishlist",
    "description": "Items I want for my birthday",
    "isPublic": false
  }'

# clear wishlist
curl -X DELETE http://localhost:3000/api/wishlist/clear \
  -H 'Authorization: Bearer YOUR_JWT_TOKEN'

# get wishlist statistics
curl -X GET http://localhost:3000/api/wishlist/stats \
  -H 'Authorization: Bearer YOUR_JWT_TOKEN'


# Cart API

# get cart
curl -X GET http://localhost:3000/api/cart \
  -H 'Authorization: Bearer YOUR_JWT_TOKEN'

# get cart summary
curl -X GET http://localhost:3000/api/cart/summary \
  -H 'Authorization: Bearer YOUR_JWT_TOKEN'

# add item to cart
curl -X POST http://localhost:3000/api/cart/add \
  -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer YOUR_JWT_TOKEN' \
  -d '{
    "productId": "66f1c4c0d6b3a9b2f1a2c3d4",
    "quantity": 2,
    "variantId": "66f1c4c0d6b3a9b2f1a2c3d5",
    "notes": "Gift for friend"
  }'

# update cart item quantity
curl -X PUT http://localhost:3000/api/cart/items/66f1c4c0d6b3a9b2f1a2c3d6 \
  -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer YOUR_JWT_TOKEN' \
  -d '{
    "quantity": 3
  }'

# remove item from cart
curl -X DELETE http://localhost:3000/api/cart/items/66f1c4c0d6b3a9b2f1a2c3d6 \
  -H 'Authorization: Bearer YOUR_JWT_TOKEN'

# check if product is in cart
curl -X GET 'http://localhost:3000/api/cart/check?productId=66f1c4c0d6b3a9b2f1a2c3d4&variantId=66f1c4c0d6b3a9b2f1a2c3d5' \
  -H 'Authorization: Bearer YOUR_JWT_TOKEN'

# apply coupon to cart
curl -X POST http://localhost:3000/api/cart/coupon/apply \
  -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer YOUR_JWT_TOKEN' \
  -d '{
    "couponCode": "SAVE10"
  }'

# remove coupon from cart
curl -X DELETE http://localhost:3000/api/cart/coupon \
  -H 'Authorization: Bearer YOUR_JWT_TOKEN'

# update shipping address
curl -X PUT http://localhost:3000/api/cart/shipping-address \
  -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer YOUR_JWT_TOKEN' \
  -d '{
    "name": "John Doe",
    "street": "123 Main St",
    "city": "New York",
    "state": "NY",
    "zipCode": "10001",
    "country": "USA",
    "phone": "+1234567890"
  }'

# update billing address
curl -X PUT http://localhost:3000/api/cart/billing-address \
  -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer YOUR_JWT_TOKEN' \
  -d '{
    "name": "John Doe",
    "street": "123 Main St",
    "city": "New York",
    "state": "NY",
    "zipCode": "10001",
    "country": "USA",
    "phone": "+1234567890"
  }'

# clear cart
curl -X DELETE http://localhost:3000/api/cart/clear \
  -H 'Authorization: Bearer YOUR_JWT_TOKEN'
