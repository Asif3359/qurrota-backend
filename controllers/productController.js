const Product = require("../models/Product");
const { uploadImage } = require("../config/cloudinary");

exports.createProduct = async (req, res) => {
  try {
    // Parse JSON fields if sent as strings in multipart form
    const body = req.body || {};
    let variants = body.variants;
    if (typeof variants === 'string') {
      try { variants = JSON.parse(variants); } catch (_) { variants = undefined; }
    }
    let images = body.images;
    if (typeof images === 'string') {
      try { images = JSON.parse(images); } catch (_) { images = undefined; }
    }

    const data = { ...body };
    if (variants !== undefined) data.variants = variants;
    if (images !== undefined) data.images = images;

    // If files are uploaded, push them to product images
    if (Array.isArray(req.files) && req.files.length > 0) {
      console.log(`📸 Processing ${req.files.length} uploaded files`);
      
      // Upload files with a small delay to avoid rate limits
      const uploads = [];
      for (let i = 0; i < req.files.length; i++) {
        const file = req.files[i];
        console.log(`📤 Uploading file ${i + 1}/${req.files.length}: ${file.originalname} (${file.size} bytes)`);
        
        const uploadResult = await uploadImage(file.buffer, 'qurrota/products');
        uploads.push(uploadResult);
        
        // Small delay between uploads to avoid rate limits
        if (i < req.files.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }
      
      const successfulUploads = uploads.filter((u) => u && u.success);
      const failedUploads = uploads.filter((u) => !u || !u.success);
      
      if (failedUploads.length > 0) {
        console.error('❌ Failed uploads:', failedUploads);
        return res.status(400).json({ 
          message: `Failed to upload ${failedUploads.length} out of ${req.files.length} images`,
          errors: failedUploads.map(u => u.error)
        });
      }
      
      const uploadedImages = successfulUploads
        .map((u, idx) => ({ url: u.url, publicId: u.publicId, isPrimary: idx === 0 }));
      
      if (uploadedImages.length) {
        if (!Array.isArray(data.images)) data.images = [];
        data.images = [...uploadedImages, ...data.images];
        console.log(`✅ Successfully uploaded ${uploadedImages.length} images`);
      }
    }

    const product = new Product(data);
    await product.save();
    return res.status(201).json({ message: "Product created", product });
  } catch (err) {
    if (err && err.code === 11000) {
      return res.status(409).json({ message: "Duplicate key", details: err.keyValue });
    }
    return res.status(400).json({ message: err.message });
  }
};

exports.listProducts = async (req, res) => {
  try {
    const { q, brand, category, minPrice, maxPrice, page = 1, limit = 20 } = req.query;
    const filter = { isActive: true, isPublished: true };
    if (q) filter.$text = { $search: q };
    if (brand) filter.brand = brand;
    if (category) filter.categories = category;
    if (minPrice || maxPrice) {
      filter.price = {};
      if (minPrice) filter.price.$gte = Number(minPrice);
      if (maxPrice) filter.price.$lte = Number(maxPrice);
    }
    const skip = (Number(page) - 1) * Number(limit);
    const [items, total] = await Promise.all([
      Product.find(filter)
        .sort({ updatedAt: -1 })
        .skip(skip)
        .limit(Number(limit))
        .lean(),
      Product.countDocuments(filter),
    ]);
    return res.json({ items, total, page: Number(page), limit: Number(limit) });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

exports.getProducts = async (req, res) => {
  try {
    console.log('🔍 getProducts function called for /published route');
    console.log('📝 Query parameters:', req.query);
    
    // Get pagination and sort params from query
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 12;
    const skip = (page - 1) * limit;
    const sortParam = req.query.sort || 'newest';
    
    const filter = { isPublished: true };
    
    // Determine sort order based on sortParam
    let sortOrder = {};
    switch (sortParam) {
      case 'price-low':
        sortOrder = { price: 1 }; // Ascending
        break;
      case 'price-high':
        sortOrder = { price: -1 }; // Descending
        break;
      case 'name-asc':
        sortOrder = { name: 1 }; // A-Z
        break;
      case 'name-desc':
        sortOrder = { name: -1 }; // Z-A
        break;
      case 'newest':
      default:
        sortOrder = { createdAt: -1, updatedAt: -1 }; // Newest first
        break;
    }
    
    console.log('🎯 Database filter:', filter);
    console.log('📄 Pagination:', { page, limit, skip });
    console.log('🔄 Sort order:', sortOrder);

    // Execute query with sorting BEFORE pagination
    const [products, total] = await Promise.all([
      Product.find(filter)
        .sort(sortOrder) // Sort happens BEFORE skip/limit
        .skip(skip)
        .limit(limit)
        .lean(),
      Product.countDocuments(filter)
    ]);

    console.log(`✅ Found ${products.length} products out of ${total} total`);

    // Return paginated response
    return res.status(200).json({
      success: true,
      data: products,
      count: products.length,
      total: total,
      page: page,
      totalPages: Math.ceil(total / limit),
      sort: sortParam,
      message: products.length === 0 ? 'No published products found' : 'Products retrieved successfully'
    });

  } catch (error) {
    console.error('❌ Error in getProducts:', error);
    return res.status(500).json({
      success: false,
      message: 'Error fetching products',
      error: error.message
    });
  }
};

// Add this to your productController
exports.debugProducts = async (req, res) => {
  try {
    const totalProducts = await Product.countDocuments({});
    const publishedProducts = await Product.countDocuments({ isPublished: true });
    const activeProducts = await Product.countDocuments({ isActive: true });
    const activeAndPublished = await Product.countDocuments({ isActive: true, isPublished: true });
    
    const sampleProducts = await Product.find({}).limit(2).select('name isActive isPublished');
    
    res.json({
      databaseStats: {
        totalProducts,
        publishedProducts,
        activeProducts,
        activeAndPublished
      },
      sampleProducts
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getProductByIdOrSlug = async (req, res) => {
  try {
    const { idOrSlug } = req.params;
    const query = /^[0-9a-fA-F]{24}$/.test(idOrSlug)
      ? { _id: idOrSlug }
      : { slug: idOrSlug };
    const product = await Product.findOne({ ...query, isActive: true, isPublished: true }).lean();
    if (!product) return res.status(404).json({ message: "Product not found" });
    return res.json(product);
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

exports.updateProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body || {};
    const updated = await Product.findByIdAndUpdate(id, updates, {
      new: true,
      runValidators: true,
      context: 'query',
    });
    if (!updated) return res.status(404).json({ message: "Product not found" });
    return res.json({ message: "Product updated", product: updated });
  } catch (err) {
    if (err && err.code === 11000) {
      return res.status(409).json({ message: "Duplicate key", details: err.keyValue });
    }
    return res.status(400).json({ message: err.message });
  }
};

exports.deleteProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await Product.findByIdAndDelete(id);
    if (!deleted) return res.status(404).json({ message: "Product not found" });
    return res.json({ message: "Product deleted" });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};
