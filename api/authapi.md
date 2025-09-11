# Authentication API

## Endpoint: `/api/auth/signup`

### Description

This endpoint allows a new user to register by providing their name, email, and password.

### Command

```sh
curl -X POST \
  http://localhost:3000/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test User",
    "email": "testuser@example.com",
    "password": "Password123"
  }'
```

## Endpoint: `/api/auth/login`

### Description

This endpoint allows a  user to login by providing their email, and password.

### Command

```sh
curl -X POST \
  http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "testuser@example.com",
    "password": "Password123"
  }'


```
# signup
curl -X POST http://localhost:3000/api/auth/signup -H 'Content-Type: application/json' -d '{"name":"Test","email":"asifahammednishst@gmail.com","password":"123456"}'

# verify email (use code from email)
curl -X POST http://localhost:3000/api/auth/verify-email -H 'Content-Type: application/json' -d '{"email":"asifahammednishst@gmail.com","code":"514982"}'

# login
curl -X POST http://localhost:3000/api/auth/login -H 'Content-Type: application/json' -d '{"email":"asifahammednishst@gmail.com","password":"123456"}'

# forgot password
curl -X POST http://localhost:3000/api/auth/forgot-password -H 'Content-Type: application/json' -d '{"email":"asifahammednishst@gmail.com"}'

# reset password (use code from email)
curl -X POST http://localhost:3000/api/auth/reset-password -H 'Content-Type: application/json' -d '{"email":"asifahammednishst@gmail.com","code":"637688","newPassword":"12345678"}'