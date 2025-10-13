var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
const bcrypt = require('bcryptjs');
const cors = require('cors');
require('dotenv').config();
var connectDB = require('./config/database')

connectDB();

var indexRouter = require('./routes/index');
var usersRouter = require('./routes/users');
var testRouter = require('./routes/testRoute');
var authRouter = require('./routes/authRoutes');
var profileRouter = require('./routes/profileRoutes');
var productRouter = require('./routes/productRoutes');
var wishlistRouter = require('./routes/wishlistRoutes');
var cartRouter = require('./routes/cartRoutes');
var orderRouter = require('./routes/orderRoutes');

var app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

// CORS for multiple frontends
const allowedOrigins = [
  'http://localhost:3001',
  'https://qurrota.vercel.app', // Add your Vercel frontend
  process.env.FRONTEND_URL,
].filter(Boolean);

app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps, Postman)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    
    // Optional: Allow subdomains of vercel.app
    if (origin.endsWith('.vercel.app')) {
      return callback(null, true);
    }
    
    return callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
}));

app.use('/', indexRouter);
app.use('/users', usersRouter);
app.use('/test',testRouter);
app.use('/api/auth',authRouter);
app.use('/api/profile',profileRouter);
app.use('/api/products', productRouter);
app.use('/api/wishlist', wishlistRouter);
app.use('/api/cart', cartRouter);
app.use('/api/orders', orderRouter);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  next(createError(404));
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

module.exports = app;
