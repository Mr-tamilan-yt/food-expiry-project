import React, { useState, useEffect } from "react";
import { Routes, Route, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import ProductList from "./ProductList";
import AddProduct from "./AddProduct";
import Progress from "./Progress";
import Recipes from "./Recipes";

import {
  LayoutList,
  PlusCircle,
  BarChart3,
  ChefHat,
  LogOut,
  Leaf,
  Bell,
  User,
  Settings
} from "lucide-react";

import { motion, AnimatePresence } from "framer-motion";

function Dashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [notifications, setNotifications] = useState([]);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [unreadNotifications, setUnreadNotifications] = useState(0);

  useEffect(() => {
    const checkExpiringProducts = () => {
      console.log("Checking for expiring products...");
    };

    const interval = setInterval(checkExpiringProducts, 60000);
    return () => clearInterval(interval);
  }, []);

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const getActiveTab = () => {
    const path = location.pathname;
    if (path.includes("/add")) return "add";
    if (path.includes("/progress")) return "progress";
    if (path.includes("/recipes")) return "recipes";
    return "list";
  };

  const navItems = [
    { id: "list", icon: LayoutList, label: "Inventory", path: "/dashboard" },
    { id: "add", icon: PlusCircle, label: "Add Item", path: "/dashboard/add" },
    { id: "progress", icon: BarChart3, label: "Analytics", path: "/dashboard/progress" },
    { id: "recipes", icon: ChefHat, label: "Recipes", path: "/dashboard/recipes" }
  ];

  return (
    <div className="min-h-screen flex flex-col bg-linear-to-br from-emerald-50/30 to-teal-50/30">
      
      {/* Top Navigation - Green Theme */}
      <header className="bg-linear-to-r from-emerald-600 to-teal-600 sticky top-0 z-50 shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">

          {/* Logo & Brand */}
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex items-center gap-3"
          >
            <div className="relative">
              <div className="absolute inset-0 bg-white/30 blur-lg rounded-full"></div>
              <div className="relative bg-white/20 backdrop-blur-sm p-2 rounded-xl">
                <Leaf className="text-white w-5 h-5" />
              </div>
            </div>
            <div>
              <h1 className="text-lg font-bold text-white">
                FreshTrack
              </h1>
              <p className="text-xs text-emerald-100">Smart Food Manager</p>
            </div>
          </motion.div>

          {/* Right Section */}
          <div className="flex items-center gap-3">
            
            {/* Notifications */}
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="relative p-2 text-white/90 hover:text-white hover:bg-white/20 rounded-lg transition-colors"
            >
              <Bell size={18} />
              {unreadNotifications > 0 && (
                <span className="absolute top-1 right-1 w-2 h-2 bg-amber-400 rounded-full ring-2 ring-emerald-600"></span>
              )}
            </motion.button>

            {/* User Menu */}
            <div className="relative">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="flex items-center gap-3 p-1.5 pr-3 rounded-lg hover:bg-white/20 transition-colors"
              >
                <div className="w-8 h-8 bg-white/20 backdrop-blur-sm rounded-lg flex items-center justify-center">
                  <span className="text-white font-semibold text-sm">
                    {user?.name?.charAt(0) || 'U'}
                  </span>
                </div>
                <div className="hidden sm:block text-left">
                  <p className="text-sm font-medium text-white">{user?.name || 'User'}</p>
                  <p className="text-xs text-emerald-100">{user?.email || ''}</p>
                </div>
              </motion.button>

              {/* User Dropdown */}
              <AnimatePresence>
                {showUserMenu && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                    className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-xl border border-emerald-100 py-1 z-50"
                  >
                    <button className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-emerald-50 flex items-center gap-2">
                      <User size={14} className="text-emerald-600" />
                      Profile
                    </button>
                    <button className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-emerald-50 flex items-center gap-2">
                      <Settings size={14} className="text-emerald-600" />
                      Settings
                    </button>
                    <div className="border-t border-emerald-100 my-1"></div>
                    <button
                      onClick={handleLogout}
                      className="w-full px-4 py-2 text-left text-sm text-rose-600 hover:bg-rose-50 flex items-center gap-2"
                    >
                      <LogOut size={14} />
                      Logout
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-8">
        
        {/* Page Content with Animation */}
        <motion.div
          key={location.pathname}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.3, ease: "easeInOut" }}
          className="bg-white/80 backdrop-blur-sm rounded-2xl border border-emerald-100/60 p-6 shadow-xl shadow-emerald-900/5"
        >
          <Routes>
            <Route path="/" element={<ProductList />} />
            <Route path="/add" element={<AddProduct />} />
            <Route path="/progress" element={<Progress />} />
            <Route path="/recipes" element={<Recipes />} />
          </Routes>
        </motion.div>

      </main>

      {/* Bottom Navigation - Green Theme */}
      <nav className="bg-linear-to-r from-emerald-600 to-teal-600 sticky bottom-0 z-40 shadow-lg">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center justify-around py-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = getActiveTab() === item.id;
              
              return (
                <motion.button
                  key={item.id}
                  whileHover={{ y: -2 }}
                  whileTap={{ scale: 0.95 }}
                  className={`relative flex flex-col items-center py-3 px-4 rounded-xl transition-all ${
                    isActive 
                      ? "text-white" 
                      : "text-emerald-200 hover:text-white"
                  }`}
                  onClick={() => navigate(item.path)}
                >
                  {isActive && (
                    <motion.div
                      layoutId="activeTab"
                      className="absolute inset-0 bg-white/20 backdrop-blur-sm rounded-xl"
                      transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                    />
                  )}
                  <div className="relative">
                    <Icon size={20} />
                    {isActive && (
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 bg-white rounded-full"
                      />
                    )}
                  </div>
                  <span className={`relative text-xs mt-1 font-medium ${
                    isActive ? "text-white" : "text-emerald-200"
                  }`}>
                    {item.label}
                  </span>
                </motion.button>
              );
            })}
          </div>
        </div>
      </nav>

      {/* Notifications Toast */}
      <div className="fixed top-20 right-6 space-y-3 z-50">
        <AnimatePresence>
          {notifications.map((notification, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, x: 100 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 100 }}
              className="bg-white border-l-4 border-emerald-500 shadow-lg rounded-lg overflow-hidden"
            >
              <div className="flex items-center gap-3 px-4 py-3">
                <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
                <p className="text-sm text-gray-700">{notification.message}</p>
                <button className="ml-auto text-gray-400 hover:text-gray-600">
                  <span className="text-lg">&times;</span>
                </button>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

    </div>
  );
}

export default Dashboard;