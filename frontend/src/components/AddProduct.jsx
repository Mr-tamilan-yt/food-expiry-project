import React, { useState, useRef, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import Webcam from 'react-webcam';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Camera, X, Calendar, Tag, MapPin, FileText, Package,
  Leaf, Wine, Snowflake, AlertCircle, CheckCircle, Loader,
  ChevronDown, RotateCcw, Trash2, Plus,
  Home, Refrigerator, Apple, Beef, Milk, Sandwich,
  ScanLine, Wand2, ChevronLeft, ChevronRight,
  Clock, AlertTriangle, Zap, TrendingUp,
} from 'lucide-react';

const G  = '#48A111';
const GD = '#41950F';

// ─────────────────────────────────────────────────────────────────────────────
//  PUTER AI
// ─────────────────────────────────────────────────────────────────────────────
function loadPuter() {
  return new Promise((resolve, reject) => {
    if (window.puter) { resolve(window.puter); return; }
    const s = document.createElement('script');
    s.src = 'https://js.puter.com/v2/';
    s.onload = () => {
      const wait = (n) => {
        if (window.puter) resolve(window.puter);
        else if (n <= 0) reject(new Error('puter.js failed to initialise'));
        else setTimeout(() => wait(n - 1), 100);
      };
      wait(30);
    };
    s.onerror = () => reject(new Error('Failed to load puter.js script'));
    document.head.appendChild(s);
  });
}

async function analyseWithPuter(dataUrl) {
  const puter = await loadPuter();
  const prompt = `You are reading a food product label. Find the expiry date, best before date, or use by date.
Reply with ONLY a raw JSON object — no markdown, no explanation, no code fences.
If date found: {"found": true, "date": "YYYY-MM-DD", "display": "exact text from label", "confidence": "high|medium|low"}
If no date: {"found": false}
Rules: "JUL 2026" → "2026-07-31", "NOV 2025" → "2025-11-30", "31/07/2026" → "2026-07-31"`;
  const response = await puter.ai.chat(prompt, dataUrl, { model: 'gpt-4o' });
  const raw = (typeof response === 'string' ? response : response?.message?.content || response?.toString() || '').trim();
  const clean = raw.replace(/```json\s*/gi, '').replace(/```/g, '').trim();
  return JSON.parse(clean);
}

// ─────────────────────────────────────────────────────────────────────────────
//  STATIC DATA
// ─────────────────────────────────────────────────────────────────────────────
const CATEGORIES = [
  { id:'dairy',      label:'Dairy',      icon:Milk,      bg:'#EFF6FF', color:'#2563EB' },
  { id:'vegetables', label:'Vegetables', icon:Leaf,      bg:'#F0FDF4', color:'#16A34A' },
  { id:'fruits',     label:'Fruits',     icon:Apple,     bg:'#DCFCE7', color:'#15803D' },
  { id:'meat',       label:'Meat',       icon:Beef,      bg:'#FFF1F2', color:'#E11D48' },
  { id:'grains',     label:'Grains',     icon:Package,   bg:'#FFFBEB', color:'#D97706' },
  { id:'beverages',  label:'Beverages',  icon:Wine,      bg:'#FAF5FF', color:'#7C3AED' },
  { id:'snacks',     label:'Snacks',     icon:Sandwich,  bg:'#FFF7ED', color:'#EA580C' },
  { id:'frozen',     label:'Frozen',     icon:Snowflake, bg:'#ECFEFF', color:'#0891B2' },
  { id:'other',      label:'Other',      icon:Package,   bg:'#F9FAFB', color:'#6B7280' },
];

const LOCATIONS = [
  { id:'pantry',       label:'Pantry',       icon:Home,         bg:'#FFFBEB', color:'#B45309' },
  { id:'refrigerator', label:'Refrigerator', icon:Refrigerator, bg:'#EFF6FF', color:'#1D4ED8' },
  { id:'freezer',      label:'Freezer',      icon:Snowflake,    bg:'#ECFEFF', color:'#0E7490' },
  { id:'cabinet',      label:'Cabinet',      icon:Package,      bg:'#F9FAFB', color:'#374151' },
  { id:'other',        label:'Other',        icon:MapPin,       bg:'#F9FAFB', color:'#6B7280' },
];

// Auto-guess category from product name
const CATEGORY_KEYWORDS = {
  Dairy:      ['milk','cheese','yogurt','yoghurt','butter','cream','curd','paneer','ghee','dairy'],
  Meat:       ['chicken','beef','pork','lamb','fish','salmon','tuna','shrimp','prawn','meat','mutton','turkey','sausage','bacon'],
  Vegetables: ['carrot','spinach','tomato','potato','onion','garlic','broccoli','cabbage','pepper','vegetable','capsicum','cucumber','lettuce'],
  Fruits:     ['apple','banana','orange','mango','grape','strawberry','blueberry','lemon','lime','pineapple','watermelon','fruit','berry'],
  Grains:     ['rice','wheat','oats','bread','pasta','flour','cereal','quinoa','barley','corn','grain','roti','noodle'],
  Beverages:  ['juice','water','soda','cola','tea','coffee','drink','beverage','smoothie','wine','beer'],
  Snacks:     ['chips','cookie','biscuit','cracker','chocolate','candy','snack','popcorn','nut','almond','cashew','wafer'],
  Frozen:     ['frozen','ice cream','pizza','nugget','fries'],
};

