import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';

import {
  Package,
  CheckCircle,
  AlertTriangle,
  RefreshCw,
  BarChart3,
  PieChart,
  Target,
  Leaf,
  Clock,
  AlertOctagon,
  TrendingUp,
  TrendingDown,
  Calendar,
  Award,
  ChevronRight,
  Download,
  Filter,
  MoreVertical,
  ArrowUp,
  ArrowDown,
  Info
} from 'lucide-react';

function Progress() {
  const [progress, setProgress] = useState(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [activeTab, setActiveTab] = useState('overview');
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  useEffect(() => {
    fetchProgress();
  }, []);

  const fetchProgress = async () => {
    try {
      const response = await axios.get('/api/progress');
      setProgress(response.data);
    } catch (error) {
      console.error('Error fetching progress:', error);
      setMessage({ 
        type: 'error', 
        text: 'Failed to load progress data' 
      });
    } finally {
      setLoading(false);
    }
  };

  const resetProgress = async () => {
    try {
      await axios.post('/api/progress/reset');
      setMessage({ 
        type: 'success', 
        text: 'Progress reset successfully!' 
      });
      fetchProgress();
      setShowResetConfirm(false);
      
      // Clear message after 3 seconds
      setTimeout(() => setMessage({ type: '', text: '' }), 3000);
    } catch (error) {
      setMessage({ 
        type: 'error', 
        text: 'Error resetting progress: ' + (error.response?.data?.message || 'Unknown error') 
      });
    }
  };

  const calculatePercentage = (count, total) => {
    if (total === 0) return 0;
    return Math.round((count / total) * 100);
  };

  if (loading) {
    return (
      <div className="min-h-100 flex items-center justify-center">
        <div className="relative">
          <div className="w-16 h-16 rounded-full border-4 border-gray-200"></div>
          <div className="w-16 h-16 rounded-full border-4 border-emerald-500 border-t-transparent absolute top-0 left-0 animate-spin"></div>
        </div>
      </div>
    );
  }

  if (!progress) {
    return (
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center py-16 bg-white rounded-2xl border border-gray-200 shadow-sm"
      >
        <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <AlertOctagon className="text-gray-400" size={32} />
        </div>
        <h3 className="text-lg font-semibold text-gray-800 mb-2">No Data Available</h3>
        <p className="text-gray-500">Add some products to see your progress</p>
      </motion.div>
    );
  }

  const usedPercentage = calculatePercentage(progress.usedCount, progress.totalProducts);
  const wastedPercentage = calculatePercentage(progress.wastedCount, progress.totalProducts);
  const activeCount = progress.totalProducts - progress.usedCount - progress.wastedCount;
  const activePercentage = calculatePercentage(activeCount, progress.totalProducts);
  const totalUsedWasted = progress.usedCount + progress.wastedCount;
  const efficiencyScore = progress.usedCount > 0 
    ? Math.round((progress.usedCount / totalUsedWasted) * 100) 
    : 0;

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col md:flex-row md:items-center justify-between gap-4"
      >
        <div>
          <h1 className="text-3xl font-bold text-gray-800 flex items-center gap-3">
            <div className="p-2 bg-linear-to-br from-emerald-400 to-emerald-600 rounded-xl shadow-lg shadow-emerald-500/20">
              <BarChart3 className="text-white" size={24} />
            </div>
            Progress Dashboard
          </h1>
          <p className="text-gray-500 mt-2 ml-14">
            Track your food consumption and reduce waste
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button 
            onClick={() => setActiveTab('overview')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === 'overview' 
                ? 'bg-emerald-600 text-white shadow-md' 
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            Overview
          </button>
          <button 
            onClick={() => setActiveTab('details')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === 'details' 
                ? 'bg-emerald-600 text-white shadow-md' 
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            Details
          </button>
        </div>
      </motion.div>

      {/* Message Alert */}
      <AnimatePresence>
        {message.text && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className={`p-4 rounded-lg border flex items-center gap-3 ${
              message.type === 'success' 
                ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                : 'bg-rose-50 border-rose-200 text-rose-700'
            }`}
          >
            {message.type === 'success' ? (
              <CheckCircle size={20} />
            ) : (
              <AlertOctagon size={20} />
            )}
            <p className="text-sm">{message.text}</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Stats Cards */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="grid grid-cols-2 md:grid-cols-4 gap-4"
      >
        {/* Total Products */}
        <motion.div
          whileHover={{ y: -2 }}
          className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm hover:shadow-md transition-all"
        >
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-gray-500 mb-1">Total Products</p>
              <p className="text-3xl font-bold text-gray-800">{progress.totalProducts}</p>
            </div>
            <div className="bg-blue-50 p-3 rounded-lg">
              <Package className="text-blue-600" size={20} />
            </div>
          </div>
        </motion.div>

        {/* Used */}
        <motion.div
          whileHover={{ y: -2 }}
          className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm hover:shadow-md transition-all"
        >
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-gray-500 mb-1">Used</p>
              <p className="text-3xl font-bold text-emerald-600">{progress.usedCount}</p>
              <p className="text-xs text-gray-400 mt-1">{usedPercentage}% of total</p>
            </div>
            <div className="bg-emerald-50 p-3 rounded-lg">
              <CheckCircle className="text-emerald-600" size={20} />
            </div>
          </div>
        </motion.div>

        {/* Wasted */}
        <motion.div
          whileHover={{ y: -2 }}
          className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm hover:shadow-md transition-all"
        >
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-gray-500 mb-1">Wasted</p>
              <p className="text-3xl font-bold text-rose-600">{progress.wastedCount}</p>
              <p className="text-xs text-gray-400 mt-1">{wastedPercentage}% of total</p>
            </div>
            <div className="bg-rose-50 p-3 rounded-lg">
              <AlertTriangle className="text-rose-600" size={20} />
            </div>
          </div>
        </motion.div>

        {/* Active */}
        <motion.div
          whileHover={{ y: -2 }}
          className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm hover:shadow-md transition-all"
        >
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-gray-500 mb-1">Active</p>
              <p className="text-3xl font-bold text-amber-600">{activeCount}</p>
              <p className="text-xs text-gray-400 mt-1">{activePercentage}% of total</p>
            </div>
            <div className="bg-amber-50 p-3 rounded-lg">
              <Clock className="text-amber-600" size={20} />
            </div>
          </div>
        </motion.div>
      </motion.div>

      {/* Progress Bars Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm"
      >
        <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
          <Target size={18} className="text-emerald-600" />
          Usage Distribution
        </h3>

        <div className="space-y-4">
          {/* Used Progress Bar */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-emerald-500 rounded-full"></div>
                <span className="text-sm font-medium text-gray-700">Used</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-sm text-gray-600">{progress.usedCount} items</span>
                <span className="text-sm font-semibold text-emerald-600">{usedPercentage}%</span>
              </div>
            </div>
            <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${usedPercentage}%` }}
                transition={{ duration: 1, delay: 0.3 }}
                className="h-full bg-linear-to-r from-emerald-400 to-emerald-500 rounded-full"
              />
            </div>
          </div>

          {/* Wasted Progress Bar */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-rose-500 rounded-full"></div>
                <span className="text-sm font-medium text-gray-700">Wasted</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-sm text-gray-600">{progress.wastedCount} items</span>
                <span className="text-sm font-semibold text-rose-600">{wastedPercentage}%</span>
              </div>
            </div>
            <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${wastedPercentage}%` }}
                transition={{ duration: 1, delay: 0.4 }}
                className="h-full bg-linear-to-r from-rose-400 to-rose-500 rounded-full"
              />
            </div>
          </div>

          {/* Active Progress Bar */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-amber-500 rounded-full"></div>
                <span className="text-sm font-medium text-gray-700">Active</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-sm text-gray-600">{activeCount} items</span>
                <span className="text-sm font-semibold text-amber-600">{activePercentage}%</span>
              </div>
            </div>
            <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${activePercentage}%` }}
                transition={{ duration: 1, delay: 0.5 }}
                className="h-full bg-linear-to-r from-amber-400 to-amber-500 rounded-full"
              />
            </div>
          </div>
        </div>

        {/* Efficiency Score */}
        <div className="mt-6 p-5 bg-linear-to-br from-emerald-50 to-emerald-100/50 rounded-xl border border-emerald-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white rounded-lg shadow-sm">
                <Award className="text-emerald-600" size={24} />
              </div>
              <div>
                <p className="text-sm font-medium text-emerald-800">Efficiency Score</p>
                <p className="text-xs text-emerald-600 mt-0.5">
                  Based on used vs wasted ratio
                </p>
              </div>
            </div>
            <div className="text-3xl font-bold text-emerald-700">{efficiencyScore}%</div>
          </div>
        </div>
      </motion.div>

      {/* Details Tab Content */}
      <AnimatePresence mode="wait">
        {activeTab === 'details' && (
          <motion.div
            key="details"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-4"
          >
            {/* Statistics Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
                <p className="text-sm text-gray-500 mb-1">Usage Rate</p>
                <p className="text-2xl font-bold text-emerald-600">{usedPercentage}%</p>
                <p className="text-xs text-gray-400 mt-1">of total items</p>
              </div>
              
              <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
                <p className="text-sm text-gray-500 mb-1">Waste Rate</p>
                <p className="text-2xl font-bold text-rose-600">{wastedPercentage}%</p>
                <p className="text-xs text-gray-400 mt-1">of total items</p>
              </div>
              
              <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
                <p className="text-sm text-gray-500 mb-1">Active Rate</p>
                <p className="text-2xl font-bold text-amber-600">{activePercentage}%</p>
                <p className="text-xs text-gray-400 mt-1">currently fresh</p>
              </div>
              
              <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
                <p className="text-sm text-gray-500 mb-1">Used vs Wasted</p>
                <p className="text-2xl font-bold text-purple-600">
                  {progress.usedCount}:{progress.wastedCount}
                </p>
                <p className="text-xs text-gray-400 mt-1">ratio</p>
              </div>
            </div>

            {/* Impact Card */}
            <div className="bg-linear-to-br from-emerald-50 to-emerald-100/50 rounded-xl border border-emerald-200 p-6">
              <div className="flex items-start gap-3">
                <div className="p-2 bg-white rounded-lg shadow-sm">
                  <Leaf className="text-emerald-600" size={20} />
                </div>
                <div>
                  <h4 className="font-semibold text-emerald-800 mb-2">Food Saving Impact</h4>
                  <p className="text-sm text-emerald-700">
                    By using {progress.usedCount} items instead of wasting them, you've saved approximately{' '}
                    <span className="font-bold">${(progress.usedCount * 3.5).toFixed(2)}</span> and reduced food waste by{' '}
                    <span className="font-bold">{(progress.usedCount * 0.5).toFixed(1)}kg</span>.
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Reset Progress Section */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6 }}
        className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-amber-50 rounded-lg">
              <RefreshCw className="text-amber-600" size={18} />
            </div>
            <div>
              <h4 className="font-medium text-gray-800">Reset Progress</h4>
              <p className="text-sm text-gray-500 mt-0.5">
                This will mark all products as "active" again
              </p>
            </div>
          </div>
          
          {!showResetConfirm ? (
            <button
              onClick={() => setShowResetConfirm(true)}
              className="px-4 py-2 border border-amber-200 bg-amber-50 text-amber-700 rounded-lg hover:bg-amber-100 transition-colors text-sm font-medium"
            >
              Reset All
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">Are you sure?</span>
              <button
                onClick={resetProgress}
                className="px-3 py-1.5 bg-rose-600 text-white rounded-lg text-sm hover:bg-rose-700 transition-colors"
              >
                Yes
              </button>
              <button
                onClick={() => setShowResetConfirm(false)}
                className="px-3 py-1.5 bg-gray-200 text-gray-700 rounded-lg text-sm hover:bg-gray-300 transition-colors"
              >
                No
              </button>
            </div>
          )}
        </div>
      </motion.div>

      {/* Footer Note */}
      <p className="text-xs text-gray-400 text-center mt-4">
        Last updated: {new Date().toLocaleString()}
      </p>
    </div>
  );
}

export default Progress;