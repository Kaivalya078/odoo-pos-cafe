const asyncHandler = require('../utils/asyncHandler');
const Product = require('../models/Product');

// @route   POST /api/products
// @access  Private (OWNER, ADMIN)
const createProduct = asyncHandler(async (req, res) => {
  const { name, description, category, image, variants, addons } = req.body;

  if (!name || !category) {
    res.status(400);
    throw new Error('name and category are required');
  }

  // Validate no duplicate variant names
  if (variants && variants.length > 0) {
    const variantNames = variants.map((v) => v.name?.toLowerCase());
    if (new Set(variantNames).size !== variantNames.length) {
      res.status(400);
      throw new Error('Variant names must be unique within a product');
    }
  }

  const product = await Product.create({ name, description, category, image, variants, addons });
  res.status(201).json({ success: true, data: product });
});

// @route   GET /api/products
// @access  Private (OWNER, ADMIN)
const getAllProducts = asyncHandler(async (req, res) => {
  const products = await Product.find().sort({ category: 1, name: 1 }).lean();
  res.status(200).json({ success: true, data: products });
});

// @route   PUT /api/products/:id
// @access  Private (OWNER, ADMIN)
const updateProduct = asyncHandler(async (req, res) => {
  const { variants } = req.body;

  if (variants && variants.length > 0) {
    const variantNames = variants.map((v) => v.name?.toLowerCase());
    if (new Set(variantNames).size !== variantNames.length) {
      res.status(400);
      throw new Error('Variant names must be unique within a product');
    }
  }

  const product = await Product.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true,
  });

  if (!product) {
    res.status(404);
    throw new Error('Product not found');
  }

  res.status(200).json({ success: true, data: product });
});

// @route   DELETE /api/products/:id
// @access  Private (OWNER, ADMIN)
const deleteProduct = asyncHandler(async (req, res) => {
  const product = await Product.findByIdAndDelete(req.params.id);

  if (!product) {
    res.status(404);
    throw new Error('Product not found');
  }

  res.status(200).json({ success: true, data: { message: 'Product deleted successfully' } });
});

// @route   PATCH /api/products/:id/availability
// @access  Private (KITCHEN only)
const toggleAvailability = asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.id);

  if (!product) {
    res.status(404);
    throw new Error('Product not found');
  }

  product.availability = product.availability === 'AVAILABLE' ? 'UNAVAILABLE' : 'AVAILABLE';
  await product.save();

  res.status(200).json({
    success: true,
    data: {
      id: product._id,
      name: product.name,
      availability: product.availability,
    },
  });
});

// @route   GET /api/menu
// @access  Public (CUSTOMER, no auth)
const getMenu = asyncHandler(async (req, res) => {
  const products = await Product.find({ availability: 'AVAILABLE' })
    .select('name description category image variants addons availability')
    .sort({ category: 1, name: 1 })
    .lean();

  // Group by category for a natural menu structure
  const menu = products.reduce((acc, product) => {
    const cat = product.category;
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(product);
    return acc;
  }, {});

  res.status(200).json({ success: true, data: menu });
});

module.exports = { createProduct, getAllProducts, updateProduct, deleteProduct, toggleAvailability, getMenu };
