import React, { useState, useEffect, useRef } from "react";
import { Routes, Route, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import ProductList from "./ProductList";
import AddProduct from "./AddProduct";
import Nutrition from "./Nutrition";
import Recipes from "./Recipes";
import axios from "axios";
import {
  LayoutList, PlusCircle, Leaf, ChefHat, LogOut,
  Bell, User, Settings, Salad, Clock, AlertTriangle,
  X, Calendar, MapPin, ChevronRight
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

// ── Premium Google Font injected once ─────────────────────────────────────────
const FONT_LINK = "https://fonts.googleapis.com/css2?family=Playfair+Display:wght@600;700;800&family=DM+Sans:wght@400;500;600;700&display=swap";

function injectFont() {
  if (document.getElementById("dashboard-fonts")) return;
  const link = document.createElement("link");
  link.id   = "dashboard-fonts";
  link.rel  = "stylesheet";
  link.href = FONT_LINK;
  document.head.appendChild(link);
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function getDays(expiryDate) {
  const today = new Date(); today.setHours(0,0,0,0);
  const exp   = new Date(expiryDate); exp.setHours(0,0,0,0);
  return Math.ceil((exp - today) / 86400000);
}

const BG     = "#48A111";
const BG_DRK = "#3a8a0d";
const PAGE   = "#DBE4C9";

export default function Dashboard() {
  const { user, logout } = useAuth();
  const navigate  = useNavigate();
  const location  = useLocation();
  const bellRef   = useRef(null);

  const [showUserMenu,   setShowUserMenu]   = useState(false);
  const [showBell,       setShowBell]       = useState(false);
  const [expiringItems,  setExpiringItems]  = useState([]);
  const [bellLoading,    setBellLoading]    = useState(false);

  useEffect(() => { injectFont(); }, []);

  // Close panels on outside click
  useEffect(() => {
    const handler = (e) => {
      if (!e.target.closest("#bell-panel") && !e.target.closest("#bell-btn")) setShowBell(false);
      if (!e.target.closest("#user-panel") && !e.target.closest("#user-btn")) setShowUserMenu(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Fetch expiring products when bell is opened
  const openBell = async () => {
    const next = !showBell;
    setShowBell(next);
    if (next && expiringItems.length === 0) {
      setBellLoading(true);
      try {
        const { data } = await axios.get("/api/products/expiring");
        setExpiringItems(data);
      } catch { setExpiringItems([]); }
      finally { setBellLoading(false); }
    }
  };

  const handleLogout = () => { logout(); navigate("/login"); };

  const getActiveTab = () => {
    const p = location.pathname;
    if (p.includes("/add"))       return "add";
    if (p.includes("/nutrition")) return "nutrition";
    if (p.includes("/recipes"))   return "recipes";
    return "list";
  };

  const navItems = [
    { id:"list",      icon:LayoutList,  label:"Inventory",  path:"/dashboard"           },
    { id:"add",       icon:PlusCircle,  label:"Add Item",   path:"/dashboard/add"       },
    { id:"nutrition", icon:Salad,       label:"Nutrition",  path:"/dashboard/nutrition" },
    { id:"recipes",   icon:ChefHat,     label:"Recipes",    path:"/dashboard/recipes"   },
  ];

  // urgency colour per item
  const urgencyColor = (days) =>
    days < 0  ? "#FF0000" :
    days <= 2 ? "#FF4500" :
    days <= 4 ? "#F97316" :
                "#D97706";

  const urgencyBg = (days) =>
    days < 0  ? "#FFA27F66" :
    days <= 2 ? "#FDE7B3"   :
                "#FEF3C7";

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: PAGE, fontFamily: "'DM Sans', sans-serif" }}>

      {/* ── Top Nav ── */}
      <header
        className="sticky top-0 z-50 shadow-lg"
        style={{ background: `linear-gradient(135deg, ${BG} 0%, ${BG_DRK} 100%)` }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">

          {/* Brand */}
          <motion.div initial={{ opacity:0, x:-20 }} animate={{ opacity:1, x:0 }}
            className="flex items-center gap-3">
            <div className="relative">
              <div className="absolute inset-0 bg-white/30 blur-xl rounded-full"/>
              <div className="relative bg-white/20 backdrop-blur-sm p-2 rounded-xl border border-white/20">
                <Leaf className="text-white w-5 h-5"/>
              </div>
            </div>
            <div>
              <h1 style={{ fontFamily:"'Playfair Display', serif", fontWeight:800, fontSize:"1.2rem", color:"white", letterSpacing:"-0.01em", lineHeight:1.1 }}>
                FreshTrack
              </h1>
              <p className="text-xs font-medium" style={{ color:"rgba(255,255,255,0.75)", letterSpacing:"0.04em" }}>
                Smart Food Manager
              </p>
            </div>
          </motion.div>

          {/* Right controls */}
          <div className="flex items-center gap-2">

            {/* ── Bell button ── */}
            <div className="relative">
              <motion.button
                id="bell-btn"
                whileHover={{ scale:1.08 }} whileTap={{ scale:0.93 }}
                onClick={openBell}
                className="relative p-2.5 rounded-xl border border-white/20 backdrop-blur-sm transition-colors"
                style={{ background: showBell ? "rgba(255,255,255,0.3)" : "rgba(255,255,255,0.15)" }}
              >
                <Bell size={18} className="text-white"/>
                {/* Live badge — re-fetched on open, show dot always as reminder */}
                {expiringItems.length > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] flex items-center justify-center rounded-full text-[10px] font-black text-white px-1"
                    style={{ background:"#FF4500" }}>
                    {expiringItems.length > 9 ? "9+" : expiringItems.length}
                  </span>
                )}
                {expiringItems.length === 0 && (
                  <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2"
                    style={{ background:"#FFD700", borderColor: BG }}/>
                )}
              </motion.button>

              {/* ── Bell dropdown panel ── */}
              <AnimatePresence>
                {showBell && (
                  <motion.div
                    id="bell-panel"
                    initial={{ opacity:0, y:8, scale:0.97 }}
                    animate={{ opacity:1, y:0, scale:1   }}
                    exit={{    opacity:0, y:8, scale:0.97 }}
                    transition={{ type:"spring", stiffness:300, damping:28 }}
                    className="absolute right-0 mt-3 w-80 rounded-2xl shadow-2xl z-50 overflow-hidden"
                    style={{ background:"white", border:`1.5px solid ${BG}33` }}
                  >
                    {/* Panel header */}
                    <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100"
                      style={{ background:`linear-gradient(135deg, ${BG}18 0%, ${BG}08 100%)` }}>
                      <div className="flex items-center gap-2">
                        <Clock size={16} style={{ color: BG }}/>
                        <span className="font-bold text-sm" style={{ color: BG, fontFamily:"'DM Sans', sans-serif" }}>
                          Expiring Soon
                        </span>
                      </div>
                      <button onClick={() => setShowBell(false)}
                        className="p-1 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors">
                        <X size={14}/>
                      </button>
                    </div>

                    {/* Panel body */}
                    <div className="max-h-80 overflow-y-auto">
                      {bellLoading ? (
                        <div className="flex flex-col items-center justify-center py-8 gap-2">
                          <div className="w-8 h-8 rounded-full border-3 border-gray-200 animate-spin"
                            style={{ borderTopColor: BG, borderWidth:3 }}/>
                          <p className="text-xs text-gray-400 font-medium">Loading…</p>
                        </div>
                      ) : expiringItems.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-10 gap-2">
                          <div className="w-12 h-12 rounded-2xl flex items-center justify-center"
                            style={{ background:`${BG}15` }}>
                            <Leaf size={22} style={{ color: BG }}/>
                          </div>
                          <p className="text-sm font-semibold text-gray-700">All items are fresh!</p>
                          <p className="text-xs text-gray-400">Nothing expiring in the next 6 days</p>
                        </div>
                      ) : (
                        <div className="p-2 space-y-1.5">
                          {expiringItems.map((item, i) => {
                            const days  = getDays(item.expiryDate);
                            const color = urgencyColor(days);
                            const bg    = urgencyBg(days);
                            return (
                              <motion.div
                                key={item._id}
                                initial={{ opacity:0, x:-10 }}
                                animate={{ opacity:1, x:0 }}
                                transition={{ delay: i * 0.04 }}
                                className="flex items-center gap-3 px-3 py-2.5 rounded-xl"
                                style={{ backgroundColor: bg }}
                              >
                                {/* Urgency dot */}
                                <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: color }}/>

                                {/* Item info */}
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-bold text-gray-900 truncate">{item.name}</p>
                                  <div className="flex items-center gap-3 mt-0.5">
                                    <span className="flex items-center gap-1 text-[11px] font-medium text-gray-500">
                                      <Calendar size={10}/>{new Date(item.expiryDate).toLocaleDateString("en-US",{month:"short",day:"numeric"})}
                                    </span>
                                    {item.location && (
                                      <span className="flex items-center gap-1 text-[11px] font-medium text-gray-500">
                                        <MapPin size={10}/>{item.location}
                                      </span>
                                    )}
                                  </div>
                                </div>

                                {/* Days badge */}
                                <span className="shrink-0 text-[11px] font-black px-2 py-1 rounded-full text-white"
                                  style={{ backgroundColor: color }}>
                                  {days < 0  ? `${Math.abs(days)}d ago` :
                                   days === 0 ? "Today!" :
                                               `${days}d`}
                                </span>
                              </motion.div>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    {/* Footer link */}
                    {expiringItems.length > 0 && (
                      <div className="px-4 py-2.5 border-t border-gray-100">
                        <button
                          onClick={() => { setShowBell(false); navigate("/dashboard"); }}
                          className="w-full flex items-center justify-center gap-1.5 text-xs font-bold py-2 rounded-xl transition-all"
                          style={{ color: BG }}
                        >
                          View all in Inventory <ChevronRight size={13}/>
                        </button>
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* ── User menu ── */}
            <div className="relative">
              <motion.button
                id="user-btn"
                whileHover={{ scale:1.02 }} whileTap={{ scale:0.98 }}
                onClick={() => setShowUserMenu(s => !s)}
                className="flex items-center gap-2.5 p-1.5 pr-3 rounded-xl border border-white/20 hover:border-white/40 transition-all"
                style={{ background:"rgba(255,255,255,0.15)" }}
              >
                <div className="w-8 h-8 rounded-lg flex items-center justify-center font-black text-sm"
                  style={{ background:"rgba(255,255,255,0.25)", color:"white" }}>
                  {user?.name?.charAt(0).toUpperCase()||"U"}
                </div>
                <div className="hidden sm:block text-left">
                  <p className="text-sm font-bold text-white leading-tight">{user?.name||"User"}</p>
                  <p className="text-[11px] font-medium" style={{ color:"rgba(255,255,255,0.7)" }}>{user?.email||""}</p>
                </div>
              </motion.button>

              <AnimatePresence>
                {showUserMenu && (
                  <motion.div
                    id="user-panel"
                    initial={{ opacity:0, y:8, scale:0.97 }}
                    animate={{ opacity:1, y:0, scale:1   }}
                    exit={{    opacity:0, y:8, scale:0.97 }}
                    className="absolute right-0 mt-2 w-52 bg-white rounded-2xl shadow-2xl border border-gray-100 py-1.5 z-50 overflow-hidden"
                  >
                    {/* User header in dropdown */}
                    <div className="px-4 py-3 border-b border-gray-100" style={{ background:`${BG}10` }}>
                      <p className="text-sm font-bold text-gray-800">{user?.name||"User"}</p>
                      <p className="text-xs text-gray-400 truncate">{user?.email||""}</p>
                    </div>
                    <div className="py-1">
                      <button className="w-full px-4 py-2.5 text-left text-sm font-medium text-gray-700 hover:bg-gray-50 flex items-center gap-2.5 transition-colors">
                        <User size={14} style={{ color: BG }}/> Profile
                      </button>
                      <button className="w-full px-4 py-2.5 text-left text-sm font-medium text-gray-700 hover:bg-gray-50 flex items-center gap-2.5 transition-colors">
                        <Settings size={14} style={{ color: BG }}/> Settings
                      </button>
                      <div className="border-t border-gray-100 my-1"/>
                      <button onClick={handleLogout}
                        className="w-full px-4 py-2.5 text-left text-sm font-bold text-red-600 hover:bg-red-50 flex items-center gap-2.5 transition-colors">
                        <LogOut size={14}/> Logout
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </header>

      {/* ── Main content ── */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6">
        <AnimatePresence mode="wait">
          <motion.div
            key={location.pathname}
            initial={{ opacity:0, y:18 }}
            animate={{ opacity:1, y:0  }}
            exit={{    opacity:0, y:-18 }}
            transition={{ duration:0.25, ease:"easeInOut" }}
            className="rounded-2xl p-5"
            style={{ backgroundColor: PAGE }}
          >
            <Routes>
              <Route path="/"          element={<ProductList />}/>
              <Route path="/add"       element={<AddProduct  />}/>
              <Route path="/nutrition" element={<Nutrition   />}/>
              <Route path="/recipes"   element={<Recipes     />}/>
            </Routes>
          </motion.div>
        </AnimatePresence>
      </main>

      {/* ── Bottom Nav ── */}
      <nav
        className="sticky bottom-0 z-40"
        style={{
          background: `linear-gradient(135deg, ${BG} 0%, ${BG_DRK} 100%)`,
          boxShadow: `0 -4px 24px ${BG}40`
        }}
      >
        {/* Top highlight line */}
        <div className="h-px" style={{ background:"rgba(255,255,255,0.25)" }}/>

        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center justify-around py-1">
            {navItems.map(item => {
              const Icon     = item.icon;
              const isActive = getActiveTab() === item.id;
              return (
                <motion.button
                  key={item.id}
                  whileHover={{ y:-3 }}
                  whileTap={{ scale:0.93 }}
                  onClick={() => navigate(item.path)}
                  className="relative flex flex-col items-center py-2.5 px-5 rounded-2xl transition-all"
                >
                  {/* Active pill background */}
                  {isActive && (
                    <motion.div
                      layoutId="activeTabBg"
                      className="absolute inset-0 rounded-2xl"
                      style={{ background:"rgba(255,255,255,0.22)", backdropFilter:"blur(8px)" }}
                      transition={{ type:"spring", stiffness:320, damping:28 }}
                    />
                  )}

                  {/* Icon */}
                  <div className="relative mb-0.5">
                    <Icon
                      size={22}
                      className="relative"
                      style={{ color: isActive ? "white" : "rgba(255,255,255,0.55)" }}
                    />
                    {/* Active dot under icon */}
                    {isActive && (
                      <motion.span
                        initial={{ scale:0, opacity:0 }}
                        animate={{ scale:1, opacity:1 }}
                        className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-white"
                      />
                    )}
                  </div>

                  {/* Label */}
                  <span
                    className="relative text-[11px] font-bold tracking-wide"
                    style={{
                      color: isActive ? "white" : "rgba(255,255,255,0.55)",
                      fontFamily:"'DM Sans', sans-serif",
                      letterSpacing:"0.03em"
                    }}
                  >
                    {item.label}
                  </span>
                </motion.button>
              );
            })}
          </div>
        </div>
      </nav>
    </div>
  );
}