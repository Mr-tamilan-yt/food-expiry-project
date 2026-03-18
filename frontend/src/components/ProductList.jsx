import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import {
  Package, Calendar, MapPin, Trash2, RotateCcw, CheckCircle,
  AlertTriangle, Tag, StickyNote, ChevronDown, Clock,
  AlertOctagon, Leaf, RefreshCw, Search, X,
  Edit2, Save, XCircle, Filter, Grid3X3, List,
  Clock as ClockIcon, Snowflake, ShieldCheck, Zap
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

// ─── helpers ──────────────────────────────────────────────────────────────────
function getDaysUntilExpiry(expiryDate) {
  const today = new Date(); today.setHours(0,0,0,0);
  const exp   = new Date(expiryDate); exp.setHours(0,0,0,0);
  return Math.ceil((exp - today) / 86400000);
}

function getProductBucket(p) {
  if (p.status === "used")   return "used";
  if (p.status === "wasted") return "wasted";
  const d = getDaysUntilExpiry(p.expiryDate);
  if (d < 0)  return "expired";
  if (d <= 6) return "expiringSoon";
  return "fresh";
}

// ─── Per-bucket visual config ─────────────────────────────────────────────────
const BUCKET = {
  fresh:        {
    label:"Fresh", icon: Leaf,
    // Pure fresh green — no cyan, visually communicates healthy & safe
    stripe:  "from-[#48A111] to-[#3a8a0d]",
    cardBg:  "bg-[#CBF3BB]",
    cardBgHex: "#CBF3BB",
    badge:   "bg-[#48A111]/10 text-[#48A111] border-[#48A111]/30",
    border:  "border-[#48A111]/40",
    ring:    "ring-[#48A111]/20",
    glow:    "shadow-[#48A111]/10",
    dot:     "bg-[#48A111]",
    corner:  "rounded-3xl",
  },
  expiringSoon: {
    label:"Expiring Soon", icon: ClockIcon,   // Clock instead of Fire
    stripe:  "from-amber-400 to-orange-400",
    cardBg:  "bg-[#FDE7B3]",
    cardBgHex: "#FDE7B3",
    badge:   "bg-amber-50 text-amber-700 border-amber-200",
    border:  "border-amber-300",
    ring:    "ring-amber-100",
    glow:    "shadow-amber-100",
    dot:     "bg-amber-400",
    corner:  "rounded-2xl",
  },
  expired:      {
    label:"Expired", icon: AlertOctagon,
    stripe:  "from-rose-500 to-red-500",
    cardBg:  "bg-[#FFA27F]/40",
    cardBgHex: "#FFA27F66",
    badge:   "bg-rose-50 text-rose-700 border-rose-200",
    border:  "border-rose-300",
    ring:    "ring-rose-100",
    glow:    "shadow-rose-100",
    dot:     "bg-rose-500",
    corner:  "rounded-xl",
  },
  used:         {
    label:"Used", icon: ShieldCheck,
    stripe:  "from-sky-400 to-blue-500",
    cardBg:  "bg-sky-50",
    cardBgHex: "#f0f9ff",
    badge:   "bg-sky-50 text-sky-700 border-sky-200",
    border:  "border-sky-200",
    ring:    "ring-sky-100",
    glow:    "shadow-sky-100",
    dot:     "bg-sky-400",
    corner:  "rounded-3xl",
  },
  wasted:       {
    label:"Wasted", icon: AlertTriangle,
    stripe:  "from-slate-400 to-gray-500",
    cardBg:  "bg-slate-100",
    cardBgHex: "#f1f5f9",
    badge:   "bg-slate-100 text-slate-500 border-slate-200",
    border:  "border-slate-300",
    ring:    "ring-slate-100",
    glow:    "shadow-slate-100",
    dot:     "bg-slate-400",
    corner:  "rounded-2xl",
  },
};

const FILTERS = [
  { key:"all",          label:"All Items",     icon: Package,      color:"blue"    },
  { key:"fresh",        label:"Fresh",         icon: Leaf,         color:"emerald" },
  { key:"expiringSoon", label:"Expiring Soon", icon: ClockIcon,    color:"amber"   },
  { key:"expired",      label:"Expired",       icon: AlertOctagon, color:"rose"    },
  { key:"used",         label:"Used",          icon: ShieldCheck,  color:"teal"    },
  { key:"wasted",       label:"Wasted",        icon: AlertTriangle,color:"gray"    },
];

const COLOR_MAP = {
  blue:    { card:"bg-blue-100 border-blue-500",         text:"text-blue-800",   active:"bg-blue-600 text-white border-blue-700",         num:"text-blue-900"   },
  emerald: { card:"bg-[#CBF3BB] border-[#48A111]",       text:"text-[#48A111]",  active:"bg-[#48A111] text-white border-[#2d6b0a]",       num:"text-[#2d6b0a]"  },
  amber:   { card:"bg-[#FDE7B3] border-amber-500",       text:"text-amber-800",  active:"bg-amber-500 text-white border-amber-700",       num:"text-amber-900"  },
  rose:    { card:"bg-[#FFA27F]/50 border-red-500",      text:"text-red-800",    active:"bg-red-600 text-white border-red-700",           num:"text-red-900"    },
  teal:    { card:"bg-sky-100 border-sky-500",           text:"text-sky-800",    active:"bg-sky-600 text-white border-sky-700",           num:"text-sky-900"    },
  gray:    { card:"bg-slate-200 border-slate-500",       text:"text-slate-700",  active:"bg-slate-600 text-white border-slate-700",       num:"text-slate-800"  },
};

const CATEGORIES = ["Dairy","Vegetables","Fruits","Meat","Grains","Beverages","Snacks","Frozen","Other"];
const LOCATIONS  = ["Pantry","Refrigerator","Freezer","Cabinet","Other"];

// ─── Component ────────────────────────────────────────────────────────────────
export default function ProductList() {
  const [products,    setProducts]    = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [activeFilter,setActiveFilter]= useState("all");
  const [search,      setSearch]      = useState("");
  const [sortBy,         setSortBy]         = useState("expiry");
  const [viewMode,       setViewMode]       = useState("grid");
  const [showSort,       setShowSort]       = useState(false);
  const [selectedCat,    setSelectedCat]    = useState("all");
  const [showCatMenu,    setShowCatMenu]    = useState(false);
  const [editId,      setEditId]      = useState(null);
  const [editData,    setEditData]    = useState({});
  const [editLoading, setEditLoading] = useState(false);

  useEffect(() => { fetchProducts(); }, []);

  const fetchProducts = async () => {
    try { const { data } = await axios.get("/api/products"); setProducts(data); }
    catch(e) { console.error(e); }
    finally  { setLoading(false); }
  };

  const stats = {
    all:          products.length,
    fresh:        products.filter(p => getProductBucket(p) === "fresh").length,
    expiringSoon: products.filter(p => getProductBucket(p) === "expiringSoon").length,
    expired:      products.filter(p => getProductBucket(p) === "expired").length,
    used:         products.filter(p => p.status === "used").length,
    wasted:       products.filter(p => p.status === "wasted").length,
  };

  // derive unique categories from products list
  const allCategories = [...new Set(products.map(p => p.category).filter(Boolean))].sort();

  const visible = products
    .filter(p => {
      if (activeFilter !== "all" && getProductBucket(p) !== activeFilter) return false;
      if (selectedCat !== "all" && p.category !== selectedCat) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        return p.name.toLowerCase().includes(q) ||
               (p.category||"").toLowerCase().includes(q) ||
               (p.location||"").toLowerCase().includes(q);
      }
      return true;
    })
    .sort((a,b) => {
      if (sortBy==="expiry") return new Date(a.expiryDate)-new Date(b.expiryDate);
      if (sortBy==="name")   return a.name.localeCompare(b.name);
      return new Date(b.addedDate||0)-new Date(a.addedDate||0);
    });

  const updateStatus = async (id, status) => {
    await axios.put(`/api/products/${id}`, { status });
    fetchProducts();
  };

  const deleteProduct = async (id) => {
    if (!window.confirm("Delete this product?")) return;
    await axios.delete(`/api/products/${id}`);
    fetchProducts();
  };

  const startEdit = (p) => {
    setEditId(p._id);
    setEditData({
      name:       p.name,
      category:   p.category||"",
      expiryDate: p.expiryDate ? p.expiryDate.split("T")[0] : "",
      location:   p.location||"",
      notes:      p.notes||"",
    });
  };

  const saveEdit = async () => {
    setEditLoading(true);
    try { await axios.put(`/api/products/${editId}`, editData); setEditId(null); fetchProducts(); }
    catch(e){ console.error(e); }
    finally  { setEditLoading(false); }
  };

  if (loading) return (
    <div className="flex justify-center items-center min-h-64">
      <div className="w-12 h-12 border-4 border-emerald-200 border-t-emerald-600 rounded-full animate-spin"/>
    </div>
  );

  return (
    <div className="space-y-8">

      {/* ── Header + Search ── */}
      <div className="text-center space-y-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight" style={{ color: '#48A111' }}>
            Food Inventory
          </h1>
          <p className="text-sm text-gray-400 mt-1 font-medium">Track freshness · Reduce waste · Stay organised</p>
        </div>

        {/* Search */}
        <div className="relative max-w-lg mx-auto">
          <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
            <Search size={17} className="text-[#48A111]"/>
          </div>
          <input
            type="text" value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by name, category or location…"
            className="w-full pl-11 pr-10 py-3.5 bg-white border-2 rounded-2xl shadow-sm text-sm text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-4 focus:ring-[#48A111]/20 transition-all"
            style={{ borderColor: '#48A111' }}
          />
          {search && (
            <button onClick={() => setSearch("")}
              className="absolute inset-y-0 right-3 flex items-center text-gray-400 hover:text-gray-600">
              <X size={16}/>
            </button>
          )}
        </div>
      </div>

      {/* ── Stat Filter Cards ── */}
      <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
        {FILTERS.map(f => {
          const Icon     = f.icon;
          const count    = stats[f.key];
          const isActive = activeFilter === f.key;
          const clr      = COLOR_MAP[f.color];
          return (
            <motion.button key={f.key}
              whileHover={{ y:-4, scale:1.04 }}
              whileTap={{ scale:0.97 }}
              onClick={() => setActiveFilter(f.key)}
              className={`relative flex flex-col items-center gap-1.5 py-4 px-2 rounded-2xl border-2 font-medium transition-all duration-200 shadow-sm
                ${isActive ? clr.active : `${clr.card} hover:shadow-md`}`}
            >
              <Icon size={20} className={isActive ? "text-white" : clr.text}/>
              <span className={`text-2xl font-black leading-none ${isActive ? "text-white" : clr.num}`}>{count}</span>
              <span className={`text-[10px] font-semibold text-center leading-tight ${isActive ? "text-white/90" : clr.text}`}>
                {f.label}
              </span>
              {/* Pulse dot for non-zero urgent buckets */}
              {!isActive && count > 0 && (f.key === "expiringSoon" || f.key === "expired") && (
                <span className="absolute top-2 right-2 flex h-2.5 w-2.5">
                  <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-60 ${f.key==="expired" ? "bg-rose-400" : "bg-amber-400"}`}/>
                  <span className={`relative inline-flex h-2.5 w-2.5 rounded-full ${f.key==="expired" ? "bg-rose-500" : "bg-amber-500"}`}/>
                </span>
              )}
            </motion.button>
          );
        })}
      </div>

      {/* ── Toolbar: count + category filter (no view toggle) ── */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        {/* Left: item count + clear */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-bold px-3 py-1.5 rounded-full border-2 border-[#48A111]/30 text-[#48A111] bg-[#48A111]/8">
            {visible.length} {visible.length === 1 ? "item" : "items"}
          </span>
          {search && (
            <span className="text-xs text-gray-400 italic">matching "{search}"</span>
          )}
          {activeFilter !== "all" && (
            <button onClick={() => setActiveFilter("all")}
              className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 transition-colors">
              <X size={11}/> Clear filter
            </button>
          )}
          {selectedCat !== "all" && (
            <button onClick={() => setSelectedCat("all")}
              className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 transition-colors">
              <X size={11}/> Clear category
            </button>
          )}
        </div>

        {/* Right: Category filter button */}
        <div className="relative">
          <button
            onClick={() => setShowCatMenu(s => !s)}
            className="flex items-center gap-2 px-4 py-2 bg-white border-2 rounded-xl text-sm font-semibold transition-all shadow-sm"
            style={{ borderColor: '#48A111', color: '#48A111' }}
          >
            <Tag size={13}/>
            {selectedCat === "all" ? "Category" : selectedCat}
            <ChevronDown size={13} className={showCatMenu ? "rotate-180 transition-transform" : "transition-transform"}/>
          </button>

          <AnimatePresence>
            {showCatMenu && (
              <motion.div
                initial={{ opacity:0, y:5, scale:0.97 }}
                animate={{ opacity:1, y:0,  scale:1    }}
                exit={{    opacity:0, y:5,  scale:0.97 }}
                className="absolute right-0 mt-2 bg-white border border-gray-200 rounded-2xl shadow-xl z-30 py-1.5 min-w-44 overflow-hidden"
              >
                {["all", ...allCategories].map(cat => (
                  <button key={cat}
                    onClick={() => { setSelectedCat(cat); setShowCatMenu(false); }}
                    className={`w-full text-left px-4 py-2.5 text-sm font-medium transition-colors
                      ${selectedCat === cat
                        ? "font-bold"
                        : "text-gray-600 hover:bg-gray-50"}`}
                    style={selectedCat === cat ? { background: '#48A111' + '15', color: '#48A111' } : {}}
                  >
                    {cat === "all" ? "All Categories" : cat}
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* ── Empty State ── */}
      {visible.length === 0 && (
        <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }}
          className="bg-white border border-gray-200 rounded-3xl p-16 text-center shadow-sm">
          <div className="w-16 h-16 bg-gradient-to-br from-emerald-100 to-teal-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Package className="text-emerald-500" size={30}/>
          </div>
          <h3 className="text-base font-bold text-gray-700 mb-1">
            {search ? `No results for "${search}"` : "No items here"}
          </h3>
          <p className="text-sm text-gray-400">
            {search ? "Try a different term." : "Switch filters or add new products."}
          </p>
        </motion.div>
      )}

      {/* ── Product Cards ── */}
      <div className={viewMode === "grid"
        ? "grid sm:grid-cols-2 lg:grid-cols-3 gap-5"
        : "flex flex-col gap-4"}>
        <AnimatePresence>
          {visible.map((product, idx) => {
            const bucket  = getProductBucket(product);
            const cfg     = BUCKET[bucket];
            const days    = getDaysUntilExpiry(product.expiryDate);
            const isEdit  = editId === product._id;
            const BIcon   = cfg.icon;

            return (
              <motion.div key={product._id}
                layout
                initial={{ opacity:0, y:24, scale:0.97 }}
                animate={{ opacity:1, y:0,  scale:1    }}
                exit={{    opacity:0, y:-16, scale:0.96 }}
                transition={{ delay: idx * 0.04, type:"spring", stiffness:200, damping:22 }}
                whileHover={!isEdit ? { y:-5, scale:1.01 } : {}}
                className={`group relative border-2 overflow-hidden
                  transition-all duration-300 ease-out
                  ${cfg.corner} ${cfg.border}
                  shadow-md hover:shadow-xl ${cfg.glow}
                  ${isEdit ? `ring-2 ${cfg.ring}` : ""}
                  ${viewMode === "list" ? "flex" : ""}`}
                style={{ backgroundColor: cfg.cardBgHex }}
              >

                {/* ── Top gradient stripe (thickness = urgency) ── */}
                <div className={`bg-gradient-to-r ${cfg.stripe} w-full
                  ${bucket === "expired"      ? "h-2"   :
                    bucket === "expiringSoon" ? "h-1.5" : "h-1"}`}
                />



                <div className="relative p-5 flex-1">
                  {isEdit ? (
                    /* ── EDIT FORM ── */
                    <div className="space-y-3">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-bold text-emerald-600 flex items-center gap-1.5 uppercase tracking-wide">
                          <Edit2 size={12}/> Edit Product
                        </span>
                        <button onClick={() => setEditId(null)} className="text-gray-300 hover:text-gray-500 transition">
                          <XCircle size={18}/>
                        </button>
                      </div>

                      {[
                        { label:"Product Name", key:"name", type:"text",   placeholder:"e.g. Organic Milk" },
                        { label:"Expiry Date",  key:"expiryDate", type:"date", placeholder:"" },
                      ].map(({ label, key, type, placeholder }) => (
                        <div key={key}>
                          <label className="block text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-1">{label}</label>
                          <input type={type} value={editData[key]} placeholder={placeholder}
                            onChange={e => setEditData(d => ({...d, [key]: e.target.value}))}
                            className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-800 bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-400/30 focus:border-emerald-400 transition-all"/>
                        </div>
                      ))}

                      {[
                        { label:"Category", key:"category", options: CATEGORIES },
                        { label:"Location",  key:"location", options: LOCATIONS  },
                      ].map(({ label, key, options }) => (
                        <div key={key}>
                          <label className="block text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-1">{label}</label>
                          <select value={editData[key]}
                            onChange={e => setEditData(d => ({...d, [key]: e.target.value}))}
                            className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-800 bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-400/30 focus:border-emerald-400 transition-all">
                            <option value="">Select {label}</option>
                            {options.map(o => <option key={o} value={o}>{o}</option>)}
                          </select>
                        </div>
                      ))}

                      <div>
                        <label className="block text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-1">Notes</label>
                        <textarea value={editData.notes} rows={2}
                          onChange={e => setEditData(d => ({...d, notes: e.target.value}))}
                          className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-800 bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-400/30 focus:border-emerald-400 transition-all resize-none"
                          placeholder="Optional notes…"/>
                      </div>

                      <div className="flex gap-2 pt-1">
                        <button onClick={saveEdit} disabled={editLoading || !editData.name}
                          className="flex-1 flex items-center justify-center gap-2 py-2.5 text-white rounded-xl text-sm font-bold disabled:opacity-50 transition-all shadow-sm" style={{ background: "linear-gradient(to right, #48A111, #3a8a0d)" }}>
                          {editLoading ? <RefreshCw size={14} className="animate-spin"/> : <Save size={14}/>}
                          Save Changes
                        </button>
                        <button onClick={() => setEditId(null)}
                          className="px-4 py-2.5 border border-gray-200 text-gray-500 rounded-xl text-sm font-medium hover:bg-gray-50 transition-all">
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    /* ── PRODUCT VIEW ── */
                    <>
                      {/* Header row */}
                      <div className="flex items-start justify-between gap-3 mb-4">
                        <div className="flex items-center gap-3 min-w-0">
                          {/* Category icon pill */}
                          <div className={`shrink-0 w-10 h-10 rounded-xl flex items-center justify-center bg-gradient-to-br ${cfg.stripe} shadow-sm`}>
                            <BIcon size={18} className="text-white"/>
                          </div>
                          <div className="min-w-0">
                            <h3 className="font-bold text-gray-900 text-base leading-tight truncate">{product.name}</h3>
                            <span className="text-xs text-gray-400 flex items-center gap-1 mt-0.5">
                              <Tag size={10}/>{product.category || "Uncategorised"}
                            </span>
                          </div>
                        </div>

                        {/* Status badge */}
                        <span className={`shrink-0 text-[11px] font-bold px-2.5 py-1 rounded-full border flex items-center gap-1 ${cfg.badge}`}>
                          <BIcon size={10}/>
                          {bucket === "expiringSoon" && days >= 0
                            ? `${days}d left`
                            : bucket === "expired"
                            ? `${Math.abs(days)}d ago`
                            : cfg.label}
                        </span>
                      </div>

                      {/* Info rows */}
                      <div className="space-y-2 mb-4">
                        <div className="flex items-center gap-2.5 text-sm">
                          <div className="w-7 h-7 rounded-lg bg-gray-100 flex items-center justify-center shrink-0">
                            <Calendar size={13} className="text-black"/>
                          </div>
                          <span className="font-black text-black underline underline-offset-2 decoration-black/40">
                            {new Date(product.expiryDate).toLocaleDateString("en-US", {
                              weekday:"short", month:"short", day:"numeric", year:"numeric"
                            })}
                          </span>
                        </div>
                        <div className="flex items-center gap-2.5 text-sm">
                          <div className="w-7 h-7 rounded-lg bg-gray-100 flex items-center justify-center shrink-0">
                            <MapPin size={13} className="text-black"/>
                          </div>
                          <span className="font-black text-black underline underline-offset-2 decoration-black/40">{product.location || "—"}</span>
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

                      {/* Freshness bar — shown for ALL active items */}
                      {product.status === "active" && days >= 0 && (() => {
                        // Cap at 180 days for percentage calc so long-shelf items still show meaningful bar
                        const maxDays = 180;
                        const pct     = Math.min(Math.round((days / maxDays) * 100), 100);
                        // Colour zones based on percentage
                        const barColor =
                          pct <= 10  ? "from-red-500 to-red-600"           :  // critical — red
                          pct <= 20  ? "from-orange-400 to-red-400"        :  // bad — orange-red
                          pct <= 30  ? "from-orange-300 to-orange-400"     :  // warning — mild orange
                          pct <= 50  ? "from-amber-300 to-amber-400"       :  // caution — mild amber
                          pct <= 70  ? "from-lime-400 to-green-400"        :  // ok — yellow-green
                          pct <= 85  ? "from-[#5cc118] to-[#48A111]"     :  // good — green
                                       "from-[#48A111] to-[#3a8a0d]";        // excellent — deep green
                        const labelColor =
                          pct <= 10  ? "text-red-600"    :
                          pct <= 30  ? "text-orange-600" :
                          pct <= 50  ? "text-amber-600"  :
                                       "text-[#48A111]";
                        return (
                          <div className="mb-4">
                            <div className="flex justify-between text-[11px] font-semibold mb-1.5">
                              <span className="font-bold text-black">Freshness</span>
                              <span className={labelColor}>{pct}%</span>
                            </div>
                            <div className="h-2 bg-gray-200/70 rounded-full overflow-hidden">
                              <motion.div
                                initial={{ width:0 }}
                                animate={{ width:`${Math.max(2, pct)}%` }}
                                transition={{ duration:0.9, ease:"easeOut" }}
                                className={`h-full rounded-full bg-gradient-to-r ${barColor}`}/>
                            </div>
                          </div>
                        );
                      })()}

                      {/* Expired alert strip */}
                      {bucket === "expired" && (
                        <div className="mb-4 flex items-center gap-2 px-3 py-2 bg-rose-50 border border-rose-200 rounded-xl">
                          <AlertOctagon size={14} className="text-rose-500 shrink-0"/>
                          <span className="text-xs font-semibold text-rose-700">
                            Expired {Math.abs(days)} {Math.abs(days)===1 ? "day" : "days"} ago
                          </span>
                        </div>
                      )}

                      {/* Actions */}
                      <div className="flex gap-2 pt-3 border-t border-gray-100 flex-wrap">
                        {product.status === "active" && (
                          <motion.button whileTap={{ scale:0.95 }}
                            onClick={() => updateStatus(product._id, "used")}
                            className="flex items-center gap-1.5 text-xs font-bold text-white px-3.5 py-2 rounded-xl transition-all shadow-sm" style={{ background: "linear-gradient(to right, #48A111, #3a8a0d)" }}>
                            <CheckCircle size={13}/> Used
                          </motion.button>
                        )}

                        {product.status !== "active" && (
                          <motion.button whileTap={{ scale:0.95 }}
                            onClick={() => updateStatus(product._id, "active")}
                            className="flex items-center gap-1.5 text-xs font-bold bg-gradient-to-r from-blue-500 to-indigo-600 text-white px-3.5 py-2 rounded-xl hover:from-blue-600 hover:to-indigo-700 transition-all shadow-sm">
                            <RotateCcw size={13}/> Restore
                          </motion.button>
                        )}

                        <motion.button whileTap={{ scale:0.95 }}
                          onClick={() => startEdit(product)}
                          className="flex items-center gap-1.5 text-xs font-bold text-white px-3.5 py-2 rounded-xl transition-all shadow-sm"
                          style={{ backgroundColor: '#111111' }}>
                          <Edit2 size={13} color="white"/> Edit
                        </motion.button>

                        <motion.button whileTap={{ scale:0.95 }}
                          onClick={() => deleteProduct(product._id)}
                          className="flex items-center gap-1.5 text-xs font-bold bg-white px-3.5 py-2 rounded-xl transition-all ml-auto"
                          style={{ border: '2px solid #FF0000', color: '#FF0000' }}>
                          <Trash2 size={13} color="#FF0000"/> Delete
                        </motion.button>
                      </div>
                    </>
                  )}
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {visible.length > 0 && (
        <div className="flex justify-center pt-2">
          <p className="text-xs font-semibold text-gray-500 px-4 py-2 bg-white border border-gray-200 rounded-full shadow-sm">
            Showing {visible.length} of {products.length} products
          </p>
        </div>
      )}
    </div>
  );
}