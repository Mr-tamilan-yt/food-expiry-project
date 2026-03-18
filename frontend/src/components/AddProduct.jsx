import React, { useState, useRef, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import Webcam from 'react-webcam';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Camera, X, Calendar, Tag, MapPin, FileText, Package,
  Leaf, Wine, Snowflake, AlertCircle, CheckCircle, Loader,
  ChevronRight, ChevronDown, RotateCcw, Trash2, Plus,
  Home, Refrigerator, Apple, Beef, Milk, Sandwich,
  ScanLine, Wand2, Zap,
} from 'lucide-react';

// ── Theme colours ─────────────────────────────────────────────────────────────
const G  = '#48A111';   // primary green
const GD = '#41950F';   // darker green (replaces #059669)
const BG = '#DBE4C9';   // page background

// ── Puter AI ──────────────────────────────────────────────────────────────────
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

// ── Data ──────────────────────────────────────────────────────────────────────
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

// ── Accordion section wrapper ─────────────────────────────────────────────────
function Section({ title, icon: Icon, open, onToggle, badge, children }) {
  return (
    <div className="rounded-2xl overflow-hidden border-2 transition-all"
      style={{ borderColor: open ? G : '#E2E8E0', background:'white' }}>
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center justify-between px-5 py-4 text-left transition-colors"
        style={{ background: open ? `${G}0D` : 'white' }}
      >
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center"
            style={{ background: open ? `${G}20` : '#F3F4F6' }}>
            <Icon size={18} style={{ color: open ? G : '#6B7280' }}/>
          </div>
          <div>
            <span className="text-sm font-bold text-gray-800">{title}</span>
            {badge && (
              <span className="ml-2 text-xs font-semibold px-2 py-0.5 rounded-full"
                style={{ background:`${G}20`, color: G }}>
                {badge}
              </span>
            )}
          </div>
        </div>
        <ChevronDown
          size={18}
          className="transition-transform duration-300"
          style={{ color: G, transform: open ? 'rotate(180deg)' : 'rotate(0deg)' }}
        />
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            key="content"
            initial={{ height:0, opacity:0 }}
            animate={{ height:'auto', opacity:1 }}
            exit={{ height:0, opacity:0 }}
            transition={{ duration:0.25, ease:'easeInOut' }}
            style={{ overflow:'hidden' }}
          >
            <div className="px-5 pb-5 pt-1 border-t border-gray-100">
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function AddProduct() {
  const [formData, setFormData] = useState({
    name:'', category:'', expiryDate:'', location:'', notes:'',
  });
  const [loading,       setLoading]       = useState(false);
  const [message,       setMessage]       = useState({ type:'', text:'' });
  const [showCamera,    setShowCamera]    = useState(false);
  const [capturedImage, setCapturedImage] = useState(null);
  const [aiLoading,     setAiLoading]     = useState(false);
  const [aiStatus,      setAiStatus]      = useState('');
  const [scanResult,    setScanResult]    = useState(null);

  // Accordion open states
  const [scanOpen,     setScanOpen]     = useState(false);
  const [categoryOpen, setCategoryOpen] = useState(false);
  const [locationOpen, setLocationOpen] = useState(false);

  const webcamRef = useRef(null);
  const navigate  = useNavigate();

  useEffect(() => { loadPuter().catch(() => {}); }, []);

  // ── Camera ─────────────────────────────────────────────────────────────────
  const openCamera = () => {
    setCapturedImage(null); setScanResult(null);
    setMessage({ type:'', text:'' }); setShowCamera(true);
  };

  const capture = useCallback(() => {
    const img = webcamRef.current.getScreenshot({ width:1280, height:720 });
    setCapturedImage(img); setShowCamera(false);
  }, [webcamRef]);

  const retake  = () => { setCapturedImage(null); setScanResult(null); setShowCamera(true); };
  const discard = () => { setCapturedImage(null); setScanResult(null); setShowCamera(false); };

  // ── AI ─────────────────────────────────────────────────────────────────────
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
        setMessage({ type:'success', text:`Expiry date found: ${result.display || display} — filled below.` });
      } else {
        setMessage({ type:'info', text:'No date detected. Please enter the expiry date manually below.' });
      }
    } catch (err) {
      let txt = 'AI analysis failed. Please enter the date manually.';
      if (err.message?.includes('sign') || err.message?.includes('auth')) txt = 'Puter AI needs a free sign-in. A login popup may appear — sign in once and retry.';
      else if (err.message?.includes('Failed to load')) txt = 'Could not connect to AI. Check your internet and retry.';
      else if (err.message) txt = `Error: ${err.message}`;
      setMessage({ type:'error', text: txt });
    } finally { setAiLoading(false); setAiStatus(''); }
  };

  // ── Form ───────────────────────────────────────────────────────────────────
  const handleChange = e => setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));

  const handleSubmit = async e => {
    e.preventDefault();
    if (!formData.name) { setMessage({ type:'error', text:'Product name is required.' }); return; }
    setLoading(true); setMessage({ type:'', text:'' });
    try {
      await axios.post('/api/products', formData);
      setMessage({ type:'success', text:'Product added successfully!' });
      setTimeout(() => navigate('/dashboard'), 1800);
    } catch (err) {
      setMessage({ type:'error', text:'Error: '+(err.response?.data?.message||'Unknown error') });
    } finally { setLoading(false); }
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="max-w-2xl mx-auto pb-10" style={{ fontFamily:"'DM Sans', sans-serif" }}>

      {/* ── Page header ── */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-1">
          <div className="w-10 h-10 rounded-2xl flex items-center justify-center shadow-md"
            style={{ background:`linear-gradient(135deg, ${G}, ${GD})` }}>
            <Plus size={20} className="text-white"/>
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-tight" style={{ color:'#1A2E1A' }}>
              Add New Product
            </h1>
            <p className="text-xs font-medium text-gray-500 mt-0.5">
              Fill in the details below to track this item
            </p>
          </div>
        </div>
      </div>

      {/* ── Alert message ── */}
      <AnimatePresence>
        {message.text && (
          <motion.div
            initial={{ opacity:0, y:-8 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0, y:-8 }}
            className="mb-5 px-4 py-3 rounded-2xl border flex items-start gap-3 text-sm font-medium"
            style={{
              background: message.type==='success' ? '#F0FDF4' : message.type==='error' ? '#FFF1F2' : '#EFF6FF',
              borderColor: message.type==='success' ? '#BBF7D0' : message.type==='error' ? '#FECDD3' : '#BFDBFE',
              color: message.type==='success' ? '#15803D' : message.type==='error' ? '#BE123C' : '#1D4ED8',
            }}
          >
            {message.type==='success' ? <CheckCircle size={18} className="shrink-0 mt-0.5"/> :
             message.type==='error'   ? <AlertCircle size={18} className="shrink-0 mt-0.5"/> :
                                        <Wand2       size={18} className="shrink-0 mt-0.5"/>}
            {message.text}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="space-y-4">

        {/* ── 1. Product Name (always visible) ── */}
        <div className="rounded-2xl border-2 bg-white p-5 transition-all"
          style={{ borderColor: formData.name ? G : '#E2E8E0' }}>
          <label className="flex items-center gap-2 text-sm font-bold text-gray-700 mb-3">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background:`${G}20` }}>
              <Package size={14} style={{ color: G }}/>
            </div>
            Product Name
            <span style={{ color:'#EF4444' }}>*</span>
          </label>
          <input
            type="text" name="name" value={formData.name} onChange={handleChange}
            placeholder="e.g., Organic Milk, Fresh Apples, Turmeric…"
            className="w-full px-4 py-3 rounded-xl border-2 text-sm font-medium text-gray-800 placeholder-gray-400 outline-none transition-all"
            style={{
              borderColor: formData.name ? G : '#E5E7EB',
              background: formData.name ? `${G}08` : '#FAFAFA',
            }}
          />
        </div>

        {/* ── 2. AI Expiry Scanner (accordion) ── */}
        <Section
          title="AI Expiry Scanner"
          icon={Wand2}
          open={scanOpen}
          onToggle={() => setScanOpen(s => !s)}
          badge={formData.expiryDate ? "Date set ✓" : null}
        >
          {/* Idle state */}
          {!showCamera && !capturedImage && (
            <div className="text-center py-4">
              <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-3"
                style={{ background:`${G}15` }}>
                <ScanLine size={30} style={{ color: G }}/>
              </div>
              <p className="text-sm text-gray-500 mb-4 max-w-xs mx-auto">
                Take a photo of the expiry date — AI reads it and fills the field automatically
              </p>
              <button type="button" onClick={openCamera}
                className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold text-white shadow-md transition-all hover:opacity-90 active:scale-95"
                style={{ background:`linear-gradient(135deg, ${G}, ${GD})` }}>
                <Camera size={16}/> Open Camera
              </button>
            </div>
          )}

          {/* Live camera */}
          {showCamera && (
            <div className="space-y-3">
              <div className="relative rounded-xl overflow-hidden bg-gray-900">
                <Webcam audio={false} ref={webcamRef}
                  screenshotFormat="image/jpeg" screenshotQuality={0.95}
                  videoConstraints={{ width:1280, height:720, facingMode:'environment' }}
                  className="w-full h-auto"/>
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="relative w-64 h-24">
                    {[['top-0 left-0','border-t-4 border-l-4 rounded-tl-lg'],['top-0 right-0','border-t-4 border-r-4 rounded-tr-lg'],['bottom-0 left-0','border-b-4 border-l-4 rounded-bl-lg'],['bottom-0 right-0','border-b-4 border-r-4 rounded-br-lg']].map(([pos,cls],i)=>(
                      <div key={i} className={`absolute w-7 h-7 border-emerald-400 ${pos} ${cls}`}/>
                    ))}
                    <motion.div animate={{ top:['8%','80%','8%'] }} transition={{ duration:2, repeat:Infinity, ease:'easeInOut' }}
                      style={{ position:'absolute', left:6, right:6, height:2, background:`${G}`, boxShadow:`0 0 8px ${G}` }}
                      className="rounded"/>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-[10px] text-emerald-300 font-bold tracking-widest bg-black/50 px-2 py-0.5 rounded">ALIGN DATE</span>
                    </div>
                  </div>
                </div>
                <div className="absolute bottom-3 left-0 right-0 flex justify-center gap-2">
                  <button onClick={capture}
                    className="px-5 py-2.5 rounded-xl text-sm font-bold text-white flex items-center gap-2 shadow-lg"
                    style={{ background:`linear-gradient(135deg, ${G}, ${GD})` }}>
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

          {/* Captured image + AI panel */}
          {capturedImage && !showCamera && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl overflow-hidden border border-gray-200 shadow-sm">
                  <img src={capturedImage} alt="Captured" className="w-full h-auto"/>
                </div>
                <div className="flex flex-col gap-2">
                  {/* Result */}
                  {scanResult && (
                    <motion.div initial={{ opacity:0, scale:0.96 }} animate={{ opacity:1, scale:1 }}
                      className="p-3 rounded-xl border text-sm"
                      style={{
                        background: scanResult.found ? '#F0FDF4' : '#FFFBEB',
                        borderColor: scanResult.found ? '#BBF7D0' : '#FDE68A',
                      }}>
                      {scanResult.found ? (
                        <>
                          <div className="flex items-center gap-1.5 mb-1">
                            <CheckCircle size={14} style={{ color: G }}/>
                            <span className="font-bold text-xs" style={{ color: G }}>Date found!</span>
                          </div>
                          <p className="font-black text-gray-900 text-base">{scanResult.display || scanResult.date}</p>
                          <p className="text-xs text-gray-400 mt-0.5">↓ Auto-filled below</p>
                        </>
                      ) : (
                        <div className="flex items-start gap-1.5">
                          <AlertCircle size={14} className="text-amber-500 shrink-0 mt-0.5"/>
                          <p className="text-xs font-semibold text-amber-800">No date found — enter manually</p>
                        </div>
                      )}
                    </motion.div>
                  )}

                  {/* AI loading */}
                  {aiLoading && (
                    <div className="p-3 rounded-xl border text-xs font-medium flex items-center gap-2"
                      style={{ background:`${G}0D`, borderColor:`${G}30`, color: G }}>
                      <Loader className="animate-spin shrink-0" size={14}/>
                      <span>{aiStatus}</span>
                    </div>
                  )}

                  {/* Analyse button */}
                  {!scanResult && !aiLoading && (
                    <button onClick={analyseImage} type="button"
                      className="flex-1 flex flex-col items-center justify-center gap-1.5 py-4 rounded-xl text-white font-bold text-sm shadow-md transition-all hover:opacity-90 active:scale-95"
                      style={{ background:`linear-gradient(135deg, ${G}, ${GD})` }}>
                      <Wand2 size={20}/>
                      <span>Analyse with AI</span>
                    </button>
                  )}

                  {scanResult && !aiLoading && (
                    <button onClick={analyseImage} type="button"
                      className="py-2 rounded-xl text-xs font-bold border-2 transition-all hover:opacity-80"
                      style={{ borderColor: G, color: G }}>
                      Re-analyse
                    </button>
                  )}

                  <div className="flex gap-2">
                    <button onClick={retake} type="button"
                      className="flex-1 py-2 rounded-xl text-xs font-bold border-2 border-gray-200 text-gray-600 hover:bg-gray-50 flex items-center justify-center gap-1 transition-all">
                      <RotateCcw size={12}/> Retake
                    </button>
                    <button onClick={discard} type="button"
                      className="flex-1 py-2 rounded-xl text-xs font-bold border-2 text-red-500 flex items-center justify-center gap-1 transition-all hover:bg-red-50"
                      style={{ borderColor:'#FF0000' }}>
                      <Trash2 size={12}/> Discard
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </Section>

        {/* ── 3. Expiry Date (always visible, glows when filled) ── */}
        <div className="rounded-2xl border-2 bg-white p-5 transition-all"
          style={{ borderColor: formData.expiryDate ? G : '#E2E8E0' }}>
          <label className="flex items-center gap-2 text-sm font-bold text-gray-700 mb-3">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center"
              style={{ background: formData.expiryDate ? `${G}20` : '#F3F4F6' }}>
              <Calendar size={14} style={{ color: formData.expiryDate ? G : '#6B7280' }}/>
            </div>
            Expiry Date
            {scanResult?.found && formData.expiryDate && (
              <span className="ml-1 text-[11px] font-bold px-2 py-0.5 rounded-full"
                style={{ background:`${G}20`, color: G }}>
                ✓ AI filled
              </span>
            )}
          </label>
          <input type="date" name="expiryDate" value={formData.expiryDate} onChange={handleChange}
            className="w-full px-4 py-3 rounded-xl border-2 text-sm font-semibold text-gray-800 outline-none transition-all"
            style={{
              borderColor: formData.expiryDate ? G : '#E5E7EB',
              background: formData.expiryDate ? `${G}08` : '#FAFAFA',
            }}
          />
          {formData.expiryDate && (
            <p className="mt-2 text-xs font-medium text-gray-500">
              📅 {new Date(formData.expiryDate+'T00:00:00').toLocaleDateString('en-US',{weekday:'long',year:'numeric',month:'long',day:'numeric'})}
            </p>
          )}
        </div>

        {/* ── 4. Category (accordion) ── */}
        <Section
          title="Category"
          icon={Tag}
          open={categoryOpen}
          onToggle={() => setCategoryOpen(s => !s)}
          badge={formData.category || null}
        >
          <div className="grid grid-cols-3 gap-2 pt-1">
            {CATEGORIES.map(cat => {
              const Icon = cat.icon;
              const sel  = formData.category === cat.label;
              return (
                <button key={cat.id} type="button"
                  onClick={() => { setFormData(prev => ({ ...prev, category: cat.label })); setCategoryOpen(false); }}
                  className="flex flex-col items-center gap-1.5 py-3 px-2 rounded-xl border-2 text-xs font-bold transition-all active:scale-95"
                  style={{
                    borderColor: sel ? G : '#E5E7EB',
                    background:  sel ? `${G}12` : cat.bg,
                    color:       sel ? G : cat.color,
                  }}>
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center"
                    style={{ background: sel ? `${G}20` : `${cat.color}18` }}>
                    <Icon size={16} style={{ color: sel ? G : cat.color }}/>
                  </div>
                  {cat.label}
                </button>
              );
            })}
          </div>
        </Section>

        {/* ── 5. Storage Location (accordion) ── */}
        <Section
          title="Storage Location"
          icon={MapPin}
          open={locationOpen}
          onToggle={() => setLocationOpen(s => !s)}
          badge={formData.location || null}
        >
          <div className="grid grid-cols-2 gap-2 pt-1 sm:grid-cols-3">
            {LOCATIONS.map(loc => {
              const Icon = loc.icon;
              const sel  = formData.location === loc.label;
              return (
                <button key={loc.id} type="button"
                  onClick={() => { setFormData(prev => ({ ...prev, location: loc.label })); setLocationOpen(false); }}
                  className="flex items-center gap-2.5 px-3 py-3 rounded-xl border-2 text-sm font-bold transition-all active:scale-95"
                  style={{
                    borderColor: sel ? G : '#E5E7EB',
                    background:  sel ? `${G}12` : loc.bg,
                    color:       sel ? G : loc.color,
                  }}>
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                    style={{ background: sel ? `${G}20` : `${loc.color}18` }}>
                    <Icon size={14} style={{ color: sel ? G : loc.color }}/>
                  </div>
                  {loc.label}
                </button>
              );
            })}
          </div>
        </Section>

        {/* ── 6. Notes ── */}
        <div className="rounded-2xl border-2 bg-white p-5 transition-all"
          style={{ borderColor: formData.notes ? G : '#E2E8E0' }}>
          <label className="flex items-center gap-2 text-sm font-bold text-gray-700 mb-3">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center"
              style={{ background: formData.notes ? `${G}20` : '#F3F4F6' }}>
              <FileText size={14} style={{ color: formData.notes ? G : '#6B7280' }}/>
            </div>
            Notes <span className="font-normal text-gray-400 text-xs">(optional)</span>
          </label>
          <textarea name="notes" value={formData.notes} onChange={handleChange} rows={3}
            placeholder="Any special notes about this product…"
            className="w-full px-4 py-3 rounded-xl border-2 text-sm font-medium text-gray-800 placeholder-gray-400 outline-none transition-all resize-none"
            style={{
              borderColor: formData.notes ? G : '#E5E7EB',
              background: formData.notes ? `${G}08` : '#FAFAFA',
            }}
          />
        </div>

        {/* ── Action buttons ── */}
        <div className="flex gap-3 pt-2">
          <button type="button" onClick={() => navigate('/dashboard')}
            className="flex-1 py-3.5 rounded-2xl text-sm font-bold border-2 border-gray-300 text-gray-600 hover:bg-gray-50 transition-all active:scale-95">
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading || !formData.name}
            className="flex-[2] py-3.5 rounded-2xl text-sm font-bold text-white flex items-center justify-center gap-2 shadow-lg transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ background: loading || !formData.name ? '#9CA3AF' : `linear-gradient(135deg, ${G}, ${GD})` }}>
            {loading
              ? <><Loader className="animate-spin" size={16}/> Adding Product…</>
              : <><Plus size={16}/> Add Product</>}
          </button>
        </div>

      </div>
    </div>
  );
}