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