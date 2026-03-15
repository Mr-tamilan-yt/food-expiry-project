import express from 'express';
import auth from '../middleware/auth.js';
import Product from '../models/Product.js';
import Progress from '../models/Progress.js';

const router = express.Router();

// Get all products for user
router.get('/', auth, async (req, res) => {
  try {
    const products = await Product.find({ userId: req.user._id }).sort({ expiryDate: 1 });
    res.json(products);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Add new product
router.post('/', auth, async (req, res) => {
  try {
    const { name, category, expiryDate, location, notes } = req.body;
    
    const product = new Product({
      userId: req.user._id,
      name,
      category,
      expiryDate,
      location,
      notes
    });

    await product.save();
    
    // Update progress
    await updateProgress(req.user._id);
    
    res.status(201).json(product);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Update product status
router.put('/:id', auth, async (req, res) => {
  try {
    const { status } = req.body;
    const product = await Product.findOneAndUpdate(
      { _id: req.params.id, userId: req.user._id },
      { status },
      { new: true }
    );

    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    // Update progress
    await updateProgress(req.user._id);

    res.json(product);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete product
router.delete('/:id', auth, async (req, res) => {
  try {
    const product = await Product.findOneAndDelete({
      _id: req.params.id,
      userId: req.user._id
    });

    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    // Update progress
    await updateProgress(req.user._id);

    res.json({ message: 'Product deleted' });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Get expiring products (6 days or less)
router.get('/expiring', auth, async (req, res) => {
  try {
    const sixDaysFromNow = new Date();
    sixDaysFromNow.setDate(sixDaysFromNow.getDate() + 6);
    
    const products = await Product.find({
      userId: req.user._id,
      expiryDate: { $lte: sixDaysFromNow },
      status: 'active'
    }).sort({ expiryDate: 1 });

    res.json(products);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Helper function to update progress
async function updateProgress(userId) {
  const products = await Product.find({ userId });
  const usedCount = products.filter(p => p.status === 'used').length;
  const wastedCount = products.filter(p => p.status === 'wasted').length;
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  await Progress.findOneAndUpdate(
    { userId, date: { $gte: today } },
    {
      usedCount,
      wastedCount,
      totalProducts: products.length
    },
    { upsert: true, new: true }
  );
}

export default router;