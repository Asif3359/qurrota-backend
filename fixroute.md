# Backend Route Fix: GET /api/cart

## Problem

The backend GET `/api/cart` endpoint is creating duplicate carts for anonymous users, causing MongoDB duplicate key errors:
```
E11000 duplicate key error collection: qurrota.carts index: user_1_isActive_1 dup key: { user: null, isActive: true }
```

## Root Cause

The backend is:
1. Not checking for existing carts by `sessionId` before creating new ones
2. Creating carts with `user: null` when `sessionId` header is missing
3. Not properly handling the case where multiple anonymous users exist

## Solution

Update your GET `/api/cart` route handler to:
1. **Always check for existing cart first** (by `sessionId` for anonymous, by `userId` for authenticated)
2. **Only create a new cart if none exists**
3. **Handle duplicate key errors gracefully**

---

## Backend Code Fix

### For Express.js/Node.js Backend

Replace your current GET `/api/cart` handler with this code:

```javascript
// GET /api/cart
exports.getCart = async (req, res) => {
  try {
    let cart;
    // Get sessionId from header (lowercase 'x-session-id' is standard)
    let sessionId = req.headers['x-session-id'] || req.headers['X-Session-Id'] || req.body?.sessionId;
    const userId = req.user?.id; // From auth middleware (if authenticated)

    console.log('GET /api/cart - Request details:', {
      userId: userId || 'null',
      sessionId: sessionId || 'missing',
      hasAuthHeader: !!req.headers['authorization']
    });

    if (userId) {
      // ============================================
      // AUTHENTICATED USER PATH
      // ============================================
      console.log('Finding cart for authenticated user:', userId);
      
      // First, try to find existing cart by userId
      cart = await Cart.findOne({ 
        user: userId, 
        isActive: true 
      }).populate('items.product');
      
      if (!cart) {
        console.log('No cart found for user, creating new cart');
        // Create new cart for authenticated user
        cart = await Cart.create({
          user: userId,
          sessionId: null,
          items: [],
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date()
        });
        console.log('Created new cart for authenticated user:', cart._id);
      } else {
        console.log('Found existing cart for authenticated user:', cart._id);
      }
      
    } else if (sessionId) {
      // ============================================
      // ANONYMOUS USER WITH SESSIONID PATH
      // ============================================
      console.log('Finding cart for anonymous user with sessionId:', sessionId);
      
      // CRITICAL: Find cart by sessionId, NOT by user: null
      cart = await Cart.findOne({ 
        sessionId: sessionId, 
        isActive: true 
      }).populate('items.product');
      
      if (!cart) {
        console.log('No cart found for sessionId, creating new cart');
        try {
          // Create new cart for anonymous user with sessionId
          cart = await Cart.create({
            user: null,
            sessionId: sessionId,
            items: [],
            isActive: true,
            createdAt: new Date(),
            updatedAt: new Date()
          });
          console.log('Created new cart for anonymous user:', cart._id);
        } catch (createError) {
          // Handle duplicate key error during creation
          if (createError.code === 11000) {
            console.log('Duplicate key error during creation, trying to find existing cart');
            // Try to find existing cart again (might have been created by concurrent request)
            cart = await Cart.findOne({ 
              sessionId: sessionId, 
              isActive: true 
            }).populate('items.product');
            
            if (!cart) {
              // If still not found, there might be a cart with user: null but different sessionId
              // Deactivate old carts and create new one
              await Cart.updateMany(
                { user: null, isActive: true, sessionId: { $ne: sessionId } },
                { $set: { isActive: false } }
              );
              
              // Try creating again
              cart = await Cart.create({
                user: null,
                sessionId: sessionId,
                items: [],
                isActive: true,
                createdAt: new Date(),
                updatedAt: new Date()
              });
            }
          } else {
            throw createError;
          }
        }
      } else {
        console.log('Found existing cart for anonymous user:', cart._id);
      }
      
    } else {
      // ============================================
      // NO SESSIONID AND NO USERID - GENERATE NEW
      // ============================================
      console.log('No sessionId or userId, generating new sessionId');
      
      // Generate new sessionId (use your UUID library)
      const { v4: uuidv4 } = require('uuid');
      sessionId = uuidv4();
      
      // Try to create cart, but handle potential duplicates
      try {
        cart = await Cart.create({
          user: null,
          sessionId: sessionId,
          items: [],
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date()
        });
        console.log('Created new cart with generated sessionId:', cart._id);
      } catch (createError) {
        if (createError.code === 11000) {
          console.log('Duplicate key error, deactivating old anonymous carts');
          // Deactivate all old anonymous carts without sessionId
          await Cart.updateMany(
            { user: null, isActive: true, $or: [{ sessionId: null }, { sessionId: { $exists: false } }] },
            { $set: { isActive: false } }
          );
          
          // Try creating again
          cart = await Cart.create({
            user: null,
            sessionId: sessionId,
            items: [],
            isActive: true,
            createdAt: new Date(),
            updatedAt: new Date()
          });
        } else {
          throw createError;
        }
      }
    }

    // Prepare response
    const response = {
      success: true,
      data: cart,
      message: 'Cart retrieved successfully'
    };
    
    // Include sessionId in response for anonymous users (so frontend can store it)
    if (!userId && sessionId) {
      response.sessionId = sessionId;
    }

    res.json(response);
    
  } catch (error) {
    console.error('Error getting cart:', error);
    
    // Handle duplicate key error specifically
    if (error.code === 11000) {
      console.log('Duplicate key error detected, attempting recovery');
      
      const sessionId = req.headers['x-session-id'] || req.headers['X-Session-Id'] || req.body?.sessionId;
      const userId = req.user?.id;
      
      let existingCart;
      
      try {
        if (userId) {
          existingCart = await Cart.findOne({ user: userId, isActive: true }).populate('items.product');
        } else if (sessionId) {
          existingCart = await Cart.findOne({ sessionId: sessionId, isActive: true }).populate('items.product');
        } else {
          // Find any anonymous cart and deactivate duplicates
          const anonymousCarts = await Cart.find({ user: null, isActive: true }).sort({ createdAt: -1 });
          if (anonymousCarts.length > 0) {
            // Keep the most recent one
            existingCart = anonymousCarts[0];
            // Deactivate others
            if (anonymousCarts.length > 1) {
              await Cart.updateMany(
                { _id: { $in: anonymousCarts.slice(1).map(c => c._id) } },
                { $set: { isActive: false } }
              );
            }
          }
        }
        
        if (existingCart) {
          const response = {
            success: true,
            data: existingCart,
            message: 'Cart retrieved successfully (recovered from duplicate)'
          };
          
          if (!userId && existingCart.sessionId) {
            response.sessionId = existingCart.sessionId;
          }
          
          return res.json(response);
        }
      } catch (recoveryError) {
        console.error('Error during recovery:', recoveryError);
      }
    }
    
    res.status(500).json({
      success: false,
      message: 'Error retrieving cart',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};
```

