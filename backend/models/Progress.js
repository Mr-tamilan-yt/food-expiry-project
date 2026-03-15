import mongoose from 'mongoose';

const progressSchema = new mongoose.Schema({
  userId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },
  date: { 
    type: Date, 
    default: Date.now 
  },
  usedCount: { 
    type: Number, 
    default: 0 
  },
  wastedCount: { 
    type: Number, 
    default: 0 
  },
  totalProducts: { 
    type: Number, 
    default: 0 
  }
});

export default mongoose.model('Progress', progressSchema);