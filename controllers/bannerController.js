const Banner = require("../models/Banner");
const { uploadImage, deleteImage } = require("../config/cloudinary");

// Get active banners (public route - returns 3-4 active banners or defaults)
exports.getActiveBanners = async (req, res) => {
  try {
    const banners = await Banner.getActiveBanners();
    
    if (banners.length === 0) {
      return res.status(200).json({
        success: true,
        message: "No active banners found",
        data: [],
        isDefault: false
      });
    }
    
    // Return array of banners (3-4 banners)
    const isDefault = banners.length > 0 && banners[0].isDefault;
    return res.status(200).json({
      success: true,
      data: banners,
      count: banners.length,
      isDefault: isDefault,
      message: `${banners.length} active banner(s) retrieved successfully`
    });
  } catch (error) {
    console.error('❌ Error in getActiveBanners:', error);
    return res.status(500).json({
      success: false,
      message: 'Error fetching active banners',
      error: error.message
    });
  }
};

// Get all banners (admin only)
exports.getAllBanners = async (req, res) => {
  try {
    const { page = 1, limit = 20, isDefault, isActive } = req.query;
    const skip = (Number(page) - 1) * Number(limit);
    
    const filter = {};
    if (isDefault !== undefined) filter.isDefault = isDefault === 'true';
    if (isActive !== undefined) filter.isActive = isActive === 'true';
    
    const [banners, total] = await Promise.all([
      Banner.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit))
        .lean(),
      Banner.countDocuments(filter)
    ]);
    
    return res.status(200).json({
      success: true,
      data: banners,
      count: banners.length,
      total: total,
      page: Number(page),
      totalPages: Math.ceil(total / limit),
      message: "Banners retrieved successfully"
    });
  } catch (error) {
    console.error('❌ Error in getAllBanners:', error);
    return res.status(500).json({
      success: false,
      message: 'Error fetching banners',
      error: error.message
    });
  }
};

// Get banner by ID
exports.getBannerById = async (req, res) => {
  try {
    const { id } = req.params;
    const banner = await Banner.findById(id);
    
    if (!banner) {
      return res.status(404).json({
        success: false,
        message: "Banner not found"
      });
    }
    
    return res.status(200).json({
      success: true,
      data: banner,
      message: "Banner retrieved successfully"
    });
  } catch (error) {
    console.error('❌ Error in getBannerById:', error);
    return res.status(500).json({
      success: false,
      message: 'Error fetching banner',
      error: error.message
    });
  }
};

// Create banner (admin only)
exports.createBanner = async (req, res) => {
  try {
    const body = req.body || {};
    
    // Parse JSON fields if sent as strings in multipart form
    let image = body.image;
    if (typeof image === 'string') {
      try { image = JSON.parse(image); } catch (_) { image = undefined; }
    }
    
    const data = { ...body };
    if (image !== undefined) data.image = image;
    
    // Parse dates if sent as strings
    if (data.startDate && typeof data.startDate === 'string') {
      data.startDate = new Date(data.startDate);
    }
    if (data.endDate && typeof data.endDate === 'string') {
      data.endDate = new Date(data.endDate);
    }
    
    // Parse order if provided
    if (data.order !== undefined) {
      data.order = Number(data.order);
    }
    
    // If file is uploaded, upload it to Cloudinary
    if (req.file || (Array.isArray(req.files) && req.files.length > 0)) {
      const file = req.file || req.files[0];
      console.log(`📸 Processing uploaded file for banner: ${file.originalname} (${file.size} bytes)`);
      
      const uploadResult = await uploadImage(file.buffer, 'qurrota/banners');
      
      if (!uploadResult || !uploadResult.success) {
        return res.status(400).json({
          success: false,
          message: 'Failed to upload image',
          error: uploadResult?.error || 'Upload failed'
        });
      }
      
      data.image = {
        url: uploadResult.url,
        publicId: uploadResult.publicId,
        alt: body.imageAlt || body.title || ''
      };
      
      console.log(`✅ Successfully uploaded banner image`);
    }
    
    // Validate required fields
    if (!data.title) {
      return res.status(400).json({
        success: false,
        message: 'Title is required'
      });
    }
    
    if (!data.description) {
      return res.status(400).json({
        success: false,
        message: 'Description is required'
      });
    }
    
    if (!data.image || !data.image.url) {
      return res.status(400).json({
        success: false,
        message: 'Image is required'
      });
    }
    
    // If isDefault is true, don't require dates
    if (data.isDefault === true || data.isDefault === 'true') {
      data.isDefault = true;
      data.startDate = undefined;
      data.endDate = undefined;
    }
    
    const banner = new Banner(data);
    await banner.save();
    
    return res.status(201).json({
      success: true,
      message: "Banner created successfully",
      data: banner
    });
  } catch (err) {
    console.error('❌ Error in createBanner:', err);
    if (err.name === 'ValidationError') {
      return res.status(400).json({
        success: false,
        message: "Validation error",
        errors: Object.values(err.errors).map(e => e.message)
      });
    }
    return res.status(400).json({
      success: false,
      message: err.message
    });
  }
};

