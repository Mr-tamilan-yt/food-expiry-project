import React, { useState, useEffect, useRef, useCallback } from "react";
import axios from "axios";
import {
  Package, Calendar, MapPin, Trash2, RotateCcw, CheckCircle,
  AlertTriangle, Tag, StickyNote, ChevronDown,
  AlertOctagon, Leaf, RefreshCw, Search, X,
  Edit2, Save, XCircle, ShieldCheck,
  Clock as ClockIcon, AlertCircle, Info, Zap
} from "lucide-react";
import { motion, AnimatePresence, useInView } from "framer-motion";

// ─────────────────────────────────────────────────────────────────────────────
//  MOBILE DETECTION
// ─────────────────────────────────────────────────────────────────────────────
function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);
  return isMobile;
}

// ─────────────────────────────────────────────────────────────────────────────
//  ANIMATED ITEM
// ─────────────────────────────────────────────────────────────────────────────
const AnimatedItem = ({ children, index, isMobile }) => {
  const ref    = useRef(null);
  const inView = useInView(ref, { amount: 0.12, triggerOnce: true });

  if (!isMobile) {
    return (
      <motion.div
        ref={ref}
        initial={{ opacity: 0, y: 18, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ delay: index * 0.03, duration: 0.22, ease: [0.25, 0.46, 0.45, 0.94] }}
        whileHover={{ y: -5, scale: 1.016, transition: { type: "spring", stiffness: 520, damping: 24 } }}
        style={{ willChange: "transform" }}
      >
        {children}
      </motion.div>
    );
  }
  return (
    <motion.div
      ref={ref}
      initial={{ scale: 0.75, opacity: 0 }}
      animate={inView ? { scale: 1, opacity: 1 } : { scale: 0.75, opacity: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.16, ease: "easeOut" }}
      style={{ willChange: "transform, opacity" }}
    >
      {children}
    </motion.div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
//  REAL-WORLD FRESHNESS ENGINE — FDA-based shelf life caps
// ─────────────────────────────────────────────────────────────────────────────
const SHELF_LIFE = {
  Dairy:      { Refrigerator:7,   Freezer:90,  Pantry:0,   Cabinet:0,   Other:3   },
  Meat:       { Refrigerator:3,   Freezer:120, Pantry:0,   Cabinet:0,   Other:1   },
  Vegetables: { Refrigerator:10,  Freezer:180, Pantry:5,   Cabinet:5,   Other:4   },
  Fruits:     { Refrigerator:10,  Freezer:180, Pantry:5,   Cabinet:5,   Other:4   },
  Snacks:     { Refrigerator:180, Freezer:365, Pantry:180, Cabinet:180, Other:90  },
  Grains:     { Refrigerator:365, Freezer:730, Pantry:365, Cabinet:365, Other:180 },
  Beverages:  { Refrigerator:14,  Freezer:90,  Pantry:180, Cabinet:180, Other:7   },
  Frozen:     { Refrigerator:3,   Freezer:180, Pantry:0,   Cabinet:0,   Other:1   },
  Other:      { Refrigerator:14,  Freezer:180, Pantry:30,  Cabinet:30,  Other:14  },
};

const WARN_WINDOW = {
  Dairy:3, Meat:2, Vegetables:3, Fruits:3,
  Snacks:14, Grains:14, Beverages:5, Frozen:7, Other:5,
};

const AFTER_EXPIRY = {
  Dairy:"risky", Meat:"risky", Vegetables:"check", Fruits:"check",
  Snacks:"probably_safe", Grains:"probably_safe", Beverages:"check",
  Frozen:"quality_reduce", Other:"check",
};

const UNSAFE_COMBOS = [
  { category:"Meat",  location:"Pantry",   msg:"Unsafe storage — meat in pantry is dangerous. Move to refrigerator or freezer immediately." },
  { category:"Meat",  location:"Cabinet",  msg:"Meat must not be stored in a cabinet. Refrigerate or freeze immediately." },
  { category:"Dairy", location:"Pantry",   msg:"Dairy requires refrigeration. Move to fridge immediately to prevent spoilage." },
  { category:"Dairy", location:"Cabinet",  msg:"Dairy must be refrigerated. Move to fridge immediately." },
  { category:"Frozen",location:"Pantry",   msg:"Frozen items cannot be stored in pantry. Freeze or refrigerate immediately." },
  { category:"Frozen",location:"Cabinet",  msg:"Frozen items cannot be stored in cabinet. Freeze or refrigerate immediately." },
];

function getUnsafeWarning(category, location) {
  return UNSAFE_COMBOS.find(c => c.category === category && c.location === location) || null;
}
function getMaxShelfDays(category, location) {
  return SHELF_LIFE[category]?.[location] ?? SHELF_LIFE["Other"]?.[location] ?? 14;
}
function getWarnWindow(category) { return WARN_WINDOW[category] ?? 5; }
function getAfterExpiryStatus(category, location) {
  if (location === "Freezer") return "quality_reduce";
  return AFTER_EXPIRY[category] ?? "check";
}
function getDaysUntilExpiry(expiryDate) {
  const today = new Date(); today.setHours(0,0,0,0);
  const exp   = new Date(expiryDate); exp.setHours(0,0,0,0);
  return Math.ceil((exp - today) / 86400000);
}

function getRealWorldWarning(category, location, days) {
  if (days < 0) return null;
  const maxSafe = getMaxShelfDays(category, location);
  if (maxSafe === 0 || days <= maxSafe) return null;
  const msgs = {
    Dairy:      `Dairy in a ${location} is typically safe for only ${maxSafe} days. Inspect before use regardless of the label date.`,
    Meat:       `Raw meat in a ${location} is only safe for ${maxSafe} days. The printed date doesn't override this.`,
    Vegetables: `Vegetables in a ${location} typically last ${maxSafe} days. Check freshness now.`,
    Fruits:     `Fruits in a ${location} typically last ${maxSafe} days. Check for spoilage.`,
    Frozen:     `Thawed frozen items in a ${location} should be used within ${maxSafe} days.`,
    Beverages:  `Opened beverages in a ${location} are safe for about ${maxSafe} days.`,
  };
  return msgs[category] || `${category} in ${location} is typically safe for only ${maxSafe} days — verify actual condition.`;
}

function getProductBucket(p) {
  if (p.status === "used")   return "used";
  if (p.status === "wasted") return "wasted";
  const days    = getDaysUntilExpiry(p.expiryDate);
  const maxSafe = getMaxShelfDays(p.category, p.location);
  const warnWin = getWarnWindow(p.category);
  if (days < 0)                            return "expired";
  if (maxSafe > 0 && days > maxSafe)       return "expiringSoon";
  if (days <= warnWin)                     return "expiringSoon";
  return "fresh";
}

function getFreshnessPct(days, category, location) {
  if (days < 0) return 0;
  const maxSafe = getMaxShelfDays(category, location);
  const warnWin = getWarnWindow(category);
  if (maxSafe > 0 && days > maxSafe)
    return Math.max(15, Math.min(40, Math.round(40 - ((days - maxSafe) / maxSafe) * 20)));
  if (days <= warnWin) return Math.round((days / warnWin) * 100);
  const freshRange = maxSafe - warnWin;
  if (freshRange <= 0) return 100;
  return Math.min(Math.round(((days - warnWin) / freshRange) * 20 + 80), 100);
}

function getBarColor(pct, bucket) {
  if (bucket === "expiringSoon") return "#FF9E00";
  if (pct <= 10) return "#EF4444";
  if (pct <= 20) return "#F97316";
  if (pct <= 30) return "#FB923C";
  if (pct <= 50) return "#FBBF24";
  if (pct <= 70) return "#84CC16";
  if (pct <= 85) return "#48A111";
  return "#3a8a0d";
}
function getBarLabelColor(pct, bucket) {
  if (bucket === "expiringSoon") return "#D97706";
  if (pct <= 10) return "#DC2626";
  if (pct <= 30) return "#EA580C";
  if (pct <= 50) return "#D97706";
  return "#48A111";
}
function getSmartStatusLabel(p, days, bucket) {
  if (bucket === "used")   return { label:"Used",         color:"#0369A1", icon: ShieldCheck  };
  if (bucket === "wasted") return { label:"Wasted",       color:"#64748B", icon: AlertTriangle };
  if (bucket === "expired") {
    const s = getAfterExpiryStatus(p.category, p.location);
    if (s === "quality_reduce") return { label:"Quality ↓",     color:"#7C3AED", icon: AlertCircle  };
    if (s === "probably_safe")  return { label:"Check Quality", color:"#D97706", icon: Info         };
    return                             { label:"Risky",         color:"#DC2626", icon: AlertOctagon };
  }
  if (bucket === "expiringSoon") {
    const maxSafe = getMaxShelfDays(p.category, p.location);
    if (maxSafe > 0 && days > maxSafe) return { label:"Check Now",      color:"#DC2626", icon: AlertOctagon };
    if (days <= 1)                     return { label:"Expires Today!",  color:"#DC2626", icon: ClockIcon    };
    return                                    { label:`${days}d left`,   color:"#D97706", icon: ClockIcon    };
  }
  return { label:"Fresh", color:"#48A111", icon: Leaf };
}

const BUCKET_ORDER = { expiringSoon:0, fresh:1, expired:2, used:3, wasted:4 };

// ─────────────────────────────────────────────────────────────────────────────
//  VISUAL CONFIG
// ─────────────────────────────────────────────────────────────────────────────
const BUCKET = {
  fresh:        { stripe:"from-[#48A111] to-[#3a8a0d]", cardBgHex:"#CBF3BB", border:"border-[#48A111]/40", ring:"ring-[#48A111]/20", glow:"shadow-[#48A111]/10", corner:"rounded-3xl",  icon: Leaf         },
  expiringSoon: { stripe:"from-amber-400 to-orange-400", cardBgHex:"#FDE7B3", border:"border-amber-300",    ring:"ring-amber-100",    glow:"shadow-amber-100",    corner:"rounded-2xl",  icon: ClockIcon    },
  expired:      { stripe:"from-rose-500 to-red-500",     cardBgHex:"#FFA27F66",border:"border-rose-300",     ring:"ring-rose-100",     glow:"shadow-rose-100",     corner:"rounded-xl",   icon: AlertOctagon },
  used:         { stripe:"from-sky-400 to-blue-500",     cardBgHex:"#f0f9ff",  border:"border-sky-200",      ring:"ring-sky-100",      glow:"shadow-sky-100",      corner:"rounded-3xl",  icon: ShieldCheck  },
  wasted:       { stripe:"from-slate-400 to-gray-500",   cardBgHex:"#f1f5f9",  border:"border-slate-300",    ring:"ring-slate-100",    glow:"shadow-slate-100",    corner:"rounded-2xl",  icon: AlertTriangle},
};

const FILTERS = [
  { key:"fresh",        label:"Fresh",         icon: Leaf,         color:"emerald" },
  { key:"expiringSoon", label:"Expiring Soon", icon: ClockIcon,    color:"amber"   },
  { key:"expired",      label:"Expired",       icon: AlertOctagon, color:"rose"    },
  { key:"used",         label:"Used",          icon: ShieldCheck,  color:"teal"    },
];

const COLOR_MAP = {
  emerald: { card:"bg-[#CBF3BB] border-[#48A111]",  text:"text-[#48A111]", active:"bg-[#48A111] text-white border-[#2d6b0a]", num:"text-[#2d6b0a]" },
  amber:   { card:"bg-[#FDE7B3] border-amber-500",  text:"text-amber-800", active:"bg-amber-500 text-white border-amber-700", num:"text-amber-900" },
  rose:    { card:"bg-[#FFA27F]/50 border-red-500", text:"text-red-800",   active:"bg-red-600 text-white border-red-700",     num:"text-red-900"   },
  teal:    { card:"bg-sky-100 border-sky-500",      text:"text-sky-800",   active:"bg-sky-600 text-white border-sky-700",     num:"text-sky-900"   },
};

const CATEGORIES = ["Dairy","Vegetables","Fruits","Meat","Grains","Beverages","Snacks","Frozen","Other"];
const LOCATIONS  = ["Pantry","Refrigerator","Freezer","Cabinet","Other"];

const G = "#48A111";

// ─────────────────────────────────────────────────────────────────────────────
//  LONG-PRESS HOOK
// ─────────────────────────────────────────────────────────────────────────────
function useLongPress(onLongPress, onClick, { delay = 500 } = {}) {
  const timerRef = useRef(null);
  const isLong   = useRef(false);
  const startPos = useRef({ x: 0, y: 0 });

  const start = useCallback((e) => {
    isLong.current = false;
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    startPos.current = { x: clientX, y: clientY };
    timerRef.current = setTimeout(() => {
      isLong.current = true;
      onLongPress(e);
    }, delay);
  }, [onLongPress, delay]);

  const clear = useCallback(() => {
    clearTimeout(timerRef.current);
  }, []);

  const handleClick = useCallback((e) => {
    if (!isLong.current) onClick(e);
  }, [onClick]);

  const handleMove = useCallback((e) => {
    if (!e.touches && !e.clientX) return;
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    const dx = Math.abs(clientX - startPos.current.x);
    const dy = Math.abs(clientY - startPos.current.y);
    if (dx > 10 || dy > 10) clearTimeout(timerRef.current);
  }, []);

  return {
    onMouseDown:   start,
    onMouseUp:     clear,
    onMouseLeave:  clear,
    onTouchStart:  start,
    onTouchEnd:    clear,
    onTouchMove:   handleMove,
    onClick:       handleClick,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
//  COMPONENT
// ─────────────────────────────────────────────────────────────────────────────
export default function ProductList() {
  const [products,     setProducts]     = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [activeFilter, setActiveFilter] = useState("all");
  const [search,       setSearch]       = useState("");
  const [selectedCat,  setSelectedCat]  = useState("all");
  const [showCatMenu,  setShowCatMenu]  = useState(false);
  const [editId,       setEditId]       = useState(null);
  const [editData,     setEditData]     = useState({});
  const [editLoading,  setEditLoading]  = useState(false);

  // ── Multi-select state ──────────────────────────────────────────────────
  const [selectedIds,    setSelectedIds]    = useState(new Set());
  const [selectMode,     setSelectMode]     = useState(false);
  const [bulkLoading,    setBulkLoading]    = useState(false);
  const [animatingOut,   setAnimatingOut]   = useState(new Set());

  const isMobile = useIsMobile();

  useEffect(() => { fetchProducts(); }, []);

  // Close cat menu on outside click
  useEffect(() => {
    const h = (e) => { if (!e.target.closest("#cat-menu")) setShowCatMenu(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  const fetchProducts = async () => {
    try   { const { data } = await axios.get("/api/products"); setProducts(data); }
    catch (e) { console.error(e); }
    finally   { setLoading(false); }
  };

  const stats = {
    all:          products.length,
    fresh:        products.filter(p => getProductBucket(p) === "fresh").length,
    expiringSoon: products.filter(p => getProductBucket(p) === "expiringSoon").length,
    expired:      products.filter(p => getProductBucket(p) === "expired").length,
    used:         products.filter(p => p.status === "used").length,
    wasted:       products.filter(p => p.status === "wasted").length,
  };

  const allCategories = [...new Set(products.map(p => p.category).filter(Boolean))].sort();

  const visible = products
    .filter(p => {
      if (activeFilter !== "all" && getProductBucket(p) !== activeFilter) return false;
      if (selectedCat  !== "all" && p.category !== selectedCat) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        return p.name.toLowerCase().includes(q)             ||
               (p.category||"").toLowerCase().includes(q)   ||
               (p.location||"").toLowerCase().includes(q);
      }
      return true;
    })
    .sort((a, b) => {
      const bA = getProductBucket(a), bB = getProductBucket(b);
      const od = (BUCKET_ORDER[bA]??99) - (BUCKET_ORDER[bB]??99);
      if (od !== 0) return od;
      return getDaysUntilExpiry(a.expiryDate) - getDaysUntilExpiry(b.expiryDate);
    });

  // ── Single card mark-used ────────────────────────────────────────────────
  const handleMarkUsed = useCallback(async (productId, e) => {
    if (e) { e.stopPropagation(); e.preventDefault(); }
    setAnimatingOut(prev => new Set(prev).add(productId));
    axios.put(`/api/products/${productId}`, { status:"used" }).then(() => {
      fetchProducts();
    });
    setTimeout(() => {
      setAnimatingOut(prev => { const s = new Set(prev); s.delete(productId); return s; });
    }, 200);
  }, []);

  const updateStatus  = async (id, status) => { await axios.put(`/api/products/${id}`, { status }); fetchProducts(); };
  const deleteProduct = async (id, e) => {
    if (e) { e.stopPropagation(); e.preventDefault(); }
    if (!window.confirm("Delete this product?")) return;
    await axios.delete(`/api/products/${id}`);
    fetchProducts();
  };
  const startEdit = (p, e) => {
    if (e) { e.stopPropagation(); e.preventDefault(); }
    setEditId(p._id);
    setEditData({ name:p.name, category:p.category||"", expiryDate:p.expiryDate?p.expiryDate.split("T")[0]:"", location:p.location||"", notes:p.notes||"" });
  };
  const saveEdit = async () => {
    setEditLoading(true);
    try   { await axios.put(`/api/products/${editId}`, editData); setEditId(null); fetchProducts(); }
    catch (e) { console.error(e); }
    finally   { setEditLoading(false); }
  };

  // ── Multi-select helpers ────────────────────────────────────────────────
  const enterSelectMode = useCallback((productId) => {
    setSelectMode(true);
    setSelectedIds(new Set([productId]));
    if (navigator.vibrate) navigator.vibrate(40);
  }, []);

  const toggleSelect = useCallback((productId) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(productId)) next.delete(productId);
      else next.add(productId);
      return next;
    });
  }, []);

  const exitSelectMode = useCallback(() => {
    setSelectMode(false);
    setSelectedIds(new Set());
  }, []);

  const selectAll = useCallback(() => {
    setSelectedIds(new Set(visible.map(p => p._id)));
  }, [visible]);

  // ── Bulk Actions (Order: Delete, Restore, Used) ──────────────────────────
  const handleBulkDelete = useCallback(async () => {
    if (selectedIds.size === 0) return;
    if (!window.confirm(`Delete ${selectedIds.size} item${selectedIds.size > 1 ? "s" : ""}?`)) return;
    setBulkLoading(true);
    const ids = [...selectedIds];
    setAnimatingOut(new Set(ids));
    await Promise.all(ids.map(id => axios.delete(`/api/products/${id}`)));
    setTimeout(() => {
      setAnimatingOut(new Set());
      fetchProducts();
      exitSelectMode();
      setBulkLoading(false);
    }, 220);
  }, [selectedIds, exitSelectMode]);

  const handleBulkRestore = useCallback(async () => {
    if (selectedIds.size === 0) return;
    setBulkLoading(true);
    const ids = [...selectedIds];
    setAnimatingOut(new Set(ids));
    await Promise.all(ids.map(id => axios.put(`/api/products/${id}`, { status:"active" })));
    setTimeout(() => {
      setAnimatingOut(new Set());
      fetchProducts();
      exitSelectMode();
      setBulkLoading(false);
    }, 220);
  }, [selectedIds, exitSelectMode]);

  const handleBulkUsed = useCallback(async () => {
    if (selectedIds.size === 0) return;
    setBulkLoading(true);
    const ids = [...selectedIds];
    setAnimatingOut(new Set(ids));
    await Promise.all(ids.map(id => axios.put(`/api/products/${id}`, { status:"used" })));
    setTimeout(() => {
      setAnimatingOut(new Set());
      fetchProducts();
      exitSelectMode();
      setBulkLoading(false);
    }, 220);
  }, [selectedIds, exitSelectMode]);

  if (loading) return (
    <div className="flex justify-center items-center min-h-64">
      <div className="w-12 h-12 border-4 border-emerald-200 border-t-emerald-600 rounded-full animate-spin"/>
    </div>
  );

  return (
    <div className="space-y-5">

      {/* HEADER */}
      <div className="text-center space-y-1.5">
        <motion.div
          initial={{ opacity:0, y:-14 }} animate={{ opacity:1, y:0 }}
          transition={{ duration:0.38, ease:"easeOut" }}
          className="flex items-center justify-center gap-2.5"
        >
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center shadow-sm"
            style={{ background:"linear-gradient(135deg, #48A111 0%, #2d7a0a 100%)" }}
          >
            <Zap size={18} className="text-white" fill="white"/>
          </div>
          <div className="text-left">
            <h1
              className="leading-none font-black tracking-[-0.03em]"
              style={{
                fontSize:"1.6rem",
                background:"linear-gradient(135deg, #1a1a1a 0%, #48A111 55%, #2d7a0a 100%)",
                WebkitBackgroundClip:"text",
                WebkitTextFillColor:"transparent",
                backgroundClip:"text",
              }}
            >
              FreshTrack
              <span
                className="ml-1.5 text-[10px] font-black uppercase tracking-widest align-middle px-1.5 py-0.5 rounded-md"
                style={{
                  background:"linear-gradient(135deg,#48A111,#2d7a0a)",
                  WebkitTextFillColor:"white",
                  color:"white",
                  fontSize:"9px",
                  verticalAlign:"middle",
                }}
              >
                AI
              </span>
            </h1>
          </div>
        </motion.div>
        <motion.p
          initial={{ opacity:0 }} animate={{ opacity:1 }}
          transition={{ delay:0.14, duration:0.32 }}
          className="text-xs text-gray-400 font-medium tracking-wide"
        >
          Smart food intelligence · Reduce waste · Stay safe
        </motion.p>
      </div>

      {/* FILTER STAT CARDS */}
      <motion.div
        initial={{ opacity:0, y:8 }} animate={{ opacity:1, y:0 }}
        transition={{ delay:0.18, duration:0.32 }}
        className="grid grid-cols-4 gap-2 max-w-xl mx-auto w-full"
      >
        {FILTERS.map((f, fi) => {
          const Icon     = f.icon;
          const count    = stats[f.key];
          const isActive = activeFilter === f.key;
          const clr      = COLOR_MAP[f.color];
          return (
            <motion.button
              key={f.key}
              initial={{ opacity:0, y:10, scale:0.94 }}
              animate={{ opacity:1, y:0, scale:1 }}
              transition={{ delay:0.22+fi*0.05, type:"spring", stiffness:280, damping:22 }}
              whileHover={{ y:-3, scale:1.04, boxShadow:"0 6px 18px rgba(0,0,0,0.1)", transition:{ type:"spring", stiffness:600, damping:20 } }}
              whileTap={{ scale:0.96, transition:{ duration:0.07 } }}
              onClick={() => setActiveFilter(f.key)}
              className={`relative flex flex-col items-center gap-1 py-2.5 px-1 rounded-xl border-2 font-medium transition-colors duration-150 shadow-sm
                ${isActive ? clr.active : `${clr.card} hover:shadow-md`}`}
            >
              <Icon size={15} className={isActive ? "text-white" : clr.text}/>
              <span className={`text-lg font-black leading-none ${isActive ? "text-white" : clr.num}`}>{count}</span>
              <span className={`text-[9px] font-semibold text-center leading-tight ${isActive ? "text-white/90" : clr.text}`}>{f.label}</span>
              {!isActive && count > 0 && (f.key==="expiringSoon"||f.key==="expired") && (
                <span className="absolute top-1.5 right-1.5 flex h-2 w-2">
                  <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-60 ${f.key==="expired"?"bg-rose-400":"bg-amber-400"}`}/>
                  <span className={`relative inline-flex h-2 w-2 rounded-full ${f.key==="expired"?"bg-rose-500":"bg-amber-500"}`}/>
                </span>
              )}
            </motion.button>
          );
        })}
      </motion.div>

      {/* SEARCH BAR */}
      <motion.div
        initial={{ opacity:0, y:8 }} animate={{ opacity:1, y:0 }}
        transition={{ delay:0.3, duration:0.32 }}
        className="max-w-xl mx-auto w-full"
      >
        <div className="flex items-center gap-2">
          <div
            className="relative flex-1 flex items-center"
            style={{
              background: "white",
              borderRadius: "100px",
              boxShadow: "0 2px 12px rgba(0,0,0,0.08)",
              border: "1.5px solid #E5E7EB",
            }}
          >
            <div className="absolute left-4 flex items-center pointer-events-none">
              <Search size={16} style={{ color:"#9CA3AF" }}/>
            </div>
            <input
              type="text" value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search by name,"
              className="w-full pl-10 pr-9 py-3 bg-transparent text-sm text-gray-700 placeholder-gray-400 focus:outline-none"
              style={{ borderRadius:"100px" }}
            />
            <AnimatePresence>
              {search && (
                <motion.button
                  initial={{ opacity:0, scale:0.7 }} animate={{ opacity:1, scale:1 }} exit={{ opacity:0, scale:0.7 }}
                  transition={{ duration:0.1 }}
                  onClick={() => setSearch("")}
                  className="absolute right-3 text-gray-400 hover:text-gray-600 p-1"
                >
                  <X size={14}/>
                </motion.button>
              )}
            </AnimatePresence>
          </div>

          <motion.button
            whileHover={{ scale:1.04 }}
            whileTap={{ scale:0.96 }}
            onClick={() => setActiveFilter("all")}
            className="shrink-0 flex items-center gap-2 px-5 py-3 text-sm font-bold text-white transition-all"
            style={{
              background: "#19510A",
              borderRadius: "100px",
              boxShadow: "0 2px 10px rgba(25,81,10,0.35)",
              whiteSpace: "nowrap",
            }}
          >
            All Items
          </motion.button>
        </div>
      </motion.div>

      {/* TOOLBAR */}
      <motion.div
        initial={{ opacity:0 }} animate={{ opacity:1 }} transition={{ delay:0.42 }}
        className="flex items-center justify-between gap-3 flex-wrap"
      >
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-bold px-3 py-1.5 rounded-full border-2 border-[#48A111]/30 text-[#48A111] bg-[#48A111]/8">
            {visible.length} {visible.length===1?"item":"items"}
          </span>
          {search && <span className="text-xs text-gray-400 italic">matching "{search}"</span>}
          <AnimatePresence>
            {activeFilter !== "all" && (
              <motion.button initial={{ opacity:0, x:-4 }} animate={{ opacity:1, x:0 }} exit={{ opacity:0, x:-4 }}
                onClick={() => setActiveFilter("all")}
                className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 transition-colors">
                <X size={11}/> Clear filter
              </motion.button>
            )}
          </AnimatePresence>
          <AnimatePresence>
            {selectedCat !== "all" && (
              <motion.button initial={{ opacity:0, x:-4 }} animate={{ opacity:1, x:0 }} exit={{ opacity:0, x:-4 }}
                onClick={() => setSelectedCat("all")}
                className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 transition-colors">
                <X size={11}/> Clear category
              </motion.button>
            )}
          </AnimatePresence>
          {!selectMode && visible.length > 0 && (
            <span className="text-xs text-gray-400 italic hidden sm:inline">
              Hold card to multi-select
            </span>
          )}
        </div>
        <div className="relative" id="cat-menu">
          <motion.button
            whileHover={{ scale:1.02 }}
            whileTap={{ scale:0.97 }}
            onClick={() => setShowCatMenu(s => !s)}
            className="flex items-center gap-2 px-4 py-2 bg-white border-2 rounded-xl text-sm font-semibold transition-all shadow-sm"
            style={{ borderColor:"#48A111", color:"#48A111" }}
          >
            <Leaf size={13}/>
            {selectedCat==="all" ? "Category" : selectedCat}
            <motion.div animate={{ rotate: showCatMenu?180:0 }} transition={{ duration:0.18 }}>
              <ChevronDown size={13}/>
            </motion.div>
          </motion.button>
          <AnimatePresence>
            {showCatMenu && (
              <motion.div
                initial={{ opacity:0, y:4, scale:0.97 }} animate={{ opacity:1, y:0, scale:1 }} exit={{ opacity:0, y:4, scale:0.97 }}
                transition={{ duration:0.13 }}
                className="absolute right-0 mt-2 bg-white border border-gray-200 rounded-2xl shadow-xl z-30 py-1.5 min-w-44 overflow-hidden"
              >
                {["all",...allCategories].map((cat, ci) => (
                  <motion.button key={cat}
                    initial={{ opacity:0, x:-4 }} animate={{ opacity:1, x:0 }} transition={{ delay:ci*0.025 }}
                    onClick={() => { setSelectedCat(cat); setShowCatMenu(false); }}
                    className={`w-full text-left px-4 py-2.5 text-sm font-medium transition-colors hover:bg-gray-50 ${selectedCat===cat?"font-bold":""}`}
                    style={selectedCat===cat?{background:"#48A11115",color:"#48A111"}:{}}
                  >
                    {cat==="all"?"All Categories":cat}
                  </motion.button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>

      {/* SELECT MODE BANNER — Order: Delete, Restore, Used */}
      <AnimatePresence>
        {selectMode && (
          <motion.div
            initial={{ opacity:0, y:-8, scale:0.98 }}
            animate={{ opacity:1, y:0, scale:1 }}
            exit={{ opacity:0, y:-8, scale:0.98 }}
            transition={{ type:"spring", stiffness:380, damping:28 }}
            className="sticky top-16 z-30 flex flex-wrap items-center gap-2 px-4 py-3 rounded-2xl shadow-xl"
            style={{
              background: "linear-gradient(135deg, #19510A, #2d7a0a)",
              border: "1px solid rgba(255,255,255,0.12)",
            }}
          >
            {/* Count */}
            <div
              className="w-8 h-8 rounded-xl flex items-center justify-center font-black text-sm text-white shrink-0"
              style={{ background:"rgba(255,255,255,0.18)" }}
            >
              {selectedIds.size}
            </div>
            <span className="text-white font-bold text-sm flex-1 min-w-[80px]">
              {selectedIds.size} item{selectedIds.size !== 1 ? "s" : ""} selected
            </span>

            {/* Select All */}
            <button
              onClick={selectAll}
              className="text-xs font-bold px-3 py-1.5 rounded-xl transition-all shrink-0"
              style={{ background:"rgba(255,255,255,0.15)", color:"white", border:"1px solid rgba(255,255,255,0.2)" }}
            >
              All
            </button>

            {/* Delete Button - First */}
            <motion.button
              whileTap={{ scale:0.94 }}
              onClick={handleBulkDelete}
              disabled={bulkLoading || selectedIds.size === 0}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-bold transition-all disabled:opacity-50 shrink-0"
              style={{ background:"rgba(239,68,68,0.9)", color:"white" }}
            >
              {bulkLoading ? <RefreshCw size={14} className="animate-spin"/> : <Trash2 size={14}/>}
              <span className="hidden sm:inline">Delete</span>
            </motion.button>

            {/* Restore Button - Second */}
            <motion.button
              whileTap={{ scale:0.94 }}
              onClick={handleBulkRestore}
              disabled={bulkLoading || selectedIds.size === 0}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-bold transition-all disabled:opacity-50 shrink-0"
              style={{ background:"rgba(59,130,246,0.9)", color:"white" }}
            >
              {bulkLoading ? <RefreshCw size={14} className="animate-spin"/> : <RotateCcw size={14}/>}
              <span className="hidden sm:inline">Restore</span>
            </motion.button>

            {/* Used Button - Third */}
            <motion.button
              whileTap={{ scale:0.94 }}
              onClick={handleBulkUsed}
              disabled={bulkLoading || selectedIds.size === 0}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-bold transition-all disabled:opacity-50 shrink-0"
              style={{ background:"rgba(255,255,255,0.92)", color:"#19510A" }}
            >
              {bulkLoading ? <RefreshCw size={14} className="animate-spin"/> : <CheckCircle size={14}/>}
              <span className="hidden sm:inline">Used</span>
            </motion.button>

            {/* Cancel */}
            <motion.button
              whileTap={{ scale:0.94 }}
              onClick={exitSelectMode}
              className="p-2 rounded-xl transition-all shrink-0"
              style={{ background:"rgba(255,255,255,0.1)", color:"rgba(255,255,255,0.8)" }}
            >
              <X size={16}/>
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* EMPTY STATE */}
      <AnimatePresence>
        {visible.length === 0 && (
          <motion.div
            initial={{ opacity:0, scale:0.97 }} animate={{ opacity:1, scale:1 }} exit={{ opacity:0, scale:0.97 }}
            className="bg-white border border-gray-200 rounded-3xl p-16 text-center shadow-sm"
          >
            <motion.div
              animate={{ y:[0,-6,0] }} transition={{ repeat:Infinity, duration:2.5, ease:"easeInOut" }}
              className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4"
              style={{ background:"#CBF3BB" }}
            >
              <Package style={{ color:"#48A111" }} size={30}/>
            </motion.div>
            <h3 className="text-base font-bold text-gray-700 mb-1">
              {search ? `No results for "${search}"` : "No items here"}
            </h3>
            <p className="text-sm text-gray-400">
              {search ? "Try a different term." : "Switch filters or add new products."}
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* PRODUCT GRID */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
        <AnimatePresence mode="sync" initial={false}>
          {visible.map((product, idx) => {
            const bucket      = getProductBucket(product);
            const cfg         = BUCKET[bucket];
            const days        = getDaysUntilExpiry(product.expiryDate);
            const isEdit      = editId === product._id;
            const BIcon       = cfg.icon;
            const smartStatus = getSmartStatusLabel(product, days, bucket);
            const unsafeWarn  = getUnsafeWarning(product.category, product.location);
            const pct         = getFreshnessPct(days, product.category, product.location);
            const barColor    = getBarColor(pct, bucket);
            const lblColor    = getBarLabelColor(pct, bucket);
            const afterExpiry = bucket === "expired" ? getAfterExpiryStatus(product.category, product.location) : null;
            const warnWin     = getWarnWindow(product.category);
            const realWorldWarn = (bucket === "expiringSoon" || bucket === "fresh")
              ? getRealWorldWarning(product.category, product.location, days)
              : null;
            const isExpired   = bucket === "expired";
            const isUsed      = bucket === "used";
            const isWasted    = bucket === "wasted";
            const isActive    = product.status === "active";
            const isAnimOut   = animatingOut.has(product._id);
            const hideUsedBtn = !!realWorldWarn;
            const isSelected  = selectedIds.has(product._id);

            const CONSUMED_MSG = {
              Dairy:"Dairy consumed before expiry — excellent stock rotation.",
              Meat:"Protein fully consumed. Zero waste, maximum efficiency.",
              Vegetables:"Fresh produce used in time. Great inventory management.",
              Fruits:"Fully consumed before expiry. No waste recorded.",
              Snacks:"Consumed completely. Good pantry management.",
              Grains:"Grains used in full. Efficient stock usage.",
              Beverages:"Fully consumed. No waste recorded.",
              Frozen:"Frozen stock used before expiry. Well managed.",
              Other:"Item fully consumed before expiry.",
            };
            const consumedMsg = CONSUMED_MSG[product.category] || CONSUMED_MSG.Other;

            return (
              <ProductCard
                key={product._id}
                product={product}
                index={idx}
                isMobile={isMobile}
                bucket={bucket}
                cfg={cfg}
                days={days}
                isEdit={isEdit}
                BIcon={BIcon}
                smartStatus={smartStatus}
                unsafeWarn={unsafeWarn}
                pct={pct}
                barColor={barColor}
                lblColor={lblColor}
                afterExpiry={afterExpiry}
                warnWin={warnWin}
                realWorldWarn={realWorldWarn}
                isExpired={isExpired}
                isUsed={isUsed}
                isWasted={isWasted}
                isActive={isActive}
                isAnimOut={isAnimOut}
                hideUsedBtn={hideUsedBtn}
                isSelected={isSelected}
                consumedMsg={consumedMsg}
                selectMode={selectMode}
                editId={editId}
                editData={editData}
                editLoading={editLoading}
                selectedIds={selectedIds}
                onMarkUsed={handleMarkUsed}
                onUpdateStatus={updateStatus}
                onDeleteProduct={deleteProduct}
                onStartEdit={startEdit}
                onSaveEdit={saveEdit}
                onCancelEdit={() => setEditId(null)}
                onEditDataChange={setEditData}
                onEnterSelectMode={enterSelectMode}
                onToggleSelect={toggleSelect}
              />
            );
          })}
        </AnimatePresence>
      </div>

      {visible.length > 0 && (
        <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }} transition={{ delay:0.3 }} className="flex justify-center pt-2">
          <p className="text-xs font-semibold text-gray-500 px-4 py-2 bg-white border border-gray-200 rounded-full shadow-sm">
            Showing {visible.length} of {products.length} products
            {selectMode && selectedIds.size > 0 && (
              <span style={{ color:G }}> · {selectedIds.size} selected</span>
            )}
          </p>
        </motion.div>
      )}

      {selectMode && <div className="h-4"/>}
    </div>
  );
}

// ProductCard component with inline freshness text and date
function ProductCard({
  product, index, isMobile, bucket, cfg, days, isEdit, BIcon, smartStatus,
  unsafeWarn, pct, barColor, lblColor, afterExpiry, warnWin, realWorldWarn,
  isExpired, isUsed, isWasted, isActive, isAnimOut, hideUsedBtn, isSelected,
  consumedMsg, selectMode, editId, editData, editLoading, selectedIds,
  onMarkUsed, onUpdateStatus, onDeleteProduct, onStartEdit, onSaveEdit,
  onCancelEdit, onEditDataChange, onEnterSelectMode, onToggleSelect
}) {
  const isEditing = editId === product._id;
  
  const longPressHandlers = useLongPress(
    () => {
      if (!selectMode) onEnterSelectMode(product._id);
      else onToggleSelect(product._id);
    },
    () => {
      if (selectMode) onToggleSelect(product._id);
    },
    { delay: 480 }
  );

  return (
    <AnimatedItem index={index} isMobile={isMobile}>
      <motion.div
        animate={isAnimOut ? {
          scale: [1, 0.88, 0.3],
          opacity: [1, 0.7, 0],
          y: [0, -4, -20],
        } : undefined}
        transition={isAnimOut ? { duration: 0.2, ease: [0.4, 0, 0.8, 1] } : undefined}
        style={{ willChange: isAnimOut ? "transform, opacity" : "auto" }}
      >
        <div
          {...(isEditing ? {} : longPressHandlers)}
          className={`group relative border-2 overflow-hidden cursor-pointer select-none
            ${cfg.corner} ${cfg.border} shadow-md ${cfg.glow}
            ${isEditing ? `ring-2 ${cfg.ring}` : ""}
            ${isSelected ? "ring-2 ring-offset-1" : ""}
          `}
          style={{
            backgroundColor: cfg.cardBgHex,
            ringColor: isSelected ? "#48A111" : undefined,
            outline: isSelected ? `2px solid #48A111` : "none",
            outlineOffset: isSelected ? "2px" : undefined,
            transition: "outline 0.1s, transform 0.1s",
          }}
        >
          <div className={`bg-linear-to-r ${cfg.stripe} w-full
            ${bucket==="expired"?"h-2":bucket==="expiringSoon"?"h-1.5":"h-1"}`}/>

          <AnimatePresence>
            {selectMode && (
              <motion.div
                initial={{ opacity:0, scale:0.5 }}
                animate={{ opacity:1, scale:1 }}
                exit={{ opacity:0, scale:0.5 }}
                transition={{ type:"spring", stiffness:500, damping:25 }}
                className="absolute top-3 right-3 z-10 w-7 h-7 rounded-full flex items-center justify-center border-2 shadow-md"
                style={{
                  background: isSelected ? "#48A111" : "white",
                  borderColor: isSelected ? "#48A111" : "#D1D5DB",
                }}
              >
                {isSelected && (
                  <motion.div
                    initial={{ scale:0 }}
                    animate={{ scale:1 }}
                    transition={{ type:"spring", stiffness:600, damping:20 }}
                  >
                    <CheckCircle size={16} color="white" fill="white"/>
                  </motion.div>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          <div className="relative p-5 flex-1">
            {isEditing ? (
              <motion.div initial={{ opacity:0, y:5 }} animate={{ opacity:1, y:0 }} className="space-y-3">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-bold flex items-center gap-1.5 uppercase tracking-wide" style={{ color:"#48A111" }}>
                    <Edit2 size={12}/> Edit Product
                  </span>
                  <motion.button whileTap={{ scale:0.88 }} onClick={onCancelEdit} className="text-gray-300 hover:text-gray-500 transition">
                    <XCircle size={18}/>
                  </motion.button>
                </div>
                {[
                  {label:"Product Name",key:"name",type:"text",placeholder:"e.g. Organic Milk"},
                  {label:"Expiry Date",key:"expiryDate",type:"date",placeholder:""},
                ].map(({label,key,type,placeholder}) => (
                  <div key={key}>
                    <label className="block text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-1">{label}</label>
                    <input type={type} value={editData[key]} placeholder={placeholder}
                      onChange={e => onEditDataChange(d => ({...d,[key]:e.target.value}))}
                      className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-800 bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#48A111]/30 focus:border-[#48A111] transition-all"/>
                  </div>
                ))}
                {[
                  {label:"Category",key:"category",options:CATEGORIES},
                  {label:"Location",key:"location",options:LOCATIONS},
                ].map(({label,key,options}) => (
                  <div key={key}>
                    <label className="block text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-1">{label}</label>
                    <select value={editData[key]} onChange={e => onEditDataChange(d => ({...d,[key]:e.target.value}))}
                      className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-800 bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#48A111]/30 focus:border-[#48A111] transition-all">
                      <option value="">Select {label}</option>
                      {options.map(o => <option key={o} value={o}>{o}</option>)}
                    </select>
                  </div>
                ))}
                <div>
                  <label className="block text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-1">Notes</label>
                  <textarea value={editData.notes} rows={2}
                    onChange={e => onEditDataChange(d => ({...d,notes:e.target.value}))}
                    className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-800 bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#48A111]/30 focus:border-[#48A111] transition-all resize-none"
                    placeholder="Optional notes…"/>
                </div>
                <div className="flex gap-2 pt-1">
                  <motion.button whileTap={{ scale:0.97 }} onClick={onSaveEdit} disabled={editLoading||!editData.name}
                    className="flex-1 flex items-center justify-center gap-2 py-2.5 text-white rounded-xl text-sm font-bold disabled:opacity-50 transition-all shadow-sm"
                    style={{ background:"linear-gradient(to right, #48A111, #3a8a0d)" }}>
                    {editLoading?<RefreshCw size={14} className="animate-spin"/>:<Save size={14}/>}
                    Save Changes
                  </motion.button>
                  <motion.button whileTap={{ scale:0.97 }} onClick={onCancelEdit}
                    className="px-4 py-2.5 border border-gray-200 text-gray-500 rounded-xl text-sm font-medium hover:bg-gray-50 transition-all">
                    Cancel
                  </motion.button>
                </div>
              </motion.div>
            ) : (
              <>
                {isUsed && (
                  <motion.div
                    initial={{ opacity:0, y:-8, scale:0.96 }}
                    animate={{ opacity:1, y:0, scale:1 }}
                    transition={{ type:"spring", stiffness:280, damping:24 }}
                    className="mb-4 rounded-2xl overflow-hidden"
                    style={{ background:"linear-gradient(135deg, #0c4a6e 0%, #0369a1 55%, #0284c7 100%)", boxShadow:"0 2px 12px rgba(3,105,161,0.22)" }}
                  >
                    <div className="px-4 py-3">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-lg flex items-center justify-center" style={{ background:"rgba(255,255,255,0.12)" }}>
                            <ShieldCheck size={13} className="text-white"/>
                          </div>
                          <span className="text-[10px] font-black uppercase tracking-widest" style={{ color:"rgba(255,255,255,0.75)" }}>Item Consumed</span>
                        </div>
                        <span className="text-[10px] font-semibold tabular-nums" style={{ color:"rgba(255,255,255,0.45)" }}>100%</span>
                      </div>
                      <p className="text-[11px] font-medium leading-relaxed mb-2.5" style={{ color:"rgba(255,255,255,0.65)" }}>{consumedMsg}</p>
                      <div className="h-0.75 rounded-full overflow-hidden" style={{ background:"rgba(255,255,255,0.15)" }}>
                        <motion.div
                          initial={{ width:0 }} animate={{ width:"100%" }}
                          transition={{ duration:0.9, ease:"easeOut", delay:0.2 }}
                          className="h-full rounded-full" style={{ background:"rgba(255,255,255,0.85)" }}
                        />
                      </div>
                    </div>
                  </motion.div>
                )}

                <AnimatePresence>
                  {unsafeWarn && !isUsed && !isWasted && (
                    <motion.div
                      initial={{ opacity:0, height:0 }} animate={{ opacity:1, height:"auto" }} exit={{ opacity:0, height:0 }}
                      className="mb-3 px-3 py-2 rounded-xl border flex items-start gap-2 text-xs font-semibold overflow-hidden"
                      style={{ background:"#FFF1F2", borderColor:"#FECACA", color:"#BE123C" }}
                    >
                      <AlertOctagon size={13} className="shrink-0 mt-0.5"/>
                      {unsafeWarn.msg}
                    </motion.div>
                  )}
                </AnimatePresence>

                <AnimatePresence>
                  {realWorldWarn && (
                    <motion.div
                      initial={{ opacity:0, height:0 }} animate={{ opacity:1, height:"auto" }} exit={{ opacity:0, height:0 }}
                      className="mb-3 px-3 py-2.5 rounded-xl border flex items-start gap-2 text-xs font-semibold overflow-hidden"
                      style={{ background:"#FFFBEB", borderColor:"#FDE68A", color:"#92400E" }}
                    >
                      <AlertTriangle size={13} className="shrink-0 mt-0.5 text-amber-500"/>
                      <span>{realWorldWarn}</span>
                    </motion.div>
                  )}
                </AnimatePresence>

                <div className="flex items-start justify-between gap-3 mb-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <motion.div
                      whileHover={{ scale:1.12, rotate:5, transition:{ type:"spring", stiffness:500, damping:18 } }}
                      style={{ willChange:"transform" }}
                      className={`shrink-0 w-10 h-10 rounded-xl flex items-center justify-center bg-linear-to-br ${cfg.stripe} shadow-sm`}
                    >
                      <BIcon size={18} className="text-white"/>
                    </motion.div>
                    <div className="min-w-0">
                      <h3 className="font-bold text-gray-900 text-base leading-tight truncate">{product.name}</h3>
                      <span className="text-xs text-gray-400 flex items-center gap-1 mt-0.5">
                        <Tag size={10}/>{product.category || "Uncategorised"}
                      </span>
                    </div>
                  </div>
                  <span
                    className="shrink-0 text-[11px] font-bold px-2.5 py-1 rounded-full border flex items-center gap-1"
                    style={{ background:`${smartStatus.color}15`, color:smartStatus.color, borderColor:`${smartStatus.color}30` }}
                  >
                    <smartStatus.icon size={10}/>
                    {smartStatus.label}
                  </span>
                </div>

                {product.notes && (
                  <div className="flex items-start gap-2.5 text-sm mb-4">
                    <div className="w-7 h-7 rounded-lg bg-gray-100 flex items-center justify-center shrink-0 mt-0.5">
                      <StickyNote size={13} className="text-gray-400"/>
                    </div>
                    <span className="text-gray-400 italic line-clamp-1">"{product.notes}"</span>
                  </div>
                )}

                {/* Inline Freshness Engine Text with Calendar Date */}
                {isActive && !isUsed && days >= 0 && !realWorldWarn && (
                  <div className="mb-3 flex items-center gap-2 flex-wrap">
                    <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-[11px] font-bold text-gray-900 bg-white border border-gray-200 shadow-sm">
                      {bucket === "expiringSoon"
                        ? `Based on ${product.location || "storage"}, use within ${days} day${days !== 1 ? "s" : ""}`
                        : `Based on ${product.location || "storage"}, safe for ~${Math.max(0, days - warnWin)} more days`
                      }
                    </div>
                    <div className="h-4 w-px bg-gray-300"></div>
                    <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold text-gray-700 bg-gray-50 border border-gray-200">
                      <Calendar size={10} className="text-gray-500" />
                      {new Date(product.expiryDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                    </div>
                  </div>
                )}

                <AnimatePresence>
                  {afterExpiry && (
                    <motion.div
                      initial={{ opacity:0, height:0 }} animate={{ opacity:1, height:"auto" }} exit={{ opacity:0, height:0 }}
                      className="mb-3 px-3 py-2 rounded-xl border flex items-start gap-2 text-xs font-semibold overflow-hidden"
                      style={{
                        background:  afterExpiry==="risky"?"#FFF1F2":afterExpiry==="quality_reduce"?"#F5F3FF":"#FFFBEB",
                        borderColor: afterExpiry==="risky"?"#FECACA":afterExpiry==="quality_reduce"?"#DDD6FE":"#FDE68A",
                        color:       afterExpiry==="risky"?"#BE123C":afterExpiry==="quality_reduce"?"#6D28D9":"#92400E",
                      }}
                    >
                      <Info size={13} className="shrink-0 mt-0.5"/>
                      {afterExpiry==="risky"
                        ? `${product.category} past expiry — not recommended. Discard if unsure.`
                        : afterExpiry==="quality_reduce"
                          ? "Frozen past expiry — still safe but quality may have reduced."
                          : afterExpiry==="probably_safe"
                            ? `${product.category} may still be okay — check for spoilage before consuming.`
                            : "Check for spoilage (smell/look) before consuming."
                      }
                    </motion.div>
                  )}
                </AnimatePresence>

                {isActive && !isUsed && days >= 0 && !realWorldWarn && (
                  <div className="mb-4">
                    <div className="flex justify-between text-[11px] font-semibold mb-1.5">
                      <span className="font-bold text-black">Freshness</span>
                      <span style={{ color:lblColor }}>{pct}%</span>
                    </div>
                    <div className="h-2 bg-gray-200/70 rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width:0 }}
                        animate={{ width:`${Math.max(2,pct)}%` }}
                        transition={{ duration:0.9, ease:"easeOut" }}
                        className="h-full rounded-full"
                        style={{ background:barColor }}
                      />
                    </div>
                  </div>
                )}

                {/* Button order: Delete on left, Edit and Used on right */}
                {!selectMode && (
                  <div className="flex gap-2 pt-3 border-t border-gray-100">
                    <motion.button
                      whileTap={{ scale:0.88, transition:{ duration:0.06 } }}
                      onClick={(e) => onDeleteProduct(product._id, e)}
                      className="flex items-center gap-1.5 text-xs font-bold bg-white px-3 py-2 rounded-xl transition-colors"
                      style={{ border:"2px solid #FF0000", color:"#FF0000" }}
                    >
                      <Trash2 size={13} color="#FF0000"/> 
                      <span className="whitespace-nowrap">Delete</span>
                    </motion.button>

                    <div className="flex gap-2 ml-auto">
                      <motion.button
                        whileTap={{ scale:0.88, transition:{ duration:0.06 } }}
                        onClick={(e) => onStartEdit(product, e)}
                        className="flex items-center gap-1.5 text-xs font-bold text-white px-3 py-2 rounded-xl transition-colors shadow-sm"
                        style={{ backgroundColor:"#111111" }}
                      >
                        <Edit2 size={13} color="white"/> 
                        <span className="whitespace-nowrap">Edit</span>
                      </motion.button>

                      {isActive && !isExpired && !hideUsedBtn && (
                        <motion.button
                          whileTap={{ scale:0.88, transition:{ duration:0.06 } }}
                          onClick={(e) => onMarkUsed(product._id, e)}
                          className="flex items-center gap-1.5 text-xs font-bold text-white px-3 py-2 rounded-xl transition-colors shadow-sm"
                          style={{ background:"linear-gradient(to right, #48A111, #3a8a0d)" }}
                        >
                          <CheckCircle size={13}/> 
                          <span className="whitespace-nowrap">Used</span>
                        </motion.button>
                      )}

                      {(isUsed || isWasted) && (
                        <motion.button
                          whileTap={{ scale:0.88, transition:{ duration:0.06 } }}
                          onClick={(e) => { e.stopPropagation(); onUpdateStatus(product._id, "active"); }}
                          className="flex items-center gap-1.5 text-xs font-bold bg-linear-to-r from-blue-500 to-indigo-600 text-white px-3 py-2 rounded-xl transition-colors shadow-sm"
                        >
                          <RotateCcw size={13}/> 
                          <span className="whitespace-nowrap">Restore</span>
                        </motion.button>
                      )}
                    </div>
                  </div>
                )}

                {selectMode && (
                  <div className="pt-3 border-t border-gray-100 text-center">
                    <span className="text-xs text-gray-400 font-medium">
                      {isSelected ? "✓ Selected" : "Tap to select"}
                    </span>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </motion.div>
    </AnimatedItem>
  );
}