---

## Alternative: Simpler Version (If Above Is Too Complex)

If you prefer a simpler approach:

```javascript
// GET /api/cart - Simplified Version
exports.getCart = async (req, res) => {
  try {
    const sessionId = req.headers['x-session-id'] || req.headers['X-Session-Id'] || req.body?.sessionId;
    const userId = req.user?.id;

    let cart;
    let responseSessionId = sessionId;

    if (userId) {
      // Authenticated user - find by userId
      cart = await Cart.findOne({ user: userId, isActive: true }).populate('items.product');
      
      if (!cart) {
        cart = await Cart.create({
          user: userId,
          sessionId: null,
          items: [],
          isActive: true
        });
      }
    } else {
      // Anonymous user - MUST have sessionId
      if (!sessionId) {
        // Generate new sessionId if missing
        const { v4: uuidv4 } = require('uuid');
        responseSessionId = uuidv4();
      }
      
      // Find by sessionId (CRITICAL: not by user: null)
      cart = await Cart.findOne({ 
        sessionId: responseSessionId, 
        isActive: true 
      }).populate('items.product');
      
      if (!cart) {
        // Before creating, deactivate any old anonymous carts without sessionId
        await Cart.updateMany(
          { user: null, isActive: true, $or: [{ sessionId: null }, { sessionId: { $exists: false } }] },
          { $set: { isActive: false } }
        );
        
        cart = await Cart.create({
          user: null,
          sessionId: responseSessionId,
          items: [],
          isActive: true
        });
      }
    }

    res.json({
      success: true,
      data: cart,
      message: 'Cart retrieved successfully',
      ...(responseSessionId && !userId && { sessionId: responseSessionId })
    });
    
  } catch (error) {
    console.error('Error getting cart:', error);
    
    if (error.code === 11000) {
      // Duplicate key - try to find existing cart
      const sessionId = req.headers['x-session-id'] || req.headers['X-Session-Id'];
      const userId = req.user?.id;
      
      const existingCart = userId
        ? await Cart.findOne({ user: userId, isActive: true })
        : sessionId
        ? await Cart.findOne({ sessionId: sessionId, isActive: true })
        : null;
      
      if (existingCart) {
        return res.json({
          success: true,
          data: existingCart,
          message: 'Cart retrieved successfully',
          ...(sessionId && !userId && { sessionId })
        });
      }
    }
    
    res.status(500).json({
      success: false,
      message: 'Error retrieving cart',
      error: error.message
    });
  }
};
```

