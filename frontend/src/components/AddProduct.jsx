import React, { useState, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import Webcam from 'react-webcam';
import Tesseract from 'tesseract.js';
import { motion, AnimatePresence } from 'framer-motion';

import {
  Camera,
  X,
  Calendar,
  Tag,
  MapPin,
  FileText,
  Package,
  Leaf,
  Coffee,
  Utensils,
  Wine,
  ShoppingBag,
  Snowflake,
  AlertCircle,
  CheckCircle,
  Loader,
  Scan,
  ChevronRight,
  ChevronLeft,
  Sparkles,
  Camera as CameraIcon,
  RotateCcw,
  Trash2,
  Plus,
  Home,
  Refrigerator,
  ChefHat,
  Apple,
  Beef,
  Milk,
  Sandwich
} from 'lucide-react';

function AddProduct() {
  const [formData, setFormData] = useState({
    name: '',
    category: '',
    expiryDate: '',
    location: '',
    notes: ''
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [showCamera, setShowCamera] = useState(false);
  const [capturedImage, setCapturedImage] = useState(null);
  const [ocrLoading, setOcrLoading] = useState(false);
  const [ocrProgress, setOcrProgress] = useState(0);
  const [ocrResult, setOcrResult] = useState('');
  const [activeStep, setActiveStep] = useState(1);
  
  const webcamRef = useRef(null);
  const navigate = useNavigate();

  const categories = [
    { id: 'dairy', label: 'Dairy', icon: Milk, color: 'from-blue-400 to-blue-500', bgColor: 'bg-blue-50', textColor: 'text-blue-600' },
    { id: 'vegetables', label: 'Vegetables', icon: Leaf, color: 'from-emerald-400 to-emerald-500', bgColor: 'bg-emerald-50', textColor: 'text-emerald-600' },
    { id: 'fruits', label: 'Fruits', icon: Apple, color: 'from-green-400 to-emerald-500', bgColor: 'bg-green-50', textColor: 'text-green-600' },
    { id: 'meat', label: 'Meat', icon: Beef, color: 'from-rose-400 to-rose-500', bgColor: 'bg-rose-50', textColor: 'text-rose-600' },
    { id: 'grains', label: 'Grains', icon: Package, color: 'from-amber-400 to-amber-500', bgColor: 'bg-amber-50', textColor: 'text-amber-600' },
    { id: 'beverages', label: 'Beverages', icon: Wine, color: 'from-purple-400 to-purple-500', bgColor: 'bg-purple-50', textColor: 'text-purple-600' },
    { id: 'snacks', label: 'Snacks', icon: Sandwich, color: 'from-orange-400 to-orange-500', bgColor: 'bg-orange-50', textColor: 'text-orange-600' },
    { id: 'frozen', label: 'Frozen', icon: Snowflake, color: 'from-cyan-400 to-cyan-500', bgColor: 'bg-cyan-50', textColor: 'text-cyan-600' },
    { id: 'other', label: 'Other', icon: Package, color: 'from-gray-400 to-gray-500', bgColor: 'bg-gray-50', textColor: 'text-gray-600' }
  ];

  const locations = [
    { id: 'pantry', label: 'Pantry', icon: Home, color: 'amber' },
    { id: 'refrigerator', label: 'Refrigerator', icon: Refrigerator, color: 'blue' },
    { id: 'freezer', label: 'Freezer', icon: Snowflake, color: 'cyan' },
    { id: 'cabinet', label: 'Cabinet', icon: Package, color: 'gray' },
    { id: 'other', label: 'Other', icon: MapPin, color: 'gray' }
  ];

  const videoConstraints = {
    width: 1280,
    height: 720,
    facingMode: "environment"
  };

  const capture = useCallback(() => {
    const imageSrc = webcamRef.current.getScreenshot();
    setCapturedImage(imageSrc);
    setShowCamera(false);
    setActiveStep(2);
  }, [webcamRef]);

  const retakePhoto = () => {
    setCapturedImage(null);
    setShowCamera(true);
    setOcrResult('');
    setActiveStep(1);
  };

  const extractDateFromText = (text) => {
    const datePatterns = [
      /\b(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{4})\b/,
      /\b(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{2})\b/,
      /\b(\d{4})[\/\-\.](\d{1,2})[\/\-\.](\d{1,2})\b/,
    ];

    for (const pattern of datePatterns) {
      const match = text.match(pattern);
      if (match) {
        const dateStr = match[0];
        const parts = dateStr.split(/[\/\-\.]/);
        
        if (parts.length === 3) {
          let year, month, day;
          
          if (parts[0].length === 4) {
            [year, month, day] = parts;
          } else if (parseInt(parts[0]) > 12) {
            [day, month, year] = parts;
          } else {
            [month, day, year] = parts;
          }
          
          if (year.length === 2) {
            year = '20' + year;
          }
          
          const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
          if (!isNaN(date.getTime())) {
            return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
          }
        }
      }
    }
    return null;
  };

  const processImageWithOCR = async () => {
    if (!capturedImage) return;

    setOcrLoading(true);
    setOcrProgress(0);
    setOcrResult('');

    try {
      const { data: { text } } = await Tesseract.recognize(
        capturedImage,
        'eng',
        { 
          logger: m => {
            console.log(m);
            if (m.status === 'recognizing text') {
              setOcrProgress(Math.round(m.progress * 100));
            }
          } 
        }
      );

      setOcrResult(text);
      
      const extractedDate = extractDateFromText(text);
      if (extractedDate) {
        setFormData(prev => ({
          ...prev,
          expiryDate: extractedDate
        }));
        setMessage({ 
          type: 'success', 
          text: 'Date extracted successfully! Please verify the date below.' 
        });
      } else {
        setMessage({ 
          type: 'info', 
          text: 'Text captured. Please enter or verify the expiry date manually.' 
        });
      }
    } catch (error) {
      console.error('OCR Error:', error);
      setMessage({ 
        type: 'error', 
        text: 'Error processing image. Please enter details manually.' 
      });
    } finally {
      setOcrLoading(false);
      setOcrProgress(0);
    }
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.name) {
      setMessage({ type: 'error', text: 'Product name is required' });
      return;
    }

    setLoading(true);
    setMessage({ type: '', text: '' });

    try {
      await axios.post('/api/products', formData);
      setMessage({ type: 'success', text: 'Product added successfully!' });
      setFormData({
        name: '',
        category: '',
        expiryDate: '',
        location: '',
        notes: ''
      });
      setCapturedImage(null);
      setOcrResult('');
      setActiveStep(1);
      
      setTimeout(() => {
        navigate('/dashboard');
      }, 2000);
    } catch (error) {
      setMessage({ 
        type: 'error', 
        text: 'Error adding product: ' + (error.response?.data?.message || 'Unknown error') 
      });
    } finally {
      setLoading(false);
    }
  };

  const startCamera = () => {
    setShowCamera(true);
    setCapturedImage(null);
    setOcrResult('');
    setMessage({ type: '', text: '' });
    setActiveStep(1);
  };

  const cancelCamera = () => {
    setShowCamera(false);
    setCapturedImage(null);
    setActiveStep(1);
  };

  const discardImage = () => {
    setCapturedImage(null);
    setOcrResult('');
    setActiveStep(1);
  };

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <h1 className="text-3xl font-bold text-gray-800 flex items-center gap-3">
          <div className="p-2 bg-linear-to-br from-emerald-400 to-emerald-600 rounded-xl shadow-lg shadow-emerald-500/20">
            <Package className="text-white" size={24} />
          </div>
          Add New Product
        </h1>
        <p className="text-gray-500 mt-2 ml-14">
          Scan expiry date or enter product details manually
        </p>
      </motion.div>

      {/* Progress Steps */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          {[1, 2, 3].map((step) => (
            <div key={step} className="flex items-center flex-1">
              <div className="relative">
                <motion.div
                  animate={{
                    scale: activeStep >= step ? 1 : 0.8,
                    backgroundColor: activeStep >= step ? '#10b981' : '#e5e7eb'
                  }}
                  className="w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold"
                >
                  {activeStep > step ? (
                    <CheckCircle size={20} />
                  ) : (
                    <span>{step}</span>
                  )}
                </motion.div>
              </div>
              {step < 3 && (
                <div className="flex-1 h-1 mx-2 bg-gray-200 rounded">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: activeStep > step ? '100%' : '0%' }}
                    className="h-full bg-emerald-500 rounded"
                  />
                </div>
              )}
            </div>
          ))}
        </div>
        <div className="flex justify-between mt-2 text-sm text-gray-500">
          <span>Capture</span>
          <span>Review</span>
          <span>Details</span>
        </div>
      </div>

      {/* Message Alert */}
      <AnimatePresence>
        {message.text && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className={`mb-6 p-4 rounded-lg border flex items-center gap-3 ${
              message.type === 'success' 
                ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                : message.type === 'error'
                ? 'bg-rose-50 border-rose-200 text-rose-700'
                : 'bg-blue-50 border-blue-200 text-blue-700'
            }`}
          >
            {message.type === 'success' ? (
              <CheckCircle size={20} />
            ) : message.type === 'error' ? (
              <AlertCircle size={20} />
            ) : (
              <Sparkles size={20} />
            )}
            <p className="text-sm">{message.text}</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Camera Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden mb-6"
      >
        <div className="p-6">
          <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2 mb-4">
            <Camera className="text-emerald-600" size={20} />
            Smart Capture
          </h2>

          {!showCamera && !capturedImage ? (
            <motion.div
              whileHover={{ scale: 1.02 }}
              className="border-2 border-dashed border-gray-200 rounded-xl p-8 text-center hover:border-emerald-300 transition-colors cursor-pointer"
              onClick={startCamera}
            >
              <div className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-4">
                <CameraIcon className="text-emerald-600" size={28} />
              </div>
              <h3 className="font-medium text-gray-800 mb-2">Capture Expiry Date</h3>
              <p className="text-sm text-gray-500 mb-4">
                Take a photo of the expiry date to auto-fill the form
              </p>
              <button className="px-6 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 transition-colors inline-flex items-center gap-2">
                <Camera size={16} />
                Open Camera
              </button>
            </motion.div>
          ) : showCamera ? (
            <div className="space-y-4">
              <div className="relative rounded-xl overflow-hidden bg-gray-900">
                <Webcam
                  audio={false}
                  ref={webcamRef}
                  screenshotFormat="image/jpeg"
                  videoConstraints={videoConstraints}
                  className="w-full h-auto"
                />
                <div className="absolute inset-0 border-4 border-emerald-500 border-opacity-50 pointer-events-none"></div>
                <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-3">
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={capture}
                    className="px-6 py-3 bg-emerald-600 text-white rounded-lg font-medium flex items-center gap-2 shadow-lg"
                  >
                    <Camera size={18} />
                    Capture
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={cancelCamera}
                    className="px-6 py-3 bg-gray-600 text-white rounded-lg font-medium flex items-center gap-2 shadow-lg"
                  >
                    <X size={18} />
                    Cancel
                  </motion.button>
                </div>
              </div>
              <p className="text-sm text-gray-500 text-center">
                Position the expiry date clearly within the frame
              </p>
            </div>
          ) : capturedImage && (
            <div className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div className="rounded-xl overflow-hidden border border-gray-200">
                  <img 
                    src={capturedImage} 
                    alt="Captured" 
                    className="w-full h-auto"
                  />
                </div>
                
                <div className="space-y-4">
                  {!ocrResult ? (
                    <>
                      <button
                        onClick={processImageWithOCR}
                        disabled={ocrLoading}
                        className="w-full p-6 bg-linear-to-r from-emerald-500 to-emerald-600 text-white rounded-xl hover:from-emerald-600 hover:to-emerald-700 transition-all disabled:opacity-50"
                      >
                        {ocrLoading ? (
                          <div className="flex flex-col items-center gap-3">
                            <Loader className="animate-spin" size={24} />
                            <span>Processing... {ocrProgress}%</span>
                          </div>
                        ) : (
                          <div className="flex flex-col items-center gap-3">
                            <Scan size={32} />
                            <span className="font-medium">Scan Expiry Date</span>
                            <span className="text-xs text-emerald-100">
                              Click to extract date from image
                            </span>
                          </div>
                        )}
                      </button>

                      <div className="flex gap-2">
                        <button
                          onClick={retakePhoto}
                          className="flex-1 px-4 py-2 border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 transition-colors flex items-center justify-center gap-2"
                        >
                          <RotateCcw size={16} />
                          Retake
                        </button>
                        <button
                          onClick={discardImage}
                          className="flex-1 px-4 py-2 border border-gray-200 rounded-lg text-rose-600 hover:bg-rose-50 transition-colors flex items-center justify-center gap-2"
                        >
                          <Trash2 size={16} />
                          Discard
                        </button>
                      </div>
                    </>
                  ) : (
                    <div className="bg-gray-50 rounded-xl p-4">
                      <h4 className="font-medium text-gray-700 mb-2 flex items-center gap-2">
                        <FileText size={16} className="text-gray-500" />
                        Detected Text
                      </h4>
                      <p className="text-sm text-gray-600 bg-white p-3 rounded-lg border border-gray-200 max-h-40 overflow-y-auto">
                        {ocrResult}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </motion.div>

      {/* Product Form */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden"
      >
        <form onSubmit={handleSubmit} className="p-6">
          <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2 mb-6">
            <Package className="text-emerald-600" size={20} />
            Product Details
          </h2>

          <div className="space-y-6">
            {/* Product Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-1">
                <Package size={14} className="text-gray-500" />
                Product Name <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="e.g., Organic Milk, Fresh Apples"
                className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
              />
            </div>

            {/* Category */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-1">
                <Tag size={14} className="text-gray-500" />
                Category
              </label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {categories.map((cat) => {
                  const Icon = cat.icon;
                  const isSelected = formData.category === cat.label;
                  return (
                    <motion.button
                      key={cat.id}
                      type="button"
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => setFormData(prev => ({ ...prev, category: cat.label }))}
                      className={`p-3 rounded-lg border-2 transition-all flex items-center gap-2 ${
                        isSelected 
                          ? `border-emerald-500 bg-emerald-50`
                          : 'border-gray-200 hover:border-emerald-200 bg-white'
                      }`}
                    >
                      <div className={`p-1.5 rounded-lg ${cat.bgColor}`}>
                        <Icon className={cat.textColor} size={16} />
                      </div>
                      <span className="text-sm font-medium text-gray-700">{cat.label}</span>
                    </motion.button>
                  );
                })}
              </div>
            </div>

            {/* Expiry Date */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-1">
                <Calendar size={14} className="text-gray-500" />
                Expiry Date
              </label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input
                  type="date"
                  name="expiryDate"
                  value={formData.expiryDate}
                  onChange={handleChange}
                  className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                />
              </div>
              {formData.expiryDate && (
                <p className="mt-1 text-xs text-gray-500">
                  Selected: {new Date(formData.expiryDate).toLocaleDateString('en-US', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                </p>
              )}
            </div>

            {/* Storage Location */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-1">
                <MapPin size={14} className="text-gray-500" />
                Storage Location
              </label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {locations.map((loc) => {
                  const Icon = loc.icon;
                  const isSelected = formData.location === loc.label;
                  return (
                    <motion.button
                      key={loc.id}
                      type="button"
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => setFormData(prev => ({ ...prev, location: loc.label }))}
                      className={`p-3 rounded-lg border-2 transition-all flex items-center gap-2 ${
                        isSelected 
                          ? 'border-emerald-500 bg-emerald-50'
                          : 'border-gray-200 hover:border-emerald-200 bg-white'
                      }`}
                    >
                      <div className={`p-1.5 rounded-lg ${
                        loc.color === 'blue' ? 'bg-blue-50 text-blue-600' :
                        loc.color === 'amber' ? 'bg-amber-50 text-amber-600' :
                        loc.color === 'cyan' ? 'bg-cyan-50 text-cyan-600' :
                        'bg-gray-50 text-gray-600'
                      }`}>
                        <Icon size={16} />
                      </div>
                      <span className="text-sm font-medium text-gray-700">{loc.label}</span>
                    </motion.button>
                  );
                })}
              </div>
            </div>

            {/* Notes */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-1">
                <FileText size={14} className="text-gray-500" />
                Notes (Optional)
              </label>
              <textarea
                name="notes"
                value={formData.notes}
                onChange={handleChange}
                rows="3"
                placeholder="Add any additional notes about the product..."
                className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all resize-none"
              />
            </div>

            {/* Form Actions */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100">
              <button
                type="button"
                onClick={() => navigate('/dashboard')}
                className="px-6 py-2.5 border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <motion.button
                type="submit"
                disabled={loading || !formData.name}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="px-6 py-2.5 bg-linear-to-r from-emerald-600 to-emerald-600 text-white rounded-lg font-medium hover:from-emerald-700 hover:to-emerald-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {loading ? (
                  <>
                    <Loader className="animate-spin" size={18} />
                    Adding Product...
                  </>
                ) : (
                  <>
                    <Plus size={18} />
                    Add Product
                  </>
                )}
              </motion.button>
            </div>
          </div>
        </form>
      </motion.div>

      {/* Quick Tips */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="mt-6 p-4 bg-emerald-50/50 rounded-xl border border-emerald-100"
      >
        <h3 className="text-sm font-medium text-emerald-800 flex items-center gap-2 mb-2">
          <Sparkles size={16} />
          Quick Tips
        </h3>
        <ul className="text-xs text-emerald-700 space-y-1">
          <li className="flex items-center gap-2">
            <ChevronRight size={12} />
            Use the camera to scan expiry dates automatically
          </li>
          <li className="flex items-center gap-2">
            <ChevronRight size={12} />
            Only product name is required - other fields are optional
          </li>
          <li className="flex items-center gap-2">
            <ChevronRight size={12} />
            Adding category helps with organization and recipe suggestions
          </li>
        </ul>
      </motion.div>
    </div>
  );
}

export default AddProduct;