function guessCategory(name) {
  if (!name || name.length < 2) return '';
  const lower = name.toLowerCase();
  for (const [cat, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    if (keywords.some(kw => lower.includes(kw))) return cat;
  }
  return '';
}

function getDaysUntilExpiry(dateStr) {
  if (!dateStr) return null;
  const today = new Date(); today.setHours(0,0,0,0);
  const exp   = new Date(dateStr + 'T00:00:00'); exp.setHours(0,0,0,0);
  return Math.ceil((exp - today) / 86400000);
}

// ─────────────────────────────────────────────────────────────────────────────
//  COMPACT CALENDAR — small footprint, no year jump
// ─────────────────────────────────────────────────────────────────────────────
const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const DAY_LABELS  = ['S','M','T','W','T','F','S'];

function CompactCalendar({ value, onChange }) {
  const today    = new Date(); today.setHours(0,0,0,0);
  const initDate = value ? new Date(value + 'T00:00:00') : null;

  const [viewYear,  setViewYear]  = useState(initDate?.getFullYear() ?? today.getFullYear());
  const [viewMonth, setViewMonth] = useState(initDate?.getMonth()    ?? today.getMonth());
  const [open,      setOpen]      = useState(false);
  const wrapRef = useRef(null);

  // Sync view when AI fills value externally
  useEffect(() => {
    if (value) {
      const d = new Date(value + 'T00:00:00');
      setViewYear(d.getFullYear());
      setViewMonth(d.getMonth());
    }
  }, [value]);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const fn = (e) => { if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', fn);
    return () => document.removeEventListener('mousedown', fn);
  }, [open]);

  const prevMonth = () => {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1); }
    else setViewMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1); }
    else setViewMonth(m => m + 1);
  };

  // Build grid
  const firstDay    = new Date(viewYear, viewMonth, 1).getDay();
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const cells = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  const isPast     = (d) => d && new Date(viewYear, viewMonth, d) < today;
  const isSelected = (d) => {
    if (!d || !value) return false;
    const s = new Date(value + 'T00:00:00');
    return s.getFullYear() === viewYear && s.getMonth() === viewMonth && s.getDate() === d;
  };
  const isToday = (d) => d &&
    today.getFullYear() === viewYear && today.getMonth() === viewMonth && today.getDate() === d;

  const pickDay = (d) => {
    if (!d || isPast(d)) return;
    onChange(`${viewYear}-${String(viewMonth+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`);
    setOpen(false);
  };

  // Quick-pick shortcuts
  const quickPicks = [
    { label:'+3d',  days:3   },
    { label:'+1w',  days:7   },
    { label:'+2w',  days:14  },
    { label:'+1m',  days:30  },
    { label:'+3m',  days:90  },
    { label:'+6m',  days:180 },
    { label:'+1y',  days:365 },
  ];
  const applyQuick = (days) => {
    const d  = new Date(); d.setDate(d.getDate() + days);
    const y  = d.getFullYear();
    const mo = String(d.getMonth()+1).padStart(2,'0');
    const dd = String(d.getDate()).padStart(2,'0');
    onChange(`${y}-${mo}-${dd}`);
    setViewYear(y); setViewMonth(d.getMonth());
    setOpen(false);
  };

  const triggerLabel = value
    ? new Date(value + 'T00:00:00').toLocaleDateString('en-US',{ weekday:'short', month:'short', day:'numeric', year:'numeric' })
    : 'Select expiry date…';

  return (
    <div ref={wrapRef} className="relative">
      {/* ── Trigger button ── */}
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl border-2 text-sm text-left transition-all"
        style={{
          borderColor: value ? G : '#E5E7EB',
          background:  value ? `${G}08` : '#FAFAFA',
          color:       value ? '#1a2e1a' : '#9CA3AF',
        }}
      >
        <Calendar size={14} style={{ color: value ? G : '#9CA3AF', flexShrink:0 }}/>
        <span className="flex-1 font-semibold text-sm">{triggerLabel}</span>
        <motion.div animate={{ rotate: open ? 180 : 0 }} transition={{ duration:0.15 }}>
          <ChevronDown size={13} style={{ color: value ? G : '#9CA3AF' }}/>
        </motion.div>
      </button>

      {/* ── Dropdown ── */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity:0, y:4, scale:0.98 }}
            animate={{ opacity:1, y:0, scale:1    }}
            exit={{    opacity:0, y:4, scale:0.98 }}
            transition={{ duration:0.12, ease:'easeOut' }}
            className="absolute left-0 right-0 mt-1.5 z-50 bg-white rounded-xl border border-gray-200 shadow-xl overflow-hidden"
            style={{ maxWidth: '100%' }}
          >
            {/* Quick-pick row */}
            <div className="flex items-center gap-1 px-3 py-2 border-b border-gray-100 flex-wrap">
              <span className="text-[10px] font-bold text-gray-400 mr-0.5">Quick:</span>
              {quickPicks.map(q => (
                <button key={q.label} type="button" onClick={() => applyQuick(q.days)}
                  className="px-2 py-0.5 rounded-md text-[11px] font-bold border transition-all hover:scale-105 active:scale-95"
                  style={{ borderColor:`${G}35`, color:G, background:`${G}0A` }}>
                  {q.label}
                </button>
              ))}
            </div>

            {/* Month navigation */}
            <div className="flex items-center justify-between px-3 py-1.5">
              <button type="button" onClick={prevMonth}
                className="w-6 h-6 flex items-center justify-center rounded-lg hover:bg-gray-100 transition-colors">
                <ChevronLeft size={13} className="text-gray-500"/>
              </button>
              <span className="text-xs font-black text-gray-800">
                {MONTH_NAMES[viewMonth].slice(0,3)} {viewYear}
              </span>
              <button type="button" onClick={nextMonth}
                className="w-6 h-6 flex items-center justify-center rounded-lg hover:bg-gray-100 transition-colors">
                <ChevronRight size={13} className="text-gray-500"/>
              </button>
            </div>

            {/* Day-of-week headers */}
            <div className="grid grid-cols-7 px-2 pb-0.5">
              {DAY_LABELS.map((d,i) => (
                <div key={i} className="text-center text-[10px] font-black text-gray-400 py-0.5">{d}</div>
              ))}
            </div>

            {/* Day cells — compact h-7 */}
            <div className="grid grid-cols-7 px-2 pb-2.5 gap-y-0.5">
              {cells.map((d, i) => {
                if (!d) return <div key={`emp-${i}`}/>;
                const past = isPast(d);
                const sel  = isSelected(d);
                const tod  = isToday(d);
                return (
                  <button
                    key={d}
                    type="button"
                    disabled={past}
                    onClick={() => pickDay(d)}
                    className="w-full h-7 flex items-center justify-center rounded-lg text-[12px] transition-colors"
                    style={{
                      background: sel ? G        : tod ? `${G}18` : 'transparent',
                      color:      sel ? '#fff'   : past ? '#D1D5DB' : tod ? G : '#111827',
                      fontWeight: sel ? 900 : tod ? 800 : 700,
                      cursor:     past ? 'not-allowed' : 'pointer',
                    }}
                    onMouseEnter={e => { if (!past && !sel) e.currentTarget.style.background = `${G}15`; }}
                    onMouseLeave={e => { if (!past && !sel) e.currentTarget.style.background = 'transparent'; }}
                  >
                    {d}
                  </button>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
//  TOAST
// ─────────────────────────────────────────────────────────────────────────────
function Toast({ productName, onDone }) {
  useEffect(() => {
    const t = setTimeout(onDone, 3000);
    return () => clearTimeout(t);
  }, [onDone]);

  return (
    <motion.div
      initial={{ opacity:0, y:-20, scale:0.95 }}
      animate={{ opacity:1, y:0,   scale:1    }}
      exit={{    opacity:0, y:-12, scale:0.95 }}
      transition={{ type:'spring', stiffness:340, damping:26 }}
      className="fixed top-5 left-1/2 z-9999 flex items-center gap-3 px-5 py-3 rounded-2xl shadow-2xl border overflow-hidden"
      style={{
        transform:'translateX(-50%)',
        background:'linear-gradient(135deg,#0f2d0f,#1a4d1a)',
        borderColor:`${G}50`,
        minWidth:260, maxWidth:380,
      }}
    >
      <motion.div initial={{ scale:0 }} animate={{ scale:1 }}
        transition={{ delay:0.1, type:'spring', stiffness:420, damping:18 }}
        className="w-7 h-7 rounded-xl flex items-center justify-center shrink-0"
        style={{ background:`${G}30` }}>
        <CheckCircle size={15} style={{ color:G }}/>
      </motion.div>
      <div className="flex-1 min-w-0">
        <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color:`${G}90` }}>Product Added</p>
        <p className="text-sm font-black text-white truncate">"{productName}"</p>
      </div>
      {/* Drain bar */}
      <div className="absolute bottom-0 left-0 right-0 h-0.75" style={{ background:'rgba(255,255,255,0.08)' }}>
        <motion.div initial={{ width:'100%' }} animate={{ width:'0%' }}
          transition={{ duration:3, ease:'linear' }}
          className="h-full" style={{ background:G }}/>
      </div>
    </motion.div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
//  RECENTLY ADDED — smart notification bar + list
// ─────────────────────────────────────────────────────────────────────────────
function getExpiryChip(dateStr) {
  const days = getDaysUntilExpiry(dateStr);
  if (days === null)  return { label:'—',        color:'#6B7280', bg:'#F9FAFB', dot:'#9CA3AF' };
  if (days < 0)       return { label:'Expired',  color:'#DC2626', bg:'#FEF2F2', dot:'#EF4444', urgent:true  };
  if (days === 0)     return { label:'Today!',   color:'#DC2626', bg:'#FEF2F2', dot:'#EF4444', urgent:true  };
  if (days <= 3)      return { label:`${days}d`, color:'#DC2626', bg:'#FEF2F2', dot:'#EF4444', urgent:true  };
  if (days <= 7)      return { label:`${days}d`, color:'#D97706', bg:'#FFFBEB', dot:'#F59E0B', warn:true    };
  if (days <= 14)     return { label:`${days}d`, color:'#D97706', bg:'#FFFBEB', dot:'#F59E0B'               };
  return                     { label:`${days}d`, color:G,         bg:`${G}0D`,  dot:G                       };
}

function SmartNotificationBar({ products }) {
  const urgent = products.filter(p => { const d = getDaysUntilExpiry(p.expiryDate); return d !== null && d <= 3; });
  const warn   = products.filter(p => { const d = getDaysUntilExpiry(p.expiryDate); return d !== null && d > 3 && d <= 7; });

  if (products.length === 0) return null;

  if (urgent.length > 0) {
    const names = urgent.slice(0,2).map(p => `"${p.name}"`).join(', ') + (urgent.length > 2 ? ` +${urgent.length-2} more` : '');
    return (
      <motion.div initial={{ opacity:0, y:-4 }} animate={{ opacity:1, y:0 }}
        className="flex items-start gap-2.5 px-3.5 py-2.5 rounded-xl border text-xs font-medium mb-3"
        style={{ background:'#FEF2F2', borderColor:'#FECACA', color:'#991B1B' }}>
        <AlertTriangle size={13} className="shrink-0 mt-0.5 text-red-500"/>
        <span><strong className="font-bold">{urgent.length} item{urgent.length>1?'s':''}</strong> you just added expire{urgent.length===1?'s':''} very soon — use {names} before it's too late.</span>
      </motion.div>
    );
  }
  if (warn.length > 0) {
    const names = warn.slice(0,2).map(p => `"${p.name}"`).join(', ') + (warn.length > 2 ? ` +${warn.length-2} more` : '');
    return (
      <motion.div initial={{ opacity:0, y:-4 }} animate={{ opacity:1, y:0 }}
        className="flex items-start gap-2.5 px-3.5 py-2.5 rounded-xl border text-xs font-medium mb-3"
        style={{ background:'#FFFBEB', borderColor:'#FDE68A', color:'#92400E' }}>
        <Clock size={13} className="shrink-0 mt-0.5 text-amber-500"/>
        <span><strong className="font-bold">{warn.length} item{warn.length>1?'s':''}</strong> expiring this week — plan to use {names} soon.</span>
      </motion.div>
    );
  }
  return (
    <motion.div initial={{ opacity:0, y:-4 }} animate={{ opacity:1, y:0 }}
      className="flex items-center gap-2 px-3.5 py-2 rounded-xl border text-xs font-medium mb-3"
      style={{ background:`${G}08`, borderColor:`${G}25`, color:GD }}>
      <TrendingUp size={12} style={{ color:G }}/>
      <span>All recently added items look good — great stocking!</span>
    </motion.div>
  );
}

function RecentlyAddedSection({ items }) {
  if (items.length === 0) return null;
  return (
    <motion.div initial={{ opacity:0, y:8 }} animate={{ opacity:1, y:0 }}
      transition={{ duration:0.25 }}
      className="rounded-2xl border-2 bg-white p-4"
      style={{ borderColor:`${G}30` }}>
      {/* Header */}
      <div className="flex items-center gap-2 mb-3">
        <div className="w-6 h-6 rounded-lg flex items-center justify-center" style={{ background:`${G}20` }}>
          <Zap size={11} style={{ color:G }}/>
        </div>
        <span className="text-sm font-black text-gray-800">Recently Added</span>
        <span className="ml-auto text-[10px] font-bold px-2 py-0.5 rounded-full"
          style={{ background:`${G}15`, color:G }}>
          {items.length} item{items.length>1?'s':''}
        </span>
      </div>
      {/* Smart bar */}
      <SmartNotificationBar products={items}/>
      {/* List */}
      <div className="space-y-1.5">
        {items.map((item, i) => {
          const chip    = getExpiryChip(item.expiryDate);
          const catData = CATEGORIES.find(c => c.label === item.category);
          const Icon    = catData?.icon || Package;
          return (
            <motion.div key={item._id || i}
              initial={{ opacity:0, x:-6 }} animate={{ opacity:1, x:0 }}
              transition={{ delay: i*0.04 }}
              className="flex items-center gap-2.5 px-3 py-2 rounded-xl border"
              style={{
                background:   chip.urgent ? '#FEF2F2' : chip.warn ? '#FFFBEB' : '#FAFAFA',
                borderColor:  chip.urgent ? '#FECACA' : chip.warn ? '#FDE68A' : '#F3F4F6',
              }}
            >
              <div className="shrink-0 w-7 h-7 rounded-lg flex items-center justify-center"
                style={{ background: catData ? `${catData.color}18` : '#F3F4F6' }}>
                <Icon size={13} style={{ color: catData?.color || '#6B7280' }}/>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-gray-900 truncate">{item.name}</p>
                <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                  {item.category && item.category !== 'Other' && (
                    <span className="text-[10px] text-gray-400 font-medium">{item.category}</span>
                  )}
                  {item.location && item.location !== 'Other' && (
                    <>
                      <span className="text-[10px] text-gray-300">·</span>
                      <span className="text-[10px] text-gray-400 font-medium flex items-center gap-0.5">
                        <MapPin size={8}/>{item.location}
                      </span>
                    </>
                  )}
                </div>
              </div>
              <div className="shrink-0 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full" style={{ background:chip.dot }}/>
                <span className="text-[11px] font-black px-2 py-0.5 rounded-full"
                  style={{ background:chip.bg, color:chip.color }}>
                  {chip.label}
                </span>
              </div>
            </motion.div>
          );
        })}
      </div>
    </motion.div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
//  ACCORDION SECTION
// ─────────────────────────────────────────────────────────────────────────────
function Section({ title, icon: Icon, open, onToggle, badge, children }) {
  return (
    <div className="rounded-2xl overflow-hidden border-2 transition-all"
      style={{ borderColor: open ? G : '#E2E8E0', background:'white' }}>
      <button type="button" onClick={onToggle}
        className="w-full flex items-center justify-between px-5 py-4 text-left transition-colors"
        style={{ background: open ? `${G}0D` : 'white' }}>
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center"
            style={{ background: open ? `${G}20` : '#F3F4F6' }}>
            <Icon size={18} style={{ color: open ? G : '#6B7280' }}/>
          </div>
          <div>
            <span className="text-sm font-bold text-gray-800">{title}</span>
            {badge && (
              <span className="ml-2 text-xs font-semibold px-2 py-0.5 rounded-full"
                style={{ background:`${G}20`, color:G }}>{badge}</span>
            )}
          </div>
        </div>
        <motion.div animate={{ rotate: open ? 180 : 0 }} transition={{ duration:0.18 }}>
          <ChevronDown size={18} style={{ color:G }}/>
        </motion.div>
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div key="body"
            initial={{ height:0, opacity:0 }} animate={{ height:'auto', opacity:1 }} exit={{ height:0, opacity:0 }}
            transition={{ duration:0.22, ease:'easeInOut' }} style={{ overflow:'hidden' }}>
            <div className="px-5 pb-5 pt-1 border-t border-gray-100">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
//  MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────────────────
export default function AddProduct() {
  const EMPTY = { name:'', category:'', expiryDate:'', location:'', notes:'' };

  const [formData,      setFormData]      = useState(EMPTY);
  const [loading,       setLoading]       = useState(false);
  const [message,       setMessage]       = useState({ type:'', text:'' });
  const [showCamera,    setShowCamera]    = useState(false);
  const [capturedImage, setCapturedImage] = useState(null);
  const [aiLoading,     setAiLoading]     = useState(false);
  const [aiStatus,      setAiStatus]      = useState('');
  const [scanResult,    setScanResult]    = useState(null);
  const [toast,         setToast]         = useState(null);
  // Session-level recently added list (cleared on page reload — intentional)
  const [recentItems,   setRecentItems]   = useState([]);

  const [scanOpen,     setScanOpen]     = useState(false);
  const [categoryOpen, setCategoryOpen] = useState(false);
  const [locationOpen, setLocationOpen] = useState(false);

  const webcamRef = useRef(null);
  const navigate  = useNavigate();

  useEffect(() => { loadPuter().catch(() => {}); }, []);

  // ── Input change + auto-suggest category ──────────────────────────────────
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => {
      const next = { ...prev, [name]: value };
      if (name === 'name' && !prev.category) {
        const g = guessCategory(value);
        if (g) next.category = g;
      }
      return next;
    });
  };

  // ── Camera ────────────────────────────────────────────────────────────────
  const openCamera = () => { setCapturedImage(null); setScanResult(null); setMessage({ type:'', text:'' }); setShowCamera(true); };
  const capture    = useCallback(() => {
    const img = webcamRef.current.getScreenshot({ width:1280, height:720 });
    setCapturedImage(img); setShowCamera(false);
  }, []);
  const retake  = () => { setCapturedImage(null); setScanResult(null); setShowCamera(true); };
  const discard = () => { setCapturedImage(null); setScanResult(null); setShowCamera(false); };

  // ── AI analysis ───────────────────────────────────────────────────────────
  const analyseImage = async () => {
    if (!capturedImage) return;
    setAiLoading(true); setScanResult(null);
    setMessage({ type:'', text:'' }); setAiStatus('Connecting to AI…');
    try {
      const result = await analyseWithPuter(capturedImage);
      setScanResult(result);
      if (result.found && result.date) {
        setFormData(prev => ({ ...prev, expiryDate: result.date }));
        const display = new Date(result.date+'T00:00:00').toLocaleDateString('en-US',{year:'numeric',month:'long',day:'numeric'});
        setMessage({ type:'success', text:`Date found: ${result.display || display} — filled below.` });
      } else {
        setMessage({ type:'info', text:'No date detected. Please enter the expiry date manually.' });
      }
    } catch (err) {
      let txt = 'AI analysis failed. Please enter the date manually.';
      if (err.message?.includes('sign') || err.message?.includes('auth'))
        txt = 'Puter AI needs a free sign-in. A login popup may appear — sign in once and retry.';
      else if (err.message?.includes('Failed to load'))
        txt = 'Could not connect to AI. Check your internet and retry.';
      else if (err.message) txt = `Error: ${err.message}`;
      setMessage({ type:'error', text:txt });
    } finally { setAiLoading(false); setAiStatus(''); }
  };

  // ── Submit ─────────────────────────────────────────────────────────────────
  // KEY FIX: always send non-empty strings for category + location
  // because the backend Product model has required:true for both fields.
  // We never modify the backend model — only ensure the frontend payload is valid.
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name)       { setMessage({ type:'error', text:'Product name is required.'  }); return; }
    if (!formData.expiryDate) { setMessage({ type:'error', text:'Expiry date is required.'   }); return; }

    setLoading(true); setMessage({ type:'', text:'' });
    try {
      const payload = {
        name:       formData.name,
        expiryDate: formData.expiryDate,
        // Always send a valid string — backend required: true won't reject
        category:   formData.category || 'Other',
        location:   formData.location || 'Other',
        notes:      formData.notes,
      };

      const { data: saved } = await axios.post('/api/products', payload);
      const savedName = formData.name;

      // Add to local recently-added list (newest first, max 10)
      setRecentItems(prev => [saved, ...prev].slice(0, 10));

      // Reset form for next product
      setFormData(EMPTY);
      setScanResult(null);
      setCapturedImage(null);
      setScanOpen(false);
      setCategoryOpen(false);
      setLocationOpen(false);

      // Show toast — NO auto-redirect
      setToast(savedName);
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Unknown server error';
      setMessage({ type:'error', text:`Error: ${msg}` });
    } finally { setLoading(false); }
  };

  const canSubmit = !!formData.name && !!formData.expiryDate;

  // ─────────────────────────────────────────────────────────────────────────
  //  RENDER
  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="max-w-2xl mx-auto pb-10" style={{ fontFamily:"'DM Sans', sans-serif" }}>

      {/* Toast */}
      <AnimatePresence>
        {toast && <Toast productName={toast} onDone={() => setToast(null)}/>}
      </AnimatePresence>

      {/* Page header */}
      <div className="mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl flex items-center justify-center shadow-md"
            style={{ background:`linear-gradient(135deg,${G},${GD})` }}>
            <Plus size={20} className="text-white"/>
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-tight" style={{ color:'#1A2E1A' }}>Add New Product</h1>
            <p className="text-xs font-medium text-gray-500 mt-0.5">
              Name &amp; expiry date required · category, location and notes are optional
            </p>
          </div>
        </div>
      </div>

      {/* Alert banner (errors / AI info) */}
      <AnimatePresence>
        {message.text && (
          <motion.div
            initial={{ opacity:0, y:-8 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0, y:-8 }}
            className="mb-4 px-4 py-3 rounded-2xl border flex items-start gap-3 text-sm font-medium"
            style={{
              background:  message.type==='success'?'#F0FDF4':message.type==='error'?'#FFF1F2':'#EFF6FF',
              borderColor: message.type==='success'?'#BBF7D0':message.type==='error'?'#FECDD3':'#BFDBFE',
              color:       message.type==='success'?'#15803D':message.type==='error'?'#BE123C':'#1D4ED8',
            }}
          >
            {message.type==='success' ? <CheckCircle size={17} className="shrink-0 mt-0.5"/> :
             message.type==='error'   ? <AlertCircle size={17} className="shrink-0 mt-0.5"/> :
                                        <Wand2       size={17} className="shrink-0 mt-0.5"/>}
            {message.text}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="space-y-3.5">

        {/* ── 1. Product Name ── */}
        <div className="rounded-2xl border-2 bg-white p-5 transition-all"
          style={{ borderColor: formData.name ? G : '#E2E8E0' }}>
          <label className="flex items-center gap-2 text-sm font-bold text-gray-700 mb-3">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background:`${G}20` }}>
              <Package size={14} style={{ color:G }}/>
            </div>
            Product Name <span style={{ color:'#EF4444' }}>*</span>
          </label>
          <input
            type="text" name="name" value={formData.name} onChange={handleChange}
            placeholder="e.g., Organic Milk, Fresh Apples, Turmeric…"
            className="w-full px-4 py-2.5 rounded-xl border-2 text-sm font-medium text-gray-800 placeholder-gray-400 outline-none transition-all"
            style={{ borderColor: formData.name?G:'#E5E7EB', background: formData.name?`${G}08`:'#FAFAFA' }}
          />
          {/* Auto-suggested category chip */}
          <AnimatePresence>
            {formData.category && (
              <motion.div initial={{ opacity:0, y:3 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0 }}
                className="mt-2 flex items-center gap-1.5">
                <span className="text-[11px] text-gray-400">Category suggestion:</span>
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full"
                  style={{ background:`${G}18`, color:G }}>{formData.category}</span>
                <button type="button" onClick={() => setFormData(p=>({...p, category:''}))}
                  className="text-gray-400 hover:text-gray-600 transition-colors"><X size={11}/></button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* ── 2. AI Expiry Scanner (accordion) ── */}
        <Section title="AI Expiry Scanner" icon={Wand2}
          open={scanOpen} onToggle={() => setScanOpen(s=>!s)}
          badge={formData.expiryDate ? 'Date set ✓' : null}>

          {!showCamera && !capturedImage && (
            <div className="text-center py-4">
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-3"
                style={{ background:`${G}15` }}>
                <ScanLine size={26} style={{ color:G }}/>
              </div>
              <p className="text-sm text-gray-500 mb-4 max-w-xs mx-auto">
                Take a photo of the expiry date — AI reads it and fills the field automatically
              </p>
              <button type="button" onClick={openCamera}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-white shadow-md hover:opacity-90 active:scale-95 transition-all"
                style={{ background:`linear-gradient(135deg,${G},${GD})` }}>
                <Camera size={15}/> Open Camera
              </button>
            </div>
          )}

          {showCamera && (
            <div className="space-y-3">
              <div className="relative rounded-xl overflow-hidden bg-gray-900">
                <Webcam audio={false} ref={webcamRef}
                  screenshotFormat="image/jpeg" screenshotQuality={0.95}
                  videoConstraints={{ width:1280, height:720, facingMode:'environment' }}
                  className="w-full h-auto"/>
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="relative w-64 h-24">
                    {[['top-0 left-0','border-t-4 border-l-4 rounded-tl-lg'],
                      ['top-0 right-0','border-t-4 border-r-4 rounded-tr-lg'],
                      ['bottom-0 left-0','border-b-4 border-l-4 rounded-bl-lg'],
                      ['bottom-0 right-0','border-b-4 border-r-4 rounded-br-lg']
                    ].map(([pos,cls],i) => (
                      <div key={i} className={`absolute w-7 h-7 border-emerald-400 ${pos} ${cls}`}/>
                    ))}
                    <motion.div animate={{ top:['8%','80%','8%'] }}
                      transition={{ duration:2, repeat:Infinity, ease:'easeInOut' }}
                      style={{ position:'absolute', left:6, right:6, height:2, background:G, boxShadow:`0 0 8px ${G}` }}
                      className="rounded"/>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-[10px] text-emerald-300 font-bold tracking-widest bg-black/50 px-2 py-0.5 rounded">ALIGN DATE</span>
                    </div>
                  </div>
                </div>
                <div className="absolute bottom-3 left-0 right-0 flex justify-center gap-2">
                  <button onClick={capture}
                    className="px-5 py-2.5 rounded-xl text-sm font-bold text-white flex items-center gap-2 shadow-lg"
                    style={{ background:`linear-gradient(135deg,${G},${GD})` }}>
                    <Camera size={15}/> Capture
                  </button>
                  <button onClick={() => setShowCamera(false)}
                    className="px-4 py-2.5 rounded-xl text-sm font-bold text-white bg-gray-700 flex items-center gap-1.5">
                    <X size={14}/> Cancel
                  </button>
                </div>
              </div>
              <p className="text-xs text-center text-gray-400">Make sure the date is sharp and well-lit</p>
            </div>
          )}

          {capturedImage && !showCamera && (
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl overflow-hidden border border-gray-200 shadow-sm">
                <img src={capturedImage} alt="Captured" className="w-full h-auto"/>
              </div>
              <div className="flex flex-col gap-2">
                {scanResult && (
                  <motion.div initial={{ opacity:0, scale:0.96 }} animate={{ opacity:1, scale:1 }}
                    className="p-3 rounded-xl border text-sm"
                    style={{ background:scanResult.found?'#F0FDF4':'#FFFBEB', borderColor:scanResult.found?'#BBF7D0':'#FDE68A' }}>
                    {scanResult.found ? (
                      <>
                        <div className="flex items-center gap-1.5 mb-1">
                          <CheckCircle size={13} style={{ color:G }}/>
                          <span className="font-bold text-xs" style={{ color:G }}>Date found!</span>
                        </div>
                        <p className="font-black text-gray-900 text-base">{scanResult.display || scanResult.date}</p>
                        <p className="text-xs text-gray-400 mt-0.5">↓ Auto-filled below</p>
                      </>
                    ) : (
                      <div className="flex items-start gap-1.5">
                        <AlertCircle size={13} className="text-amber-500 shrink-0 mt-0.5"/>
                        <p className="text-xs font-semibold text-amber-800">No date found — enter manually</p>
                      </div>
                    )}
                  </motion.div>
                )}
                {aiLoading && (
                  <div className="p-3 rounded-xl border text-xs font-medium flex items-center gap-2"
                    style={{ background:`${G}0D`, borderColor:`${G}30`, color:G }}>
                    <Loader className="animate-spin shrink-0" size={13}/>
                    <span>{aiStatus}</span>
                  </div>
                )}
                {!scanResult && !aiLoading && (
                  <button onClick={analyseImage} type="button"
                    className="flex-1 flex flex-col items-center justify-center gap-1.5 py-4 rounded-xl text-white font-bold text-sm shadow-md hover:opacity-90 active:scale-95"
                    style={{ background:`linear-gradient(135deg,${G},${GD})` }}>
                    <Wand2 size={18}/>
                    <span>Analyse with AI</span>
                  </button>
                )}
                {scanResult && !aiLoading && (
                  <button onClick={analyseImage} type="button"
                    className="py-1.5 rounded-xl text-xs font-bold border-2 hover:opacity-80 transition-all"
                    style={{ borderColor:G, color:G }}>
                    Re-analyse
                  </button>
                )}
                <div className="flex gap-2">
                  <button onClick={retake} type="button"
                    className="flex-1 py-1.5 rounded-xl text-xs font-bold border-2 border-gray-200 text-gray-600 hover:bg-gray-50 flex items-center justify-center gap-1 transition-all">
                    <RotateCcw size={11}/> Retake
                  </button>
                  <button onClick={discard} type="button"
                    className="flex-1 py-1.5 rounded-xl text-xs font-bold border-2 text-red-500 flex items-center justify-center gap-1 hover:bg-red-50 transition-all"
                    style={{ borderColor:'#FF0000' }}>
                    <Trash2 size={11}/> Discard
                  </button>
                </div>
              </div>
            </div>
          )}
        </Section>

        {/* ── 3. Expiry Date — compact calendar ── */}
        <div className="rounded-2xl border-2 bg-white p-5 transition-all"
          style={{ borderColor: formData.expiryDate ? G : '#E2E8E0' }}>
          <label className="flex items-center gap-2 text-sm font-bold text-gray-700 mb-3">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center"
              style={{ background: formData.expiryDate ? `${G}20` : '#F3F4F6' }}>
              <Calendar size={14} style={{ color: formData.expiryDate ? G : '#6B7280' }}/>
            </div>
            Expiry Date <span style={{ color:'#EF4444' }}>*</span>
            {scanResult?.found && formData.expiryDate && (
              <span className="ml-1 text-[11px] font-bold px-2 py-0.5 rounded-full"
                style={{ background:`${G}20`, color:G }}>✓ AI filled</span>
            )}
          </label>

          <CompactCalendar
            value={formData.expiryDate}
            onChange={(val) => setFormData(prev => ({ ...prev, expiryDate: val }))}
          />

          {formData.expiryDate && (
            <p className="mt-1.5 text-xs text-gray-400 font-medium">
              {new Date(formData.expiryDate+'T00:00:00').toLocaleDateString('en-US',{weekday:'long',year:'numeric',month:'long',day:'numeric'})}
            </p>
          )}
        </div>

        {/* ── 4. Category (optional accordion) ── */}
        <Section title="Category" icon={Tag}
          open={categoryOpen} onToggle={() => setCategoryOpen(s=>!s)}
          badge={formData.category || null}>
          <div className="grid grid-cols-3 gap-2 pt-1">
            {CATEGORIES.map(cat => {
              const Icon = cat.icon;
              const sel  = formData.category === cat.label;
              return (
                <button key={cat.id} type="button"
                  onClick={() => { setFormData(prev=>({...prev,category:cat.label})); setCategoryOpen(false); }}
                  className="flex flex-col items-center gap-1.5 py-3 px-2 rounded-xl border-2 text-xs font-bold transition-all active:scale-95"
                  style={{ borderColor:sel?G:'#E5E7EB', background:sel?`${G}12`:cat.bg, color:sel?G:cat.color }}>
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center"
                    style={{ background:sel?`${G}20`:`${cat.color}18` }}>
                    <Icon size={16} style={{ color:sel?G:cat.color }}/>
                  </div>
                  {cat.label}
                </button>
              );
            })}
          </div>
        </Section>

        {/* ── 5. Storage Location (optional accordion) ── */}
        <Section title="Storage Location" icon={MapPin}
          open={locationOpen} onToggle={() => setLocationOpen(s=>!s)}
          badge={formData.location || null}>
          <div className="grid grid-cols-2 gap-2 pt-1 sm:grid-cols-3">
            {LOCATIONS.map(loc => {
              const Icon = loc.icon;
              const sel  = formData.location === loc.label;
              return (
                <button key={loc.id} type="button"
                  onClick={() => { setFormData(prev=>({...prev,location:loc.label})); setLocationOpen(false); }}
                  className="flex items-center gap-2.5 px-3 py-3 rounded-xl border-2 text-sm font-bold transition-all active:scale-95"
                  style={{ borderColor:sel?G:'#E5E7EB', background:sel?`${G}12`:loc.bg, color:sel?G:loc.color }}>
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                    style={{ background:sel?`${G}20`:`${loc.color}18` }}>
                    <Icon size={14} style={{ color:sel?G:loc.color }}/>
                  </div>
                  {loc.label}
                </button>
              );
            })}
          </div>
        </Section>

        {/* ── 6. Notes (optional) ── */}
        <div className="rounded-2xl border-2 bg-white p-5 transition-all"
          style={{ borderColor: formData.notes ? G : '#E2E8E0' }}>
          <label className="flex items-center gap-2 text-sm font-bold text-gray-700 mb-3">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center"
              style={{ background: formData.notes ? `${G}20` : '#F3F4F6' }}>
              <FileText size={14} style={{ color: formData.notes ? G : '#6B7280' }}/>
            </div>
            Notes <span className="font-normal text-gray-400 text-xs">(optional)</span>
          </label>
          <textarea name="notes" value={formData.notes} onChange={handleChange} rows={2}
            placeholder="Any special notes about this product…"
            className="w-full px-4 py-2.5 rounded-xl border-2 text-sm font-medium text-gray-800 placeholder-gray-400 outline-none transition-all resize-none"
            style={{ borderColor:formData.notes?G:'#E5E7EB', background:formData.notes?`${G}08`:'#FAFAFA' }}
          />
        </div>

        {/* ── Action buttons ── */}
        <div className="flex gap-3 pt-1">
          <button type="button" onClick={() => navigate('/dashboard')}
            className="flex-1 py-3.5 rounded-2xl text-sm font-bold border-2 border-gray-300 text-gray-600 hover:bg-gray-50 transition-all active:scale-95">
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading || !canSubmit}
            className="flex-2 py-3.5 rounded-2xl text-sm font-bold text-white flex items-center justify-center gap-2 shadow-lg transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
            style={{
              background: loading||!canSubmit ? '#9CA3AF' : `linear-gradient(135deg,${G},${GD})`,
              minWidth: 160,
            }}>
            {loading
              ? <><Loader className="animate-spin" size={15}/> Adding…</>
              : <><Plus size={15}/> Add Product</>}
          </button>
        </div>

        {/* Required hint */}
        {(!formData.name || !formData.expiryDate) && (
          <p className="text-center text-[11px] text-gray-400">
            <span style={{ color:'#EF4444' }}>*</span> Name and expiry date are required
          </p>
        )}

        {/* ── Recently Added ── */}
        <RecentlyAddedSection items={recentItems}/>

      </div>
    </div>
  );
}