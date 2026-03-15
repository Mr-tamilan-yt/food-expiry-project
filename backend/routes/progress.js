import express from 'express';
import auth from '../middleware/auth.js';
import Product from '../models/Product.js';
import Progress from '../models/Progress.js';

const router = express.Router();

// Get progress data
router.get('/', auth, async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    let progress = await Progress.findOne({
      userId: req.user._id,
      date: { $gte: today }
    });

    if (!progress) {
      const products = await Product.find({ userId: req.user._id });
      const usedCount = products.filter(p => p.status === 'used').length;
      const wastedCount = products.filter(p => p.status === 'wasted').length;
      
      progress = new Progress({
        userId: req.user._id,
        usedCount,
        wastedCount,
        totalProducts: products.length
      });
      await progress.save();
    }

    res.json(progress);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Reset progress
router.post('/reset', auth, async (req, res) => {
  try {
    await Product.updateMany(
      { userId: req.user._id },
      { $set: { status: 'active' } }
    );

    const products = await Product.find({ userId: req.user._id });
    const usedCount = products.filter(p => p.status === 'used').length;
    const wastedCount = products.filter(p => p.status === 'wasted').length;
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    await Progress.findOneAndUpdate(
      { userId: req.user._id, date: { $gte: today } },
      {
        usedCount,
        wastedCount,
        totalProducts: products.length
      },
      { upsert: true, new: true }
    );
    
    res.json({ message: 'Progress reset successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;