// Update banner (admin only)
exports.updateBanner = async (req, res) => {
  try {
    const { id } = req.params;
    const body = req.body || {};
    
    // Find existing banner
    const banner = await Banner.findById(id);
    if (!banner) {
      return res.status(404).json({
        success: false,
        message: "Banner not found"
      });
    }
    
    // Parse JSON fields if sent as strings
    let image = body.image;
    if (typeof image === 'string') {
      try { image = JSON.parse(image); } catch (_) { image = undefined; }
    }
    
    const updates = { ...body };
    if (image !== undefined) updates.image = image;
    
    // Parse dates if sent as strings
    if (updates.startDate && typeof updates.startDate === 'string') {
      updates.startDate = new Date(updates.startDate);
    }
    if (updates.endDate && typeof updates.endDate === 'string') {
      updates.endDate = new Date(updates.endDate);
    }
    
    // Parse order if provided
    if (updates.order !== undefined) {
      updates.order = Number(updates.order);
    }
    
    // Handle file upload
    if (req.file || (Array.isArray(req.files) && req.files.length > 0)) {
      const file = req.file || req.files[0];
      console.log(`📸 Processing uploaded file for banner update: ${file.originalname}`);
      
      // Delete old image from Cloudinary
      if (banner.image && banner.image.publicId) {
        await deleteImage(banner.image.publicId);
      }
      
      // Upload new file
      const uploadResult = await uploadImage(file.buffer, 'qurrota/banners');
      
      if (!uploadResult || !uploadResult.success) {
        return res.status(400).json({
          success: false,
          message: 'Failed to upload image',
          error: uploadResult?.error || 'Upload failed'
        });
      }
      
      updates.image = {
        url: uploadResult.url,
        publicId: uploadResult.publicId,
        alt: body.imageAlt || body.title || banner.image?.alt || ''
      };
      
      console.log(`✅ Successfully uploaded banner image`);
    }
    
    // If isDefault is true, clear dates
    if (updates.isDefault === true || updates.isDefault === 'true') {
      updates.isDefault = true;
      updates.startDate = undefined;
      updates.endDate = undefined;
    }
    
    const updatedBanner = await Banner.findByIdAndUpdate(
      id,
      updates,
      {
        new: true,
        runValidators: true,
        context: 'query',
      }
    );
    
    return res.status(200).json({
      success: true,
      message: "Banner updated successfully",
      data: updatedBanner
    });
  } catch (err) {
    console.error('❌ Error in updateBanner:', err);
    if (err.name === 'ValidationError') {
      return res.status(400).json({
        success: false,
        message: "Validation error",
        errors: Object.values(err.errors).map(e => e.message)
      });
    }
    return res.status(400).json({
      success: false,
      message: err.message
    });
  }
};

// Delete banner (admin only)
exports.deleteBanner = async (req, res) => {
  try {
    const { id } = req.params;
    const banner = await Banner.findById(id);
    
    if (!banner) {
      return res.status(404).json({
        success: false,
        message: "Banner not found"
      });
    }
    
    // Delete image from Cloudinary
    if (banner.image && banner.image.publicId) {
      await deleteImage(banner.image.publicId);
    }
    
    await Banner.findByIdAndDelete(id);
    
    return res.status(200).json({
      success: true,
      message: "Banner deleted successfully"
    });
  } catch (err) {
    console.error('❌ Error in deleteBanner:', err);
    return res.status(500).json({
      success: false,
      message: err.message
    });
  }
};
