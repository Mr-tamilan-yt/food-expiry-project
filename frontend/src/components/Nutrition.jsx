import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search, X, Loader, AlertCircle, Zap, Flame, Droplets,
  Award, Leaf, RefreshCw, Camera, ArrowLeft, Check, Star,
  Package, Info, Shield, AlertTriangle, Heart, Baby,
  Globe, ChevronDown, ChevronUp, Wand2, ScanLine
} from 'lucide-react';

// ── Theme ─────────────────────────────────────────────────────────────────────
const G  = '#41960F';
const GD = '#316c0b';
const BG = '#DBE4C9';

// ── Puter AI loader ───────────────────────────────────────────────────────────
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
    s.onerror = () => reject(new Error('Failed to load puter.js'));
    document.head.appendChild(s);
  });
}

// ── Puter vision: scan barcode from image dataURL ─────────────────────────────
async function detectBarcodeWithAI(dataUrl) {
  const puter = await loadPuter();
  const prompt = `Look at this image carefully. Find any barcode, QR code, or product barcode number visible.
Reply with ONLY a JSON object, no markdown:
If barcode found: {"found": true, "barcode": "the number you see", "type": "EAN13|QR|other"}
If no barcode:    {"found": false}`;
  const response = await puter.ai.chat(prompt, dataUrl, { model: 'gpt-4o' });
  const raw = (typeof response === 'string' ? response : response?.message?.content || '').trim();
  const clean = raw.replace(/```json\s*/gi, '').replace(/```/g, '').trim();
  return JSON.parse(clean);
}

// ── Puter AI: analyse nutrition when OFF data is incomplete ───────────────────
async function analyseNutritionWithAI(product) {
  const puter = await loadPuter();
  const name        = product.product_name || 'Unknown product';
  const ingredients = product.ingredients_text_en || product.ingredients_text || 'Not available';
  const brand       = product.brands || 'Unknown';
  const categories  = (product.categories_tags || []).slice(0,3).map(c=>c.replace('en:','')).join(', ');

  const prompt = `You are a nutritionist and food safety expert. Analyse this food product:
Product: ${name}
Brand: ${brand}
Categories: ${categories}
Ingredients: ${ingredients}

Provide a comprehensive analysis. Reply with ONLY this JSON (no markdown):
{
  "overall_rating": "Excellent|Good|Moderate|Poor|Risky",
  "safety_score": 1-10,
  "summary": "2-3 sentence plain English summary of the product",
  "child_friendly": true|false,
  "child_note": "brief reason why or why not child friendly",
  "health_insights": ["insight1","insight2","insight3"],
  "concerns": ["concern1","concern2"] or [],
  "banned_ingredients": [{"ingredient":"name","banned_in":"countries","reason":"why"}] or [],
  "good_for": ["benefit1","benefit2"] or [],
  "avoid_if": ["condition1"] or [],
  "recommendation": "one clear actionable recommendation"
}`;

  const response = await puter.ai.chat(prompt, { model: 'gpt-4o' });
  const raw = (typeof response === 'string' ? response : response?.message?.content || '').trim();
  const clean = raw.replace(/```json\s*/gi, '').replace(/```/g, '').trim();
  return JSON.parse(clean);
}

// ── Open Food Facts ───────────────────────────────────────────────────────────
async function fetchByBarcode(barcode) {
  const res = await fetch(`https://world.openfoodfacts.org/api/v0/product/${barcode}.json`);
  if (!res.ok) throw new Error('Network error');
  const data = await res.json();
  if (data.status !== 1) throw new Error('Product not found');
  return data.product;
}

// ── Nutri-Score config ────────────────────────────────────────────────────────
const GRADE = {
  a: { bg:'#1a9e3f', label:'Excellent', desc:'Very good nutritional quality' },
  b: { bg:'#81c541', label:'Good',      desc:'Good nutritional quality'      },
  c: { bg:'#f5a623', label:'Moderate',  desc:'Moderate nutritional quality'  },
  d: { bg:'#e8703a', label:'Poor',      desc:'Poor nutritional quality'      },
  e: { bg:'#e63b11', label:'Bad',       desc:'Very poor nutritional quality' },
};

