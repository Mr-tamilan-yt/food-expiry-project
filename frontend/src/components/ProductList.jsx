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
  // triggerOnce:true on mobile — never re-fires during scroll, zero ongoing cost
  const inView = useInView(ref, { amount: 0.12, triggerOnce: true });

  if (!isMobile) {
    return (
      <motion.div
        ref={ref}
        // NO layout / layoutId — eliminates continuous layout measurement on scroll
        initial={{ opacity: 0, y: 18, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ delay: index * 0.03, duration: 0.22, ease: [0.25, 0.46, 0.45, 0.94] }}
        // whileHover uses CSS transform only — GPU composited, no layout
        whileHover={{ y: -5, scale: 1.016, transition: { type: "spring", stiffness: 520, damping: 24 } }}
        style={{ willChange: "transform" }}
      >
        {children}
      </motion.div>
    );
  }
  // Mobile: inView animation, triggerOnce so no scroll-time re-renders
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

// Returns warning string if user-entered date exceeds real-world safe window
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
  if (maxSafe > 0 && days > maxSafe)       return "expiringSoon"; // real-world override
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
//  VISUAL CONFIG — unchanged
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
  const [flyingToUsed, setFlyingToUsed] = useState(new Set());
  const isMobile = useIsMobile();

  useEffect(() => { fetchProducts(); }, []);

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

  const handleMarkUsed = useCallback(async (productId) => {
    setFlyingToUsed(prev => new Set(prev).add(productId));
    await new Promise(res => setTimeout(res, 480));
    await axios.put(`/api/products/${productId}`, { status:"used" });
    setFlyingToUsed(prev => { const s = new Set(prev); s.delete(productId); return s; });
    fetchProducts();
  }, []);

  const updateStatus  = async (id, status) => { await axios.put(`/api/products/${id}`, { status }); fetchProducts(); };
  const deleteProduct = async (id) => {
    if (!window.confirm("Delete this product?")) return;
    await axios.delete(`/api/products/${id}`);
    fetchProducts();
  };
  const startEdit = (p) => {
    setEditId(p._id);
    setEditData({ name:p.name, category:p.category||"", expiryDate:p.expiryDate?p.expiryDate.split("T")[0]:"", location:p.location||"", notes:p.notes||"" });
  };
  const saveEdit = async () => {
    setEditLoading(true);
    try   { await axios.put(`/api/products/${editId}`, editData); setEditId(null); fetchProducts(); }
    catch (e) { console.error(e); }
    finally   { setEditLoading(false); }
  };

  if (loading) return (
    <div className="flex justify-center items-center min-h-64">
      <div className="w-12 h-12 border-4 border-emerald-200 border-t-emerald-600 rounded-full animate-spin"/>
    </div>
  );

  return (
    <div className="space-y-5">

      {/* ═══════════════════════════════════════════════════
          HEADER — premium SaaS branding
      ═══════════════════════════════════════════════════ */}
      <div className="text-center space-y-1.5">
        <motion.div
          initial={{ opacity:0, y:-14 }} animate={{ opacity:1, y:0 }}
          transition={{ duration:0.38, ease:"easeOut" }}
          className="flex items-center justify-center gap-2.5"
        >
          {/* Icon mark */}
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center shadow-sm"
            style={{ background:"linear-gradient(135deg, #48A111 0%, #2d7a0a 100%)" }}
          >
            <Zap size={18} className="text-white" fill="white"/>
          </div>
          <div className="text-left">
            {/* Premium wordmark */}
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

      {/* ═══════════════════════════════════════════════════
          4 FILTER STAT CARDS — compact, max-w capped on desktop
      ═══════════════════════════════════════════════════ */}
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

      {/* ═══════════════════════════════════════════════════
          SEARCH BAR + ALL ITEMS button on the RIGHT
      ═══════════════════════════════════════════════════ */}
      <motion.div
        initial={{ opacity:0, y:8 }} animate={{ opacity:1, y:0 }}
        transition={{ delay:0.3, duration:0.32 }}
        className="relative max-w-xl mx-auto w-full flex items-stretch"
      >
        {/* Search input */}
        <div className="relative flex-1">
          <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
            <Search size={16} className="text-[#48A111]"/>
          </div>
          <input
            type="text" value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search by name, category or location…"
            className="w-full pl-11 pr-9 py-2.75 bg-white border-2 border-r-0 rounded-l-2xl shadow-sm text-sm text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-4 focus:ring-[#48A111]/20 transition-all"
            style={{ borderColor:"#48A111" }}
          />
          <AnimatePresence>
            {search && (
              <motion.button
                initial={{ opacity:0, scale:0.7 }} animate={{ opacity:1, scale:1 }} exit={{ opacity:0, scale:0.7 }}
                transition={{ duration:0.12 }}
                onClick={() => setSearch("")}
                className="absolute inset-y-0 right-2 flex items-center text-gray-400 hover:text-gray-600"
              >
                <X size={15}/>
              </motion.button>
            )}
          </AnimatePresence>
        </div>

        {/* All Items button — RIGHT side of search bar, same border */}
        <motion.button
          whileHover={{ scale:1.02, transition:{ type:"spring", stiffness:500, damping:22 } }}
          whileTap={{ scale:0.96, transition:{ duration:0.07 } }}
          onClick={() => setActiveFilter("all")}
          className="shrink-0 flex items-center gap-1.5 px-3.5 rounded-r-2xl border-2 text-xs font-bold transition-colors duration-150 shadow-sm whitespace-nowrap"
          style={activeFilter === "all"
            ? { background:"#48A111", borderColor:"#2d6b0a", color:"#fff" }
            : { background:"#CBF3BB", borderColor:"#48A111", color:"#48A111" }
          }
        >
          <Package size={13}/>
          <span>All Items</span>
          <span
            className="px-1.5 py-0.5 rounded-md text-[10px] font-black leading-none"
            style={activeFilter === "all"
              ? { background:"rgba(255,255,255,0.25)", color:"#fff" }
              : { background:"#48A11120", color:"#2d6b0a" }
            }
          >{stats.all}</span>
        </motion.button>
      </motion.div>

      {/* ═══════════════════════════════════════════════════
          TOOLBAR
      ═══════════════════════════════════════════════════ */}
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
        </div>
        <div className="relative">
          <motion.button
            whileHover={{ scale:1.02, transition:{ type:"spring", stiffness:500, damping:22 } }}
            whileTap={{ scale:0.97 }}
            onClick={() => setShowCatMenu(s => !s)}
            className="flex items-center gap-2 px-4 py-2 bg-white border-2 rounded-xl text-sm font-semibold transition-all shadow-sm"
            style={{ borderColor:"#48A111", color:"#48A111" }}
          >
            <Tag size={13}/>
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

      {/* ═══════════════════════════════════════════════════
          EMPTY STATE
      ═══════════════════════════════════════════════════ */}
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

      {/* ═══════════════════════════════════════════════════
          PRODUCT GRID
      ═══════════════════════════════════════════════════ */}
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

            // Real-world override: fires when label date is unrealistically far
            const realWorldWarn = (bucket === "expiringSoon" || bucket === "fresh")
              ? getRealWorldWarning(product.category, product.location, days)
              : null;

            const isExpired        = bucket === "expired";
            const isUsed           = bucket === "used";
            const isWasted         = bucket === "wasted";
            const isActive         = product.status === "active";
            const isFlying         = flyingToUsed.has(product._id);
            // Hide "Used" button when realWorldWarn is active (item is flagged as unsafe)
            const hideUsedBtn      = !!realWorldWarn;

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
              <AnimatedItem key={product._id} index={idx} isMobile={isMobile}>
                {/* Flying-to-used: pure opacity+scale+y, GPU composited only */}
                <motion.div
                  animate={isFlying ? {
                    scale:  [1, 0.85, 0.5, 0.15],
                    opacity:[1, 0.85, 0.5, 0   ],
                    y:      [0, -8,  -28,  -64  ],
                  } : undefined}
                  transition={isFlying ? { duration: 0.44, ease: [0.4, 0, 0.8, 1] } : undefined}
                  style={{ willChange: isFlying ? "transform, opacity" : "auto" }}
                >
                  <div
                    className={`group relative border-2 overflow-hidden
                      ${cfg.corner} ${cfg.border} shadow-md ${cfg.glow}
                      ${isEdit ? `ring-2 ${cfg.ring}` : ""}`}
                    style={{ backgroundColor:cfg.cardBgHex }}
                  >
                    {/* Top stripe */}
                    <div className={`bg-linear-to-r ${cfg.stripe} w-full
                      ${bucket==="expired"?"h-2":bucket==="expiringSoon"?"h-1.5":"h-1"}`}/>

                    <div className="relative p-5 flex-1">
                      {isEdit ? (
                        /* ── EDIT FORM ── */
                        <motion.div initial={{ opacity:0, y:5 }} animate={{ opacity:1, y:0 }} className="space-y-3">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs font-bold flex items-center gap-1.5 uppercase tracking-wide" style={{ color:"#48A111" }}>
                              <Edit2 size={12}/> Edit Product
                            </span>
                            <motion.button whileTap={{ scale:0.88 }} onClick={() => setEditId(null)} className="text-gray-300 hover:text-gray-500 transition">
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
                                onChange={e => setEditData(d => ({...d,[key]:e.target.value}))}
                                className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-800 bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#48A111]/30 focus:border-[#48A111] transition-all"/>
                            </div>
                          ))}
                          {[
                            {label:"Category",key:"category",options:CATEGORIES},
                            {label:"Location",key:"location",options:LOCATIONS},
                          ].map(({label,key,options}) => (
                            <div key={key}>
                              <label className="block text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-1">{label}</label>
                              <select value={editData[key]} onChange={e => setEditData(d => ({...d,[key]:e.target.value}))}
                                className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-800 bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#48A111]/30 focus:border-[#48A111] transition-all">
                                <option value="">Select {label}</option>
                                {options.map(o => <option key={o} value={o}>{o}</option>)}
                              </select>
                            </div>
                          ))}
                          <div>
                            <label className="block text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-1">Notes</label>
                            <textarea value={editData.notes} rows={2}
                              onChange={e => setEditData(d => ({...d,notes:e.target.value}))}
                              className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-800 bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#48A111]/30 focus:border-[#48A111] transition-all resize-none"
                              placeholder="Optional notes…"/>
                          </div>
                          <div className="flex gap-2 pt-1">
                            <motion.button whileTap={{ scale:0.97 }} onClick={saveEdit} disabled={editLoading||!editData.name}
                              className="flex-1 flex items-center justify-center gap-2 py-2.5 text-white rounded-xl text-sm font-bold disabled:opacity-50 transition-all shadow-sm"
                              style={{ background:"linear-gradient(to right, #48A111, #3a8a0d)" }}>
                              {editLoading?<RefreshCw size={14} className="animate-spin"/>:<Save size={14}/>}
                              Save Changes
                            </motion.button>
                            <motion.button whileTap={{ scale:0.97 }} onClick={() => setEditId(null)}
                              className="px-4 py-2.5 border border-gray-200 text-gray-500 rounded-xl text-sm font-medium hover:bg-gray-50 transition-all">
                              Cancel
                            </motion.button>
                          </div>
                        </motion.div>
                      ) : (
                        /* ── PRODUCT VIEW ── */
                        <>
                          {/* Consumed banner — used cards only */}
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

                          {/* Unsafe storage warning — never on used/wasted */}
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

                          {/* Real-world safety warning */}
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

                          {/* Card header */}
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

                          {/* Info rows */}
                          <div className="space-y-2 mb-4">
                            <div className="flex items-center gap-2.5 text-sm">
                              <div className="w-7 h-7 rounded-lg bg-gray-100 flex items-center justify-center shrink-0">
                                <Calendar size={13} className="text-black"/>
                              </div>
                              <span className="font-black text-black underline underline-offset-2 decoration-black/40">
                                {new Date(product.expiryDate).toLocaleDateString("en-US",{weekday:"short",month:"short",day:"numeric",year:"numeric"})}
                              </span>
                            </div>
                            <div className="flex items-center gap-2.5 text-sm">
                              <div className="w-7 h-7 rounded-lg bg-gray-100 flex items-center justify-center shrink-0">
                                <MapPin size={13} className="text-black"/>
                              </div>
                              <span className="font-black text-black underline underline-offset-2 decoration-black/40">
                                {product.location || "—"}
                              </span>
                            </div>
                            {product.notes && (
                              <div className="flex items-start gap-2.5 text-sm">
                                <div className="w-7 h-7 rounded-lg bg-gray-100 flex items-center justify-center shrink-0 mt-0.5">
                                  <StickyNote size={13} className="text-gray-400"/>
                                </div>
                                <span className="text-gray-400 italic line-clamp-1">"{product.notes}"</span>
                              </div>
                            )}
                          </div>

                          {/*
                            Smart context hint — ONLY when no realWorldWarn active.
                            When realWorldWarn is showing, the hint is redundant and
                            the freshness bar is also hidden (see below).
                          */}
                          {isActive && !isUsed && days >= 0 && !realWorldWarn && (
                            <div className="mb-3 px-3 py-1.5 rounded-lg text-[11px] font-medium text-gray-500 bg-white/60 border border-gray-200/60">
                              {bucket === "expiringSoon"
                                ? `Based on ${product.location||"storage"}, use within ${days} day${days!==1?"s":""}`
                                : `Based on ${product.location||"storage"}, safe for ~${Math.max(0, days-warnWin)} more days`
                              }
                            </div>
                          )}

                          {/* After-expiry advisory */}
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

                          {/*
                            Freshness bar — hidden when realWorldWarn is active.
                            The bar would be misleadingly low/confusing alongside the
                            warning banner, so we remove both the bar AND its label together.
                          */}
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

                          {/* ACTION BUTTONS */}
                          <div className="flex gap-2 pt-3 border-t border-gray-100 flex-wrap">

                            {/*
                              Used button:
                              - Hidden when realWorldWarn is active (item flagged as unsafe)
                              - Hidden when expired
                              - Only shown for active items
                            */}
                            {isActive && !isExpired && !hideUsedBtn && (
                              <motion.button
                                whileHover={{ scale:1.05, transition:{ type:"spring", stiffness:600, damping:18 } }}
                                whileTap={{ scale:0.91, transition:{ duration:0.07 } }}
                                onClick={() => handleMarkUsed(product._id)}
                                className="flex items-center gap-1.5 text-xs font-bold text-white px-3.5 py-2 rounded-xl transition-colors shadow-sm"
                                style={{ background:"linear-gradient(to right, #48A111, #3a8a0d)" }}
                              >
                                <CheckCircle size={13}/> Used
                              </motion.button>
                            )}

                            {/* Restore — used/wasted only */}
                            {(isUsed || isWasted) && (
                              <motion.button
                                whileHover={{ scale:1.05, transition:{ type:"spring", stiffness:600, damping:18 } }}
                                whileTap={{ scale:0.91, transition:{ duration:0.07 } }}
                                onClick={() => updateStatus(product._id, "active")}
                                className="flex items-center gap-1.5 text-xs font-bold bg-linear-to-r from-blue-500 to-indigo-600 text-white px-3.5 py-2 rounded-xl transition-colors shadow-sm"
                              >
                                <RotateCcw size={13}/> Restore
                              </motion.button>
                            )}

                            {/* Edit — all cards */}
                            <motion.button
                              whileHover={{ scale:1.05, transition:{ type:"spring", stiffness:600, damping:18 } }}
                              whileTap={{ scale:0.91, transition:{ duration:0.07 } }}
                              onClick={() => startEdit(product)}
                              className="flex items-center gap-1.5 text-xs font-bold text-white px-3.5 py-2 rounded-xl transition-colors shadow-sm"
                              style={{ backgroundColor:"#111111" }}
                            >
                              <Edit2 size={13} color="white"/> Edit
                            </motion.button>

                            {/* Delete — always */}
                            <motion.button
                              whileHover={{ scale:1.05, transition:{ type:"spring", stiffness:600, damping:18 } }}
                              whileTap={{ scale:0.91, transition:{ duration:0.07 } }}
                              onClick={() => deleteProduct(product._id)}
                              className="flex items-center gap-1.5 text-xs font-bold bg-white px-3.5 py-2 rounded-xl transition-colors ml-auto"
                              style={{ border:"2px solid #FF0000", color:"#FF0000" }}
                            >
                              <Trash2 size={13} color="#FF0000"/> Delete
                            </motion.button>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </motion.div>
              </AnimatedItem>
            );
          })}
        </AnimatePresence>
      </div>

      {visible.length > 0 && (
        <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }} transition={{ delay:0.3 }} className="flex justify-center pt-2">
          <p className="text-xs font-semibold text-gray-500 px-4 py-2 bg-white border border-gray-200 rounded-full shadow-sm">
            Showing {visible.length} of {products.length} products
          </p>
        </motion.div>
      )}
    </div>
  );
}