---

## Key Points to Remember

1. **Always query by `sessionId` for anonymous users**, never by `user: null`
2. **Check for existing cart BEFORE creating** a new one
3. **Handle duplicate key errors** gracefully by finding existing cart
4. **Return `sessionId` in response** for anonymous users so frontend can store it
5. **Deactivate old anonymous carts** without `sessionId` to prevent conflicts

---

## Database Cleanup Script

Before deploying the fix, run this MongoDB script to clean up existing problematic carts:

```javascript
// Run this in MongoDB shell or MongoDB Compass

// 1. Deactivate all anonymous carts without sessionId
db.carts.updateMany(
  { 
    user: null, 
    isActive: true, 
    $or: [
      { sessionId: null }, 
      { sessionId: { $exists: false } }
    ]
  },
  { $set: { isActive: false } }
);

// 2. For carts with duplicate sessionIds, keep only the most recent
db.carts.aggregate([
  { 
    $match: { 
      user: null, 
      isActive: true, 
      sessionId: { $ne: null, $exists: true }
    }
  },
  { $sort: { createdAt: -1 } },
  { 
    $group: { 
      _id: "$sessionId", 
      keep: { $first: "$_id" }, 
      all: { $push: "$_id" },
      count: { $sum: 1 }
    } 
  },
  { $match: { count: { $gt: 1 } } }
]).forEach(doc => {
  const toDeactivate = doc.all.filter(id => id.toString() !== doc.keep.toString());
  if (toDeactivate.length > 0) {
    db.carts.updateMany(
      { _id: { $in: toDeactivate } },
      { $set: { isActive: false } }
    );
    print(`Deactivated ${toDeactivate.length} duplicate carts for sessionId: ${doc._id}`);
  }
});

// 3. Verify cleanup
print("Remaining anonymous active carts:", db.carts.countDocuments({ user: null, isActive: true }));
```

---

## Testing After Fix

1. **Test anonymous user without sessionId:**
   ```bash
   curl -X GET https://qurrota-backend.onrender.com/api/cart
   ```
   - Should create new cart with generated sessionId
   - Response should include `sessionId` field

2. **Test anonymous user with sessionId:**
   ```bash
   curl -X GET https://qurrota-backend.onrender.com/api/cart \
     -H "X-Session-Id: your-session-id-here"
   ```
   - Should find existing cart or create new one
   - Should NOT create duplicate

3. **Test authenticated user:**
   ```bash
   curl -X GET https://qurrota-backend.onrender.com/api/cart \
     -H "Authorization: Bearer your-token-here"
   ```
   - Should find cart by userId
   - Should create new cart if none exists

4. **Test concurrent requests:**
   - Open multiple browser tabs
   - All should get the same cart (no duplicates)

---

## Deployment Steps

1. **Backup your database** (important!)
2. **Run the database cleanup script** (see above)
3. **Update your backend route** with the new code
4. **Test locally** if possible
5. **Deploy to production**
6. **Monitor logs** for any remaining duplicate key errors
7. **Verify** that new anonymous users can create carts without errors

---

## If You're Using Mongoose Schema

Make sure your Cart schema has proper indexes:

```javascript
const cartSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  sessionId: {
    type: String,
    default: null,
    index: true // Add index for faster lookups
  },
  items: [{
    // your item schema
  }],
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Create compound indexes
cartSchema.index({ user: 1, isActive: 1 }, { 
  unique: true, 
  partialFilterExpression: { user: { $ne: null } } 
});

cartSchema.index({ sessionId: 1, isActive: 1 }, { 
  unique: true, 
  partialFilterExpression: { sessionId: { $ne: null } } 
});
```

This ensures:
- Only one active cart per authenticated user
- Only one active cart per sessionId (anonymous user)
- No conflicts between the two

---

## Summary

The fix ensures that:
1. ✅ Anonymous carts are found/created by `sessionId`, not `user: null`
2. ✅ Existing carts are checked before creating new ones
3. ✅ Duplicate key errors are handled gracefully
4. ✅ Old problematic carts are cleaned up
5. ✅ Frontend always receives `sessionId` for anonymous users

After implementing this fix, the duplicate key error should be resolved!