// ── Nutrient bar ──────────────────────────────────────────────────────────────
function NutrientBar({ label, value, unit, max, barColor }) {
  if (value === undefined || value === null || value === '') return null;
  const pct = Math.min((parseFloat(value) / max) * 100, 100);
  return (
    <div className="space-y-1.5">
      <div className="flex justify-between text-xs font-medium">
        <span className="text-gray-600">{label}</span>
        <span className="font-bold text-gray-800">{parseFloat(value).toFixed(1)}{unit}</span>
      </div>
      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
        <motion.div
          initial={{ width:0 }} animate={{ width:`${pct}%` }}
          transition={{ duration:0.8, ease:'easeOut' }}
          className="h-full rounded-full"
          style={{ background: barColor }}
        />
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
//  MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────────────────
export default function Nutrition() {
  const [phase,       setPhase]       = useState('idle'); // idle|camera|loading|result|error
  const [manualCode,  setManualCode]  = useState('');
  const [errorMsg,    setErrorMsg]    = useState('');
  const [product,     setProduct]     = useState(null);
  const [aiAnalysis,  setAiAnalysis]  = useState(null);
  const [aiLoading,   setAiLoading]   = useState(false);
  const [cameraMode,  setCameraMode]  = useState('live'); // live|capture
  const [captured,    setCaptured]    = useState(null);   // dataURL for AI scan
  const [scanning,    setScanning]    = useState(false);  // AI scanning barcode from image
  const [showIngr,    setShowIngr]    = useState(false);

  const videoRef    = useRef(null);
  const canvasRef   = useRef(null);
  const streamRef   = useRef(null);
  const scanLoopRef = useRef(null);

  useEffect(() => { loadPuter().catch(() => {}); }, []);
  useEffect(() => () => stopCamera(), []);

  // ── Camera ─────────────────────────────────────────────────────────────────
  const startCamera = useCallback(async () => {
    setPhase('camera');
    setCameraMode('live');
    setCaptured(null);
    setErrorMsg('');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode:'environment', width:{ideal:1280}, height:{ideal:720} }
      });
      streamRef.current = stream;
      await new Promise(r => setTimeout(r, 300));
      if (!videoRef.current) return;
      videoRef.current.srcObject = stream;
      await videoRef.current.play();

      // Try native BarcodeDetector first
      if ('BarcodeDetector' in window) {
        const detector = new window.BarcodeDetector({
          formats:['ean_13','ean_8','upc_a','upc_e','code_128','code_39','qr_code']
        });
        scanLoopRef.current = setInterval(async () => {
          try {
            const codes = await detector.detect(videoRef.current);
            if (codes.length > 0) {
              clearInterval(scanLoopRef.current);
              stopCamera();
              lookupProduct(codes[0].rawValue);
            }
          } catch {}
        }, 400);
      }
      // else: user taps Capture to send to AI vision
    } catch (err) {
      stopCamera();
      setErrorMsg(err.name==='NotAllowedError'
        ? 'Camera permission denied. Use the manual search below.'
        : `Camera error: ${err.message}`);
      setPhase('error');
    }
  }, []);

  const stopCamera = useCallback(() => {
    clearInterval(scanLoopRef.current);
    if (streamRef.current) { streamRef.current.getTracks().forEach(t=>t.stop()); streamRef.current=null; }
  }, []);

  // Capture frame and send to Puter AI for barcode detection
  const captureAndScan = useCallback(async () => {
    if (!videoRef.current) return;
    const canvas = canvasRef.current || document.createElement('canvas');
    canvas.width  = videoRef.current.videoWidth  || 640;
    canvas.height = videoRef.current.videoHeight || 480;
    canvas.getContext('2d').drawImage(videoRef.current, 0, 0);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
    setCaptured(dataUrl);
    setCameraMode('capture');
    stopCamera();
    setScanning(true);
    try {
      const result = await detectBarcodeWithAI(dataUrl);
      if (result.found && result.barcode) {
        lookupProduct(result.barcode);
      } else {
        setErrorMsg('No barcode detected in the image. Try again with better lighting, or enter the barcode manually.');
        setPhase('error');
      }
    } catch (err) {
      setErrorMsg(`AI scan error: ${err.message}`);
      setPhase('error');
    } finally {
      setScanning(false);
    }
  }, [stopCamera]);

  // ── Product lookup ─────────────────────────────────────────────────────────
  const lookupProduct = async (barcode) => {
    setPhase('loading');
    try {
      const p = await fetchByBarcode(barcode.trim());
      setProduct(p);
      setPhase('result');
      // Auto-trigger AI analysis
      runAIAnalysis(p);
    } catch (err) {
      setErrorMsg(err.message==='Product not found'
        ? `No product found for barcode "${barcode}". Try a different product.`
        : 'Network error. Check your connection and try again.');
      setPhase('error');
    }
  };

  const runAIAnalysis = async (p) => {
    setAiLoading(true);
    setAiAnalysis(null);
    try {
      const result = await analyseNutritionWithAI(p);
      setAiAnalysis(result);
    } catch {
      // Silent fail — OFF data still shows
    } finally {
      setAiLoading(false);
    }
  };

  const reset = () => {
    stopCamera();
    setProduct(null); setAiAnalysis(null); setCaptured(null);
    setErrorMsg(''); setManualCode(''); setPhase('idle');
    setCameraMode('live'); setScanning(false); setShowIngr(false);
  };

  // ── Derived ────────────────────────────────────────────────────────────────
  const n         = product?.nutriments || {};
  const grade     = product?.nutrition_grades?.toLowerCase();
  const gradeInfo = GRADE[grade] || null;
  const allergens = (product?.allergens_tags||[]).map(a=>a.replace('en:','').replace(/-/g,' '));
  const ingredients = product?.ingredients_text_en || product?.ingredients_text || '';
  const imgUrl    = product?.image_front_url || product?.image_url || '';

  const safetyColor = (score) =>
    score >= 8 ? G :
    score >= 6 ? '#F59E0B' :
    score >= 4 ? '#F97316' : '#EF4444';

  const ratingColor = (r) => ({
    Excellent:'#41960F', Good:'#65a30d', Moderate:'#F59E0B',
    Poor:'#F97316', Risky:'#EF4444'
  })[r] || '#6B7280';

  // ── RENDER ─────────────────────────────────────────────────────────────────
  return (
    <div className="max-w-2xl mx-auto pb-10" style={{ fontFamily:"'DM Sans', sans-serif" }}>
      <canvas ref={canvasRef} className="hidden"/>

      {/* ── Header ── */}
      <div className="mb-6">
        <h1 className="text-2xl font-black flex items-center gap-3" style={{ color:'#1A2E1A' }}>
          <div className="w-10 h-10 rounded-2xl flex items-center justify-center shadow-md"
            style={{ background:`linear-gradient(135deg, ${G}, ${GD})` }}>
            <Leaf size={20} className="text-white"/>
          </div>
          Nutrition Scanner
        </h1>
        <p className="text-sm text-gray-500 mt-1 ml-13">
          Scan any food barcode for full nutrition facts + AI health analysis
        </p>
      </div>

      {/* ══ IDLE ══════════════════════════════════════════════════════════════ */}
      {phase === 'idle' && (
        <motion.div initial={{ opacity:0, y:16 }} animate={{ opacity:1, y:0 }} className="space-y-4">

          {/* Camera card */}
          <div className="bg-white rounded-2xl border-2 border-gray-200 overflow-hidden shadow-sm">
            <div className="p-5 border-b border-gray-100" style={{ background:`${G}08` }}>
              <h2 className="font-black text-gray-800 flex items-center gap-2">
                <Camera size={17} style={{ color:G }}/> Scan Barcode
              </h2>
              <p className="text-xs text-gray-500 mt-0.5">Camera + AI vision — works on all browsers</p>
            </div>
            <div className="p-5">
              <motion.button whileHover={{ scale:1.01 }} whileTap={{ scale:0.98 }}
                onClick={startCamera}
                className="w-full py-8 border-2 border-dashed rounded-2xl flex flex-col items-center gap-3 transition-all group"
                style={{ borderColor:`${G}40` }}>
                <div className="w-16 h-16 rounded-2xl flex items-center justify-center transition-all"
                  style={{ background:`${G}15` }}>
                  <ScanLine size={30} style={{ color:G }}/>
                </div>
                <div className="text-center">
                  <p className="font-bold text-gray-800">Open Camera</p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    Native scan on Chrome · AI-powered on all other browsers
                  </p>
                </div>
                <span className="text-xs font-bold px-3 py-1 rounded-full text-white"
                  style={{ background:`linear-gradient(135deg, ${G}, ${GD})` }}>
                  Tap to Start
                </span>
              </motion.button>
            </div>
          </div>

          {/* Manual entry */}
          <div className="bg-white rounded-2xl border-2 border-gray-200 p-5 shadow-sm">
            <h2 className="font-black text-gray-800 flex items-center gap-2 mb-4">
              <Search size={17} style={{ color:G }}/> Enter Barcode
            </h2>
            <form onSubmit={e => { e.preventDefault(); if (manualCode.trim()) lookupProduct(manualCode.trim()); }}
              className="flex gap-2">
              <input type="text" value={manualCode}
                onChange={e => setManualCode(e.target.value)}
                placeholder="e.g. 8906002080014"
                className="flex-1 px-4 py-3 border-2 rounded-xl text-sm font-mono outline-none transition-all"
                style={{ borderColor: manualCode ? G : '#E5E7EB' }}
              />
              <button type="submit" disabled={!manualCode.trim()}
                className="px-5 py-3 rounded-xl text-white font-bold transition-all disabled:opacity-40 active:scale-95"
                style={{ background:`linear-gradient(135deg, ${G}, ${GD})` }}>
                <Search size={18}/>
              </button>
            </form>
          </div>

          {/* Examples */}
          <div className="text-center">
            <p className="text-xs text-gray-400 mb-2">Try example products:</p>
            <div className="flex flex-wrap justify-center gap-2">
              {[{label:'Nutella',code:'3017620422003'},{label:'Kit Kat',code:'8901058851091'},{label:'Maggi',code:'8901058000227'},{label:'Oreo',code:'7622210951823'}].map(ex => (
                <button key={ex.code} onClick={() => lookupProduct(ex.code)}
                  className="px-3 py-1.5 text-xs font-bold rounded-full border-2 transition-all hover:shadow-sm active:scale-95"
                  style={{ borderColor:`${G}30`, color:G, background:`${G}08` }}>
                  {ex.label}
                </button>
              ))}
            </div>
          </div>
        </motion.div>
      )}

      {/* ══ CAMERA ════════════════════════════════════════════════════════════ */}
      {phase === 'camera' && (
        <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }} className="space-y-3">
          <div className="relative rounded-2xl overflow-hidden bg-gray-900 shadow-xl">
            {/* Live video */}
            {cameraMode === 'live' && (
              <video ref={videoRef} className="w-full h-auto" autoPlay playsInline muted/>
            )}
            {/* Captured still */}
            {cameraMode === 'capture' && captured && (
              <img src={captured} className="w-full h-auto" alt="Captured"/>
            )}

            {/* Guide overlay */}
            {cameraMode === 'live' && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="absolute inset-0 bg-black/25"/>
                <div className="relative w-64 h-44 z-10">
                  {[['top-0 left-0','border-t-4 border-l-4 rounded-tl-xl'],['top-0 right-0','border-t-4 border-r-4 rounded-tr-xl'],['bottom-0 left-0','border-b-4 border-l-4 rounded-bl-xl'],['bottom-0 right-0','border-b-4 border-r-4 rounded-br-xl']].map(([pos,cls],i)=>(
                    <div key={i} className={`absolute w-7 h-7 border-emerald-400 ${pos} ${cls}`}/>
                  ))}
                  <motion.div animate={{ top:['8%','82%','8%'] }} transition={{ duration:2, repeat:Infinity, ease:'easeInOut' }}
                    style={{ position:'absolute', left:6, right:6, height:2, background:G, boxShadow:`0 0 10px ${G}` }}
                    className="rounded"/>
                  <div className="absolute bottom-2 left-0 right-0 text-center">
                    <span className="text-[10px] font-bold text-emerald-300 tracking-widest bg-black/50 px-2 py-0.5 rounded">
                      ALIGN BARCODE
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* AI scanning overlay */}
            {scanning && (
              <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center gap-3 z-20">
                <div className="w-14 h-14 rounded-2xl flex items-center justify-center"
                  style={{ background:`${G}30`, border:`2px solid ${G}` }}>
                  <Wand2 size={24} style={{ color:G }} className="animate-pulse"/>
                </div>
                <p className="text-white font-bold text-sm">AI reading barcode…</p>
                <div className="flex gap-1.5">
                  {[0,1,2].map(i=>(
                    <motion.div key={i} animate={{ opacity:[0.3,1,0.3], scale:[0.7,1,0.7] }}
                      transition={{ duration:1.2, repeat:Infinity, delay:i*0.2 }}
                      className="w-2 h-2 rounded-full" style={{ background:G }}/>
                  ))}
                </div>
              </div>
            )}

            {/* Bottom controls */}
            {cameraMode === 'live' && !scanning && (
              <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-3 z-20">
                <button onClick={captureAndScan}
                  className="px-6 py-2.5 rounded-xl text-sm font-bold text-white flex items-center gap-2 shadow-xl active:scale-95"
                  style={{ background:`linear-gradient(135deg, ${G}, ${GD})` }}>
                  <Camera size={15}/> Capture & Scan
                </button>
                <button onClick={reset}
                  className="px-4 py-2.5 rounded-xl text-sm font-bold text-white bg-gray-700/80 flex items-center gap-1.5">
                  <X size={14}/> Cancel
                </button>
              </div>
            )}
          </div>

          <p className="text-xs text-center text-gray-400">
            {('BarcodeDetector' in window)
              ? 'Auto-detecting barcode… or tap Capture & Scan to use AI vision'
              : 'Tap "Capture & Scan" — AI will read the barcode from your photo'}
          </p>
        </motion.div>
      )}

      {/* ══ LOADING ═══════════════════════════════════════════════════════════ */}
      {phase === 'loading' && (
        <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }}
          className="flex flex-col items-center gap-4 py-20">
          <div className="relative w-16 h-16">
            <div className="absolute inset-0 rounded-full border-4 border-gray-100 border-t-4 animate-spin"
              style={{ borderTopColor:G }}/>
            <Leaf className="absolute inset-0 m-auto" size={24} style={{ color:G }}/>
          </div>
          <p className="font-bold text-gray-700">Looking up product…</p>
          <p className="text-xs text-gray-400">Searching Open Food Facts database</p>
        </motion.div>
      )}

      {/* ══ ERROR ══════════════════════════════════════════════════════════════ */}
      {phase === 'error' && (
        <motion.div initial={{ opacity:0, y:16 }} animate={{ opacity:1, y:0 }}
          className="rounded-2xl border-2 border-rose-200 bg-rose-50 p-8 text-center space-y-4">
          <div className="w-14 h-14 bg-rose-100 rounded-2xl flex items-center justify-center mx-auto">
            <AlertCircle size={28} className="text-rose-500"/>
          </div>
          <div>
            <p className="font-bold text-rose-800">Not Found</p>
            <p className="text-sm text-rose-600 mt-1">{errorMsg}</p>
          </div>
          <button onClick={reset}
            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold text-white shadow-sm active:scale-95"
            style={{ background:'#EF4444' }}>
            <RefreshCw size={15}/> Try Again
          </button>
        </motion.div>
      )}

      {/* ══ RESULT ════════════════════════════════════════════════════════════ */}
      {phase === 'result' && product && (
        <motion.div initial={{ opacity:0, y:16 }} animate={{ opacity:1, y:0 }} className="space-y-4">

          {/* Back */}
          <button onClick={reset} className="flex items-center gap-2 text-sm font-semibold text-gray-500 hover:text-gray-800 transition-colors">
            <ArrowLeft size={15}/> Scan another product
          </button>

          {/* ── Hero card ── */}
          <div className="rounded-2xl overflow-hidden border-2 shadow-sm"
            style={{ borderColor:`${G}30` }}>
            <div className="p-5 text-white" style={{ background:`linear-gradient(135deg, ${G}, ${GD})` }}>
              <div className="flex gap-4">
                {imgUrl ? (
                  <img src={imgUrl} alt={product.product_name}
                    className="w-20 h-20 rounded-xl object-contain bg-white/20 p-1 shrink-0"/>
                ) : (
                  <div className="w-20 h-20 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
                    <Package size={32} className="text-white/60"/>
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-white/70 text-xs font-semibold uppercase tracking-wide mb-1">
                    {product.brands || 'Unknown Brand'}
                  </p>
                  <h2 className="text-lg font-black leading-tight mb-2">
                    {product.product_name || product.product_name_en || 'Unknown Product'}
                  </h2>
                  <div className="flex flex-wrap gap-1.5">
                    {product.quantity && <span className="text-xs bg-white/20 px-2 py-0.5 rounded-full font-medium">{product.quantity}</span>}
                    {grade && gradeInfo && (
                      <span className="text-xs px-2 py-0.5 rounded-full font-black text-white"
                        style={{ background: gradeInfo.bg }}>
                        Nutri-Score {grade.toUpperCase()}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Quick stats */}
            <div className="grid grid-cols-3 divide-x divide-gray-100 bg-white">
              {[
                { icon:Flame,    label:'Calories',   val: n['energy-kcal_100g'] ? `${Math.round(n['energy-kcal_100g'])} kcal` : '—', color:'#F97316' },
                { icon:Droplets, label:'Fat',        val: n['fat_100g'] ? `${parseFloat(n['fat_100g']).toFixed(1)}g` : '—', color:'#FBBF24' },
                { icon:Zap,      label:'Protein',    val: n['proteins_100g'] ? `${parseFloat(n['proteins_100g']).toFixed(1)}g` : '—', color:G },
              ].map((s,i) => {
                const Icon = s.icon;
                return (
                  <div key={i} className="flex flex-col items-center py-3 px-2">
                    <Icon size={16} className="mb-1" style={{ color:s.color }}/>
                    <p className="text-sm font-black text-gray-900">{s.val}</p>
                    <p className="text-[10px] text-gray-400 font-medium">{s.label} /100g</p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* ── AI Analysis card ── */}
          <div className="rounded-2xl border-2 overflow-hidden bg-white shadow-sm"
            style={{ borderColor:`${G}30` }}>
            <div className="px-5 py-3.5 flex items-center gap-2.5 border-b border-gray-100"
              style={{ background:`${G}08` }}>
              <Wand2 size={16} style={{ color:G }}/>
              <span className="font-black text-gray-800 text-sm">AI Health Analysis</span>
              <span className="ml-auto text-[10px] font-bold px-2 py-0.5 rounded-full text-white"
                style={{ background:G }}>GPT-4o</span>
            </div>

            {aiLoading && (
              <div className="px-5 py-8 flex flex-col items-center gap-3">
                <div className="flex gap-1.5">
                  {[0,1,2].map(i=>(
                    <motion.div key={i} animate={{ opacity:[0.3,1,0.3], scale:[0.7,1.1,0.7] }}
                      transition={{ duration:1.2, repeat:Infinity, delay:i*0.2 }}
                      className="w-2.5 h-2.5 rounded-full" style={{ background:G }}/>
                  ))}
                </div>
                <p className="text-sm text-gray-500 font-medium">Analysing ingredients & nutrition…</p>
              </div>
            )}

            {aiAnalysis && !aiLoading && (
              <div className="p-5 space-y-4">

                {/* Safety score + rating */}
                <div className="flex items-center gap-4">
                  <div className="shrink-0 w-16 h-16 rounded-2xl flex flex-col items-center justify-center shadow-sm"
                    style={{ background: `${safetyColor(aiAnalysis.safety_score)}18`, border:`2px solid ${safetyColor(aiAnalysis.safety_score)}40` }}>
                    <span className="text-2xl font-black" style={{ color: safetyColor(aiAnalysis.safety_score) }}>
                      {aiAnalysis.safety_score}
                    </span>
                    <span className="text-[9px] font-bold text-gray-500">/10</span>
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-black px-2.5 py-0.5 rounded-full text-white"
                        style={{ background: ratingColor(aiAnalysis.overall_rating) }}>
                        {aiAnalysis.overall_rating}
                      </span>
                      {aiAnalysis.child_friendly !== undefined && (
                        <span className={`flex items-center gap-1 text-xs font-bold px-2.5 py-0.5 rounded-full border-2 ${
                          aiAnalysis.child_friendly
                            ? 'bg-green-50 text-green-700 border-green-200'
                            : 'bg-red-50 text-red-700 border-red-200'
                        }`}>
                          <Baby size={11}/>
                          {aiAnalysis.child_friendly ? 'Child Safe' : 'Not for Kids'}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 font-medium leading-relaxed">{aiAnalysis.summary}</p>
                  </div>
                </div>

                {/* Child note */}
                {aiAnalysis.child_note && (
                  <div className={`flex items-start gap-2 px-3 py-2.5 rounded-xl text-xs font-medium border ${
                    aiAnalysis.child_friendly
                      ? 'bg-green-50 border-green-200 text-green-800'
                      : 'bg-red-50 border-red-200 text-red-800'
                  }`}>
                    <Baby size={13} className="shrink-0 mt-0.5"/>
                    {aiAnalysis.child_note}
                  </div>
                )}

                {/* Banned ingredients */}
                {aiAnalysis.banned_ingredients?.length > 0 && (
                  <div className="rounded-xl border-2 border-red-300 bg-red-50 p-3 space-y-2">
                    <p className="text-xs font-black text-red-800 flex items-center gap-1.5">
                      <Globe size={13}/> Banned / Restricted Ingredients
                    </p>
                    {aiAnalysis.banned_ingredients.map((b,i) => (
                      <div key={i} className="flex items-start gap-2 text-xs">
                        <span className="shrink-0 mt-0.5 w-4 h-4 rounded-full bg-red-500 text-white flex items-center justify-center text-[9px] font-black">!</span>
                        <div>
                          <span className="font-bold text-red-800">{b.ingredient}</span>
                          <span className="text-red-600"> — banned in {b.banned_in}</span>
                          <span className="text-red-500 block">{b.reason}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Health insights */}
                {aiAnalysis.health_insights?.length > 0 && (
                  <div className="space-y-1.5">
                    <p className="text-xs font-black text-gray-700 uppercase tracking-wide">Health Insights</p>
                    {aiAnalysis.health_insights.map((ins,i) => (
                      <div key={i} className="flex items-start gap-2 text-xs text-gray-700">
                        <Check size={12} className="shrink-0 mt-0.5" style={{ color:G }}/>
                        {ins}
                      </div>
                    ))}
                  </div>
                )}

                {/* Concerns */}
                {aiAnalysis.concerns?.length > 0 && (
                  <div className="space-y-1.5">
                    <p className="text-xs font-black text-gray-700 uppercase tracking-wide">Concerns</p>
                    {aiAnalysis.concerns.map((c,i) => (
                      <div key={i} className="flex items-start gap-2 text-xs text-orange-800">
                        <AlertTriangle size={12} className="shrink-0 mt-0.5 text-orange-500"/>
                        {c}
                      </div>
                    ))}
                  </div>
                )}

                {/* Good for / Avoid if */}
                {(aiAnalysis.good_for?.length > 0 || aiAnalysis.avoid_if?.length > 0) && (
                  <div className="grid grid-cols-2 gap-2">
                    {aiAnalysis.good_for?.length > 0 && (
                      <div className="rounded-xl p-3 bg-green-50 border border-green-200">
                        <p className="text-[10px] font-black text-green-700 uppercase mb-1.5 flex items-center gap-1">
                          <Heart size={10}/> Good For
                        </p>
                        {aiAnalysis.good_for.slice(0,3).map((g,i)=>(
                          <p key={i} className="text-xs text-green-800 font-medium">• {g}</p>
                        ))}
                      </div>
                    )}
                    {aiAnalysis.avoid_if?.length > 0 && (
                      <div className="rounded-xl p-3 bg-orange-50 border border-orange-200">
                        <p className="text-[10px] font-black text-orange-700 uppercase mb-1.5 flex items-center gap-1">
                          <Shield size={10}/> Avoid If
                        </p>
                        {aiAnalysis.avoid_if.slice(0,3).map((a,i)=>(
                          <p key={i} className="text-xs text-orange-800 font-medium">• {a}</p>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Recommendation */}
                {aiAnalysis.recommendation && (
                  <div className="flex items-start gap-2 px-3 py-2.5 rounded-xl text-xs font-semibold border-2"
                    style={{ background:`${G}08`, borderColor:`${G}30`, color:'#1A3A0A' }}>
                    <Wand2 size={13} className="shrink-0 mt-0.5" style={{ color:G }}/>
                    {aiAnalysis.recommendation}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* ── Nutri-Score ── */}
          {gradeInfo && (
            <motion.div initial={{ opacity:0, x:-16 }} animate={{ opacity:1, x:0 }} transition={{ delay:0.1 }}
              className="rounded-2xl p-4 flex items-center gap-4 shadow-sm"
              style={{ background: gradeInfo.bg }}>
              <div className="w-14 h-14 bg-white/25 rounded-xl flex items-center justify-center shrink-0">
                <span className="text-3xl font-black text-white">{grade?.toUpperCase()}</span>
              </div>
              <div>
                <p className="font-black text-white text-base">Nutri-Score {grade?.toUpperCase()} — {gradeInfo.label}</p>
                <p className="text-white/80 text-xs mt-0.5">{gradeInfo.desc}</p>
              </div>
            </motion.div>
          )}

          {/* ── Nutrition Facts ── */}
          <motion.div initial={{ opacity:0, y:16 }} animate={{ opacity:1, y:0 }} transition={{ delay:0.15 }}
            className="bg-white rounded-2xl border-2 border-gray-200 overflow-hidden shadow-sm">
            <div className="px-5 py-3.5 border-b border-gray-100 flex items-center justify-between"
              style={{ background:`${G}08` }}>
              <h3 className="font-black text-gray-800 flex items-center gap-2">
                <Zap size={16} className="text-yellow-500"/> Nutrition Facts
              </h3>
              <span className="text-xs text-gray-400 font-medium">per 100g</span>
            </div>
            <div className="p-5 space-y-3">
              <NutrientBar label="Energy"       value={n['energy-kcal_100g']}   unit=" kcal" max={500}  barColor="#F97316"/>
              <NutrientBar label="Fat"          value={n['fat_100g']}            unit="g"     max={40}   barColor="#FBBF24"/>
              <NutrientBar label="Saturated Fat"value={n['saturated-fat_100g']} unit="g"     max={20}   barColor="#EF4444"/>
              <NutrientBar label="Carbs"        value={n['carbohydrates_100g']} unit="g"     max={100}  barColor="#3B82F6"/>
              <NutrientBar label="Sugars"       value={n['sugars_100g']}        unit="g"     max={50}   barColor="#EC4899"/>
              <NutrientBar label="Fibre"        value={n['fiber_100g']}         unit="g"     max={15}   barColor={G}/>
              <NutrientBar label="Protein"      value={n['proteins_100g']}      unit="g"     max={40}   barColor="#8B5CF6"/>
              <NutrientBar label="Salt"         value={n['salt_100g']}          unit="g"     max={5}    barColor="#6B7280"/>
            </div>

            {/* Full table */}
            <div className="border-t border-gray-100">
              <table className="w-full text-sm">
                <thead><tr className="bg-gray-50">
                  <th className="text-left px-5 py-2.5 text-[11px] font-black text-gray-500 uppercase tracking-wide">Nutrient</th>
                  <th className="text-right px-5 py-2.5 text-[11px] font-black text-gray-500 uppercase tracking-wide">per 100g</th>
                </tr></thead>
                <tbody className="divide-y divide-gray-50">
                  {[
                    ['Energy',n['energy-kcal_100g'],'kcal'],['Fat',n['fat_100g'],'g'],
                    ['  Saturated',n['saturated-fat_100g'],'g'],['  Trans',n['trans-fat_100g'],'g'],
                    ['Carbohydrates',n['carbohydrates_100g'],'g'],['  Sugars',n['sugars_100g'],'g'],
                    ['Fibre',n['fiber_100g'],'g'],['Protein',n['proteins_100g'],'g'],
                    ['Salt',n['salt_100g'],'g'],['Sodium',n['sodium_100g'],'mg'],
                    ['Calcium',n['calcium_100g'],'mg'],['Iron',n['iron_100g'],'mg'],
                    ['Vitamin C',n['vitamin-c_100g'],'mg'],
                  ].filter(([,v]) => v!=null && v!=='').map(([label,val,unit]) => (
                    <tr key={label} className="hover:bg-gray-50 transition-colors">
                      <td className={`px-5 py-2 text-gray-700 ${label.startsWith('  ')?'pl-8 text-gray-400 text-xs':'font-semibold text-sm'}`}>{label.trim()}</td>
                      <td className="px-5 py-2 text-right font-bold text-gray-900 text-sm">
                        {parseFloat(val).toFixed(unit==='kcal'?0:2)} {unit}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </motion.div>

          {/* ── Allergens ── */}
          {allergens.length > 0 && (
            <motion.div initial={{ opacity:0, y:16 }} animate={{ opacity:1, y:0 }} transition={{ delay:0.2 }}
              className="rounded-2xl border-2 border-red-300 bg-red-50 p-4">
              <h3 className="font-black text-red-800 flex items-center gap-2 mb-3">
                <AlertCircle size={16} className="text-red-500"/> Allergens
              </h3>
              <div className="flex flex-wrap gap-2">
                {allergens.map(a => (
                  <span key={a} className="px-3 py-1.5 bg-red-100 text-red-700 rounded-full text-xs font-bold border border-red-200 capitalize">{a}</span>
                ))}
              </div>
            </motion.div>
          )}

          {/* ── Ingredients ── */}
          {ingredients && (
            <motion.div initial={{ opacity:0, y:16 }} animate={{ opacity:1, y:0 }} transition={{ delay:0.25 }}
              className="bg-white rounded-2xl border-2 border-gray-200 p-4 shadow-sm">
              <button onClick={() => setShowIngr(s=>!s)}
                className="w-full flex items-center justify-between font-black text-gray-800 text-sm">
                <span className="flex items-center gap-2"><Leaf size={15} style={{ color:G }}/> Ingredients</span>
                {showIngr ? <ChevronUp size={15} className="text-gray-400"/> : <ChevronDown size={15} className="text-gray-400"/>}
              </button>
              <AnimatePresence>
                {showIngr && (
                  <motion.p initial={{ height:0, opacity:0 }} animate={{ height:'auto', opacity:1 }} exit={{ height:0, opacity:0 }}
                    className="text-xs text-gray-600 leading-relaxed mt-3 pt-3 border-t border-gray-100 overflow-hidden">
                    {ingredients}
                  </motion.p>
                )}
              </AnimatePresence>
            </motion.div>
          )}

          {/* ── Labels ── */}
          {(product.labels_tags||[]).length > 0 && (
            <motion.div initial={{ opacity:0, y:16 }} animate={{ opacity:1, y:0 }} transition={{ delay:0.3 }}
              className="bg-white rounded-2xl border-2 border-gray-200 p-4 shadow-sm">
              <h3 className="font-black text-gray-800 flex items-center gap-2 mb-3">
                <Star size={15} className="text-yellow-500"/> Labels & Certifications
              </h3>
              <div className="flex flex-wrap gap-2">
                {product.labels_tags.slice(0,10).map(l => (
                  <span key={l} className="px-3 py-1 text-xs font-bold rounded-full border-2 capitalize"
                    style={{ background:`${G}10`, borderColor:`${G}30`, color:G }}>
                    <Check size={9} className="inline mr-1"/>
                    {l.replace('en:','').replace(/-/g,' ')}
                  </span>
                ))}
              </div>
            </motion.div>
          )}

          {/* ── Product Info ── */}
          <motion.div initial={{ opacity:0, y:16 }} animate={{ opacity:1, y:0 }} transition={{ delay:0.35 }}
            className="bg-white rounded-2xl border-2 border-gray-200 p-4 shadow-sm">
            <h3 className="font-black text-gray-800 flex items-center gap-2 mb-3">
              <Info size={15} className="text-blue-500"/> Product Info
            </h3>
            <div className="grid grid-cols-2 gap-2">
              {[
                {label:'Brand',     value:product.brands},
                {label:'Quantity',  value:product.quantity},
                {label:'Barcode',   value:product.code},
                {label:'Expiry',    value:product.expiration_date||product.best_before_date},
              ].filter(r=>r.value).map(row=>(
                <div key={row.label} className="rounded-xl p-3 bg-gray-50 border border-gray-100">
                  <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-wide mb-0.5">{row.label}</p>
                  <p className="text-sm font-bold text-gray-800 truncate">{row.value}</p>
                </div>
              ))}
            </div>
          </motion.div>

          <p className="text-center text-[11px] text-gray-400">
            Data: <a href="https://world.openfoodfacts.org" target="_blank" rel="noreferrer"
              className="underline font-medium" style={{ color:G }}>Open Food Facts</a>
            {' '}· AI analysis by GPT-4o via Puter
          </p>
        </motion.div>
      )}
    </div>
  );
}