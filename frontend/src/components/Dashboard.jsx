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
const BG_DRK = "#19510A";
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

  useEffect(() => {
    const handler = (e) => {
      if (!e.target.closest("#bell-panel") && !e.target.closest("#bell-btn")) setShowBell(false);
      if (!e.target.closest("#user-panel") && !e.target.closest("#user-btn")) setShowUserMenu(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

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

      {/* ══════════════════════════════════════════════════════════════
          TOP NAV — Fixed: Dark green border radius for icons
      ══════════════════════════════════════════════════════════════ */}
      <header
        className="sticky top-0 z-50"
        style={{
          background: "linear-gradient(105deg, rgba(212,235,200,0.85) 0%, rgba(228,243,218,0.80) 60%, rgba(218,238,208,0.85) 100%)",
          backdropFilter: "blur(22px) saturate(150%)",
          WebkitBackdropFilter: "blur(22px) saturate(150%)",
          borderBottom: "1.5px solid rgba(255,255,255,0.50)",
          boxShadow: "0 1px 24px rgba(72,161,17,0.06)",
        }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">

          {/* Brand — dark green text */}
          <motion.div initial={{ opacity:0, x:-20 }} animate={{ opacity:1, x:0 }}
            className="flex items-center gap-3">
            {/* Leaf icon pill — dark green border radius 1px */}
            <div
              style={{
                width: 46,
                height: 46,
                borderRadius: "14px",
                background: "rgba(72,161,17,0.15)",
                border: "1.5px solid #48A111",
                backdropFilter: "blur(10px)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: "0 2px 10px rgba(72,161,17,0.15)",
              }}
            >
              <Leaf size={20} style={{ color: "#2d6610" }}/>
            </div>
            <div>
              <h1 style={{
                fontFamily: "'DM Sans', sans-serif",
                fontWeight: 800,
                fontSize: "1.15rem",
                color: "#1a2e10",
                letterSpacing: "-0.01em",
                lineHeight: 1.15,
              }}>
                FreshTrack
              </h1>
              <p style={{
                fontSize: "0.68rem",
                fontWeight: 500,
                color: "#4a6a36",
                letterSpacing: "0.015em",
              }}>
                Smart Food Manager
              </p>
            </div>
          </motion.div>

          {/* Right controls */}
          <div className="flex items-center gap-2">

            {/* ── Bell — dark green border radius 1px ── */}
            <div className="relative">
              <motion.button
                id="bell-btn"
                whileHover={{ scale:1.06 }} whileTap={{ scale:0.92 }}
                onClick={openBell}
                style={{
                  width: 46,
                  height: 46,
                  borderRadius: "14px",
                  background: showBell ? "rgba(72,161,17,0.25)" : "rgba(72,161,17,0.12)",
                  border: "1.5px solid #48A111",
                  backdropFilter: "blur(10px)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
                  position: "relative",
                }}
              >
                <Bell size={18} style={{ color: "#2d4a1a" }}/>
                {expiringItems.length > 0 && (
                  <span
                    style={{
                      position: "absolute",
                      top: -4,
                      right: -4,
                      minWidth: 16,
                      height: 16,
                      background: "#FF4500",
                      borderRadius: 8,
                      fontSize: 9,
                      fontWeight: 900,
                      color: "white",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      paddingInline: 3,
                    }}
                  >
                    {expiringItems.length > 9 ? "9+" : expiringItems.length}
                  </span>
                )}
                {expiringItems.length === 0 && (
                  <span
                    style={{
                      position: "absolute",
                      top: 6,
                      right: 6,
                      width: 7,
                      height: 7,
                      background: "#F59E0B",
                      borderRadius: "50%",
                    }}
                  />
                )}
              </motion.button>

              {/* Bell dropdown panel */}
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
                                <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: color }}/>
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

            {/* ── User avatar — dark green border radius 1px ── */}
            <div className="relative">
              <motion.button
                id="user-btn"
                whileHover={{ scale:1.04 }} whileTap={{ scale:0.95 }}
                onClick={() => setShowUserMenu(s => !s)}
                style={{
                  width: 46,
                  height: 46,
                  borderRadius: "14px",
                  background: showUserMenu ? "rgba(72,161,17,0.25)" : "rgba(72,161,17,0.12)",
                  border: "1.5px solid #48A111",
                  backdropFilter: "blur(10px)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
                  fontWeight: 800,
                  fontSize: "0.9rem",
                  color: "#1a2e10",
                }}
              >
                {user?.name?.charAt(0).toUpperCase()||"U"}
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

      {/* ══════════════════════════════════════════════════════════════
          BOTTOM NAV — Glassmorphism, full width, no bottom space
      ══════════════════════════════════════════════════════════════ */}
      <div
        className="sticky bottom-0 z-40"
        style={{ padding: "0" }}
      >
        <nav
          style={{
            background: "#19510A",
            backdropFilter: "blur(20px) saturate(180%)",
            WebkitBackdropFilter: "blur(20px) saturate(180%)",
            borderRadius: "0",
            boxShadow: "0 -2px 20px rgba(0,0,0,0.08), 0 1px 0 rgba(255,255,255,0.1) inset",
            borderTop: "1px solid rgba(255,255,255,0.2)",
            width: "100%",
          }}
        >
          <div className="w-full px-2">
            <div className="flex items-center justify-around" style={{ padding: "8px 0" }}>
              {navItems.map(item => {
                const Icon     = item.icon;
                const isActive = getActiveTab() === item.id;
                return (
                  <motion.button
                    key={item.id}
                    whileHover={{ y: -2 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => navigate(item.path)}
                    className="relative flex flex-col items-center transition-all"
                    style={{
                      borderRadius: 20,
                      padding: "8px 16px",
                      minWidth: 70,
                    }}
                  >
                    {/* Active pill — glassmorphism style */}
                    {isActive && (
                      <motion.div
                        layoutId="activeTabBg"
                        className="absolute inset-0"
                        style={{
                          borderRadius: 20,
                          background: "rgba(255,255,255,0.25)",
                          backdropFilter: "blur(8px)",
                          border: "1px solid rgba(255,255,255,0.3)",
                        }}
                        transition={{ type: "spring", stiffness: 340, damping: 30 }}
                      />
                    )}

                    {/* Icon */}
                    <div className="relative" style={{ marginBottom: 2 }}>
                      <Icon
                        size={22}
                        style={{
                          color: isActive ? "white" : "rgba(255,255,255,0.65)",
                          position: "relative",
                        }}
                      />
                    </div>

                    {/* Label */}
                    <span
                      style={{
                        position: "relative",
                        fontSize: "10px",
                        fontWeight: 700,
                        letterSpacing: "0.02em",
                        color: isActive ? "white" : "rgba(255,255,255,0.65)",
                        fontFamily: "'DM Sans', sans-serif",
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

    </div>
  );
}