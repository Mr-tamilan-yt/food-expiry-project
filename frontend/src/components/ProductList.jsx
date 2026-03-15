import React, { useState, useEffect } from "react";
import axios from "axios";
import {
  Package,
  Calendar,
  MapPin,
  Trash2,
  RotateCcw,
  CheckCircle,
  AlertTriangle,
  Tag,
  StickyNote,
  Filter,
  ChevronDown,
  MoreVertical,
  TrendingUp,
  Clock,
  AlertOctagon,
  Leaf,
  ShoppingBag,
  Utensils,
  Coffee,
  Wine,
  Home,
  Zap,
  RefreshCw,
  PieChart
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

function ProductList() {
  const [products, setProducts] = useState([]);
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState([]);
  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    expiringSoon: 0,
    expired: 0,
    used: 0,
    wasted: 0
  });
  const [sortBy, setSortBy] = useState("expiry");
  const [viewMode, setViewMode] = useState("grid");
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    fetchProducts();
  }, []);

  useEffect(() => {
    filterProducts();
  }, [products, selectedCategory, sortBy]);

  const fetchProducts = async () => {
    try {
      const response = await axios.get("/api/products");
      const fetchedProducts = response.data;
      setProducts(fetchedProducts);

      // Calculate categories
      const uniqueCategories = [...new Set(fetchedProducts.map(p => p.category))];
      setCategories(uniqueCategories);

      // Calculate stats
      const now = new Date();
      const newStats = {
        total: fetchedProducts.length,
        active: fetchedProducts.filter(p => p.status === "active").length,
        expiringSoon: fetchedProducts.filter(p => {
          if (p.status !== "active") return false;
          const days = getDaysUntilExpiry(p.expiryDate);
          return days >= 0 && days <= 3;
        }).length,
        expired: fetchedProducts.filter(p => {
          if (p.status !== "active") return false;
          const days = getDaysUntilExpiry(p.expiryDate);
          return days < 0;
        }).length,
        used: fetchedProducts.filter(p => p.status === "used").length,
        wasted: fetchedProducts.filter(p => p.status === "wasted").length
      };
      setStats(newStats);
    } catch (error) {
      console.error("Error fetching products:", error);
    } finally {
      setLoading(false);
    }
  };

  const filterProducts = () => {
    let filtered = [...products];

    // Category filter
    if (selectedCategory !== "all") {
      filtered = filtered.filter(p => p.category === selectedCategory);
    }

    // Sorting
    switch (sortBy) {
      case "expiry":
        filtered.sort((a, b) => {
          if (a.status !== "active" && b.status !== "active") return 0;
          if (a.status !== "active") return 1;
          if (b.status !== "active") return -1;
          return new Date(a.expiryDate) - new Date(b.expiryDate);
        });
        break;
      case "name":
        filtered.sort((a, b) => a.name.localeCompare(b.name));
        break;
      case "newest":
        filtered.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        break;
    }

    setFilteredProducts(filtered);
  };

  const updateProductStatus = async (productId, status) => {
    try {
      await axios.put(`/api/products/${productId}`, { status });
      fetchProducts();
    } catch (error) {
      console.error("Error updating product:", error);
    }
  };

  const deleteProduct = async (productId) => {
    if (window.confirm("Are you sure you want to delete this product?")) {
      try {
        await axios.delete(`/api/products/${productId}`);
        fetchProducts();
      } catch (error) {
        console.error("Error deleting product:", error);
      }
    }
  };

  const getDaysUntilExpiry = (expiryDate) => {
    const today = new Date();
    const expiry = new Date(expiryDate);
    const diffTime = expiry - today;
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  const getExpiryStatus = (product) => {
    if (product.status !== "active") return product.status;

    const days = getDaysUntilExpiry(product.expiryDate);

    if (days < 0) return "expired";
    if (days === 0) return "expires today";
    if (days <= 2) return `expires in ${days} days`;
    return "active";
  };

  const getStatusBadge = (product) => {
    if (product.status === "used") {
      return {
        label: "Used",
        color: "bg-emerald-50 text-emerald-700 border-emerald-200",
        icon: CheckCircle,
        iconColor: "text-emerald-500"
      };
    }

    if (product.status === "wasted") {
      return {
        label: "Wasted",
        color: "bg-rose-50 text-rose-700 border-rose-200",
        icon: AlertOctagon,
        iconColor: "text-rose-500"
      };
    }

    const days = getDaysUntilExpiry(product.expiryDate);

    if (days < 0) {
      return {
        label: "Expired",
        color: "bg-rose-50 text-rose-700 border-rose-200",
        icon: AlertOctagon,
        iconColor: "text-rose-500"
      };
    }
    
    if (days <= 2) {
      return {
        label: days === 0 ? "Expires Today" : `${days} days left`,
        color: "bg-amber-50 text-amber-700 border-amber-200",
        icon: Clock,
        iconColor: "text-amber-500"
      };
    }

    if (days <= 6) {
      return {
        label: `${days} days left`,
        color: "bg-orange-50 text-orange-700 border-orange-200",
        icon: Clock,
        iconColor: "text-orange-500"
      };
    }

    return {
      label: "Fresh",
      color: "bg-emerald-50 text-emerald-700 border-emerald-200",
      icon: Leaf,
      iconColor: "text-emerald-500"
    };
  };

  const getCategoryIcon = (category) => {
    const icons = {
      "Vegetables": Leaf,
      "Fruits": Leaf,
      "Meat": Utensils,
      "Dairy": Coffee,
      "Beverages": Wine,
      "Snacks": ShoppingBag,
      "Other": Package
    };
    return icons[category] || Package;
  };

  const StatCard = ({ icon: Icon, label, value, color, bgColor }) => (
    <motion.div
      whileHover={{ y: -2 }}
      className={`${bgColor} rounded-xl p-4 border ${color} shadow-sm`}
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-600">{label}</p>
          <p className="text-2xl font-bold mt-1">{value}</p>
        </div>
        <div className={`${color} p-3 rounded-lg bg-white/50`}>
          <Icon size={24} />
        </div>
      </div>
    </motion.div>
  );

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-100">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
          className="w-12 h-12 border-4 border-emerald-600 border-t-transparent rounded-full"
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold bg-linear-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">
            Food Inventory
          </h1>
          <p className="text-gray-500 mt-1 flex items-center gap-2">
            <Leaf size={16} className="text-emerald-500" />
            Track, manage, and reduce food waste
          </p>
        </div>
        
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => setShowFilters(!showFilters)}
          className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg hover:border-emerald-300 transition shadow-sm"
        >
          <Filter size={18} className="text-gray-500" />
          <span>Filters & Sort</span>
          <ChevronDown
            size={16}
            className={`transition-transform ${showFilters ? "rotate-180" : ""}`}
          />
        </motion.button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <StatCard
          icon={Package}
          label="Total Items"
          value={stats.total}
          color="text-blue-600"
          bgColor="bg-blue-50"
        />
        <StatCard
          icon={Leaf}
          label="Fresh"
          value={stats.active}
          color="text-emerald-600"
          bgColor="bg-emerald-50"
        />
        <StatCard
          icon={Clock}
          label="Expiring Soon"
          value={stats.expiringSoon}
          color="text-amber-600"
          bgColor="bg-amber-50"
        />
        <StatCard
          icon={AlertOctagon}
          label="Expired"
          value={stats.expired}
          color="text-rose-600"
          bgColor="bg-rose-50"
        />
        <StatCard
          icon={CheckCircle}
          label="Used"
          value={stats.used}
          color="text-emerald-600"
          bgColor="bg-emerald-50"
        />
        <StatCard
          icon={AlertTriangle}
          label="Wasted"
          value={stats.wasted}
          color="text-rose-600"
          bgColor="bg-rose-50"
        />
      </div>

      {/* Filters Panel */}
      <AnimatePresence>
        {showFilters && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden"
          >
            <div className="p-4">
              <div className="flex flex-wrap gap-6">
                {/* Categories */}
                <div className="flex-1 min-w-50">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Category
                  </label>
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => setSelectedCategory("all")}
                      className={`px-3 py-1.5 rounded-lg text-sm border transition ${
                        selectedCategory === "all"
                          ? "bg-emerald-600 text-white border-emerald-600"
                          : "bg-white border-gray-200 hover:border-emerald-400 text-gray-700"
                      }`}
                    >
                      All
                    </button>
                    {categories.map(category => (
                      <button
                        key={category}
                        onClick={() => setSelectedCategory(category)}
                        className={`px-3 py-1.5 rounded-lg text-sm border transition ${
                          selectedCategory === category
                            ? "bg-emerald-600 text-white border-emerald-600"
                            : "bg-white border-gray-200 hover:border-emerald-400 text-gray-700"
                        }`}
                      >
                        {category}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Sort By */}
                <div className="w-48">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Sort By
                  </label>
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                    className="w-full px-3 py-1.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="expiry">Expiry Date</option>
                    <option value="name">Name</option>
                    <option value="newest">Newest First</option>
                  </select>
                </div>

                {/* View Mode */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    View
                  </label>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setViewMode("grid")}
                      className={`p-2 rounded-lg border ${
                        viewMode === "grid"
                          ? "bg-emerald-600 text-white border-emerald-600"
                          : "bg-white border-gray-200 text-gray-700"
                      }`}
                    >
                      <Package size={18} />
                    </button>
                    <button
                      onClick={() => setViewMode("list")}
                      className={`p-2 rounded-lg border ${
                        viewMode === "list"
                          ? "bg-emerald-600 text-white border-emerald-600"
                          : "bg-white border-gray-200 text-gray-700"
                      }`}
                    >
                      <RefreshCw size={18} />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Empty State */}
      {filteredProducts.length === 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="bg-linear-to-b from-white to-gray-50 border border-gray-200 rounded-2xl p-12 text-center shadow-sm"
        >
          <div className="w-24 h-24 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <Package className="text-emerald-600" size={40} />
          </div>
          <h3 className="text-xl font-semibold text-gray-800 mb-2">No items found</h3>
          <p className="text-gray-500 max-w-md mx-auto">
            {selectedCategory === "all"
              ? "Start your food saving journey by adding your first item to track."
              : `No items found in ${selectedCategory}. Try adding some or select a different category.`}
          </p>
        </motion.div>
      )}

      {/* Product Grid/List */}
      <div className={viewMode === "grid" 
        ? "grid md:grid-cols-2 lg:grid-cols-3 gap-6" 
        : "space-y-4"
      }>
        {filteredProducts.map((product, index) => {
          const status = getStatusBadge(product);
          const CategoryIcon = getCategoryIcon(product.category);
          const daysUntil = getDaysUntilExpiry(product.expiryDate);
          const isExpiringSoon = daysUntil >= 0 && daysUntil <= 3;

          return (
            <motion.div
              key={product._id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              whileHover={{ y: -4 }}
              className={`bg-white border-2 rounded-xl shadow-sm hover:shadow-lg transition-all duration-200 ${
                isExpiringSoon && product.status === "active"
                  ? "border-amber-200 hover:border-amber-300"
                  : "border-gray-100 hover:border-emerald-200"
              } ${viewMode === "list" ? "flex" : ""}`}
            >
              {/* Card Content */}
              <div className={viewMode === "list" ? "flex-1 p-4" : "p-5"}>
                {/* Header */}
                <div className="flex justify-between items-start mb-3">
                  <div className="flex items-start gap-3">
                    <div className={`p-2 rounded-lg ${
                      isExpiringSoon && product.status === "active"
                        ? "bg-amber-100"
                        : "bg-emerald-100"
                    }`}>
                      <CategoryIcon className={
                        isExpiringSoon && product.status === "active"
                          ? "text-amber-600"
                          : "text-emerald-600"
                      } size={20} />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-800">
                        {product.name}
                      </h3>
                      <div className="flex items-center gap-1 text-xs text-gray-500 mt-0.5">
                        <Tag size={12} />
                        {product.category}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <span className={`text-xs px-2 py-1 rounded-full border flex items-center gap-1 ${status.color}`}>
                      <status.icon size={12} className={status.iconColor} />
                      {status.label}
                    </span>
                    <button className="text-gray-400 hover:text-gray-600">
                      <MoreVertical size={16} />
                    </button>
                  </div>
                </div>

                {/* Details */}
                <div className="space-y-2 text-sm text-gray-600 mb-4">
                  <div className="flex items-center gap-2">
                    <Calendar size={14} className="text-gray-400" />
                    <span className={isExpiringSoon && product.status === "active" ? "text-amber-600 font-medium" : ""}>
                      {new Date(product.expiryDate).toLocaleDateString('en-US', {
                        weekday: 'short',
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric'
                      })}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <MapPin size={14} className="text-gray-400" />
                    {product.location}
                  </div>

                  {product.notes && (
                    <div className="flex items-start gap-2">
                      <StickyNote size={14} className="text-gray-400 mt-0.5" />
                      <span className="text-gray-500 italic">"{product.notes}"</span>
                    </div>
                  )}
                </div>

                {/* Progress Bar for expiring items */}
                {product.status === "active" && daysUntil >= 0 && daysUntil <= 30 && (
                  <div className="mb-4">
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-gray-500">Freshness</span>
                      <span className={daysUntil <= 3 ? "text-amber-600 font-medium" : "text-emerald-600"}>
                        {Math.max(0, Math.min(100, (daysUntil / 30) * 100))}%
                      </span>
                    </div>
                    <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${Math.max(0, Math.min(100, (daysUntil / 30) * 100))}%` }}
                        className={`h-full rounded-full ${
                          daysUntil <= 3 ? "bg-amber-500" : "bg-emerald-500"
                        }`}
                      />
                    </div>
                  </div>
                )}

                {/* Actions */}
                <div className="flex flex-wrap gap-2 pt-2 border-t border-gray-100">
                  {product.status === "active" ? (
                    <>
                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => updateProductStatus(product._id, "used")}
                        className="flex items-center gap-1 text-xs bg-emerald-600 text-white px-3 py-1.5 rounded-lg hover:bg-emerald-700 transition shadow-sm"
                      >
                        <CheckCircle size={14} />
                        Used
                      </motion.button>

                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => updateProductStatus(product._id, "wasted")}
                        className="flex items-center gap-1 text-xs bg-amber-500 text-white px-3 py-1.5 rounded-lg hover:bg-amber-600 transition shadow-sm"
                      >
                        <AlertTriangle size={14} />
                        Wasted
                      </motion.button>
                    </>
                  ) : (
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => updateProductStatus(product._id, "active")}
                      className="flex items-center gap-1 text-xs bg-blue-600 text-white px-3 py-1.5 rounded-lg hover:bg-blue-700 transition shadow-sm"
                    >
                      <RotateCcw size={14} />
                      Reactivate
                    </motion.button>
                  )}

                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => deleteProduct(product._id)}
                    className="flex items-center gap-1 text-xs bg-rose-600 text-white px-3 py-1.5 rounded-lg hover:bg-rose-700 transition shadow-sm ml-auto"
                  >
                    <Trash2 size={14} />
                    Delete
                  </motion.button>
                </div>
              </div>

              {/* Left border accent for list view */}
              {viewMode === "list" && (
                <div className={`w-1 rounded-r-lg ${
                  isExpiringSoon && product.status === "active"
                    ? "bg-amber-500"
                    : product.status === "active"
                    ? "bg-emerald-500"
                    : product.status === "used"
                    ? "bg-emerald-500"
                    : "bg-rose-500"
                }`} />
              )}
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

export default ProductList;