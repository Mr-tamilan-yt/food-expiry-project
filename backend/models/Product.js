import mongoose from 'mongoose';

const productSchema = new mongoose.Schema({
  userId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },
  name: { 
    type: String, 
    required: true 
  },
  category: { 
    type: String, 
    required: true 
  },
  expiryDate: { 
    type: Date, 
    required: true 
  },
  location: { 
    type: String, 
    required: true 
  },
  notes: { 
    type: String 
  },
  status: { 
    type: String, 
    enum: ['active', 'used', 'wasted'], 
    default: 'active' 
  },
  addedDate: { 
    type: Date, 
    default: Date.now 
  }
});

export default mongoose.model('Product', productSchema);