/**
 * Migration script to fix Cart model indexes
 * Run this once to update the database indexes after deploying the model changes
 * 
 * Usage: node scripts/fix-cart-index.js
 */

require('dotenv').config();
const mongoose = require('mongoose');
const Cart = require('../models/Cart');

const fixCartIndexes = async () => {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    const collection = Cart.collection;

    // Drop existing indexes
    console.log('Dropping existing cart indexes...');
    try {
      await collection.dropIndex('user_1_isActive_1');
      console.log('✓ Dropped user_1_isActive_1 index');
    } catch (err) {
      if (err.code === 27) {
        console.log('  Index user_1_isActive_1 does not exist, skipping...');
      } else {
        throw err;
      }
    }

    try {
      await collection.dropIndex('sessionId_1_isActive_1');
      console.log('✓ Dropped sessionId_1_isActive_1 index');
    } catch (err) {
      if (err.code === 27) {
        console.log('  Index sessionId_1_isActive_1 does not exist, skipping...');
      } else {
        throw err;
      }
    }

    // Create new indexes with proper partial filter expressions
    // Using $type instead of $ne: null (MongoDB doesn't support $ne: null in partial indexes)
    console.log('Creating new indexes...');
    await collection.createIndex(
      { user: 1, isActive: 1 },
      { 
        unique: true, 
        name: 'user_1_isActive_1',
        partialFilterExpression: { isActive: true, user: { $type: "objectId" } }
      }
    );
    console.log('✓ Created user_1_isActive_1 index');

    await collection.createIndex(
      { sessionId: 1, isActive: 1 },
      { 
        unique: true, 
        name: 'sessionId_1_isActive_1',
        partialFilterExpression: { isActive: true, sessionId: { $type: "string" } }
      }
    );
    console.log('✓ Created sessionId_1_isActive_1 index');

    // Clean up any duplicate carts with user: null
    console.log('\nCleaning up duplicate carts with user: null...');
    const duplicateCarts = await Cart.find({ 
      user: null, 
      isActive: true,
      sessionId: { $exists: false }
    }).sort({ createdAt: 1 });

    if (duplicateCarts.length > 1) {
      console.log(`Found ${duplicateCarts.length} duplicate carts. Keeping the oldest one...`);
      // Keep the first (oldest) cart, delete the rest
      const cartsToDelete = duplicateCarts.slice(1);
      for (const cart of cartsToDelete) {
        cart.isActive = false;
        await cart.save();
        console.log(`  Deactivated cart ${cart._id}`);
      }
      console.log(`✓ Cleaned up ${cartsToDelete.length} duplicate carts`);
    } else {
      console.log('  No duplicate carts found');
    }

    console.log('\n✅ Index migration completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error fixing cart indexes:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
};

// Run the migration
fixCartIndexes();

