import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Barcode, Search, X, Loader, AlertCircle, ChevronRight,
  Zap, Flame, Droplets, Wheat, Beef, Apple, Info,
  ShoppingBag, Award, Leaf, RefreshCw, Camera,
  ArrowLeft, Check, Star, Package
} from 'lucide-react';

// ── Open Food Facts lookup ────────────────────────────────────────────────────
async function fetchByBarcode(barcode) {
  const res = await fetch(
    `https://world.openfoodfacts.org/api/v0/product/${barcode}.json`
  );
  if (!res.ok) throw new Error('Network error');
  const data = await res.json();
  if (data.status !== 1) throw new Error('Product not found');
  return data.product;
}

// ── Load Puter barcode scanner (ZXing via puter or native camera) ─────────────
// We use the browser's BarcodeDetector API (Chrome/Android) with a manual
// canvas-scan loop as primary, and a text fallback for iOS/Firefox
async function scanFrameForBarcode(videoEl) {
  if (!('BarcodeDetector' in window)) return null;
  try {
    const detector = new window.BarcodeDetector({
      formats: ['ean_13','ean_8','upc_a','upc_e','code_128','code_39','qr_code'],
    });
    const barcodes = await detector.detect(videoEl);
    if (barcodes.length > 0) return barcodes[0].rawValue;
  } catch {}
  return null;
}

// ── Nutrition grade colour ────────────────────────────────────────────────────
const gradeConfig = {
  a: { bg:'bg-emerald-500', text:'text-white', label:'Excellent' },
  b: { bg:'bg-lime-400',    text:'text-white', label:'Good'      },
  c: { bg:'bg-yellow-400',  text:'text-gray-900', label:'Moderate' },
  d: { bg:'bg-orange-500',  text:'text-white', label:'Poor'      },
  e: { bg:'bg-red-600',     text:'text-white', label:'Bad'       },
};

// ── Per-100g bar chart helper ─────────────────────────────────────────────────
function NutrientBar({ label, value, unit, max, color }) {
  const pct = Math.min((parseFloat(value) / max) * 100, 100);
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs">
        <span className="text-gray-600 font-medium">{label}</span>
        <span className="text-gray-800 font-semibold">{value ? `${parseFloat(value).toFixed(1)}${unit}` : '—'}</span>
      </div>
      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
          className={`h-full rounded-full ${color}`}
        />
      </div>
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────────
export default function Nutrition() {
  const [phase, setPhase] = useState('idle'); // idle | scanning | loading | result | error
  const [manualCode, setManualCode] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [product, setProduct] = useState(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [scannerSupported, setScannerSupported] = useState(false);
  const [scanPulse, setScanPulse] = useState(false);

  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const scanLoopRef = useRef(null);

  // Check BarcodeDetector support on mount
  useEffect(() => {
    setScannerSupported('BarcodeDetector' in window);
  }, []);

  // ── Camera / scanner ────────────────────────────────────────────────────────
  const startCamera = useCallback(async () => {
    setPhase('scanning');
    setCameraActive(true);
    setErrorMsg('');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } }
      });
      streamRef.current = stream;
      // wait for video element to mount
      await new Promise(r => setTimeout(r, 300));
      const vid = videoRef.current;
      if (!vid) return;
      vid.srcObject = stream;
      await vid.play();

      // Start scan loop
      scanLoopRef.current = setInterval(async () => {
        const code = await scanFrameForBarcode(vid);
        if (code) {
          clearInterval(scanLoopRef.current);
          stopCamera();
          setScanPulse(true);
          setTimeout(() => setScanPulse(false), 600);
          await lookupProduct(code);
        }
      }, 400);
    } catch (err) {
      stopCamera();
      if (err.name === 'NotAllowedError') {
        setErrorMsg('Camera permission denied. Please allow camera access.');
      } else {
        setErrorMsg(`Camera error: ${err.message}`);
      }
      setPhase('error');
    }
  }, []);

  const stopCamera = useCallback(() => {
    clearInterval(scanLoopRef.current);
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
  }, []);

  useEffect(() => () => stopCamera(), [stopCamera]);

  // ── Product lookup ─────────────────────────────────────────────────────────
  const lookupProduct = async (barcode) => {
    setPhase('loading');
    try {
      const p = await fetchByBarcode(barcode.trim());
      setProduct(p);
      setPhase('result');
    } catch (err) {
      setErrorMsg(err.message === 'Product not found'
        ? `No product found for barcode "${barcode}". Try another product.`
        : 'Network error. Check your connection and try again.');
      setPhase('error');
    }
  };

  const handleManualSearch = (e) => {
    e.preventDefault();
    if (!manualCode.trim()) return;
    lookupProduct(manualCode.trim());
  };

  const reset = () => {
    stopCamera();
    setProduct(null);
    setErrorMsg('');
    setManualCode('');
    setPhase('idle');
  };

  // ── Extract nutrition values ────────────────────────────────────────────────
  const n = product?.nutriments || {};
  const grade = product?.nutrition_grades?.toLowerCase();
  const gradeInfo = gradeConfig[grade] || null;

  const allergens = (product?.allergens_tags || [])
    .map(a => a.replace('en:', '').replace(/-/g, ' '));

  const ingredients = product?.ingredients_text_en || product?.ingredients_text || '';

  const expiryRaw = product?.expiration_date || product?.best_before_date || '';

  const imgUrl = product?.image_front_url || product?.image_url || '';

  // ── render ─────────────────────────────────────────────────────────────────
  return (
    <div className="max-w-3xl mx-auto px-2 pb-12">

      {/* ── Header ── */}
      <motion.div initial={{ opacity:0, y:-20 }} animate={{ opacity:1, y:0 }} className="mb-8">
        <h1 className="text-3xl font-bold text-gray-800 flex items-center gap-3">
          <div className="p-2 bg-gradient-to-br from-emerald-400 to-teal-500 rounded-xl shadow-lg shadow-emerald-500/20">
            <Leaf className="text-white" size={24}/>
          </div>
          Nutrition Scanner
        </h1>
        <p className="text-gray-500 mt-2 ml-14">
          Scan any food barcode to see full nutrition facts
        </p>
      </motion.div>

      {/* ── IDLE: scanner options ── */}
      {phase === 'idle' && (
        <motion.div initial={{ opacity:0, y:20 }} animate={{ opacity:1, y:0 }} className="space-y-5">

          {/* Camera scan card */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
            <h2 className="font-semibold text-gray-800 flex items-center gap-2 mb-4">
              <Camera className="text-emerald-500" size={18}/> Scan Barcode
            </h2>

            {scannerSupported ? (
              <motion.button
                whileHover={{ scale:1.02 }} whileTap={{ scale:0.97 }}
                onClick={startCamera}
                className="w-full py-10 border-2 border-dashed border-emerald-200 hover:border-emerald-400 rounded-xl flex flex-col items-center gap-3 text-emerald-600 hover:bg-emerald-50 transition-all group"
              >
                <div className="w-16 h-16 bg-gradient-to-br from-emerald-100 to-teal-100 group-hover:from-emerald-200 group-hover:to-teal-200 rounded-full flex items-center justify-center transition-all">
                  <Barcode size={32} className="text-emerald-600"/>
                </div>
                <div className="text-center">
                  <p className="font-semibold text-gray-800">Open Camera Scanner</p>
                  <p className="text-sm text-gray-500 mt-0.5">Point at any food product barcode</p>
                </div>
              </motion.button>
            ) : (
              <div className="py-6 rounded-xl bg-amber-50 border border-amber-200 text-center px-4">
                <AlertCircle className="text-amber-500 mx-auto mb-2" size={24}/>
                <p className="text-sm font-medium text-amber-800">Camera scanner not supported on this browser</p>
                <p className="text-xs text-amber-600 mt-1">Use Chrome on Android/Desktop, or enter barcode manually below</p>
              </div>
            )}
          </div>

          {/* Manual barcode entry */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
            <h2 className="font-semibold text-gray-800 flex items-center gap-2 mb-4">
              <Search className="text-emerald-500" size={18}/> Enter Barcode Manually
            </h2>
            <form onSubmit={handleManualSearch} className="flex gap-2">
              <input
                type="text" value={manualCode}
                onChange={e => setManualCode(e.target.value)}
                placeholder="e.g. 8906002080014"
                className="flex-1 px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all text-sm font-mono"
              />
              <motion.button
                whileHover={{ scale:1.05 }} whileTap={{ scale:0.95 }}
                type="submit" disabled={!manualCode.trim()}
                className="px-5 py-3 bg-emerald-600 text-white rounded-xl font-medium hover:bg-emerald-700 disabled:opacity-40 transition-all flex items-center gap-2"
              >
                <Search size={18}/>
              </motion.button>
            </form>
            <p className="text-xs text-gray-400 mt-2">Find the barcode number printed below the barcode lines on the product</p>
          </div>

          {/* Try example */}
          <div className="text-center">
            <p className="text-xs text-gray-400 mb-2">Try an example product:</p>
            <div className="flex flex-wrap justify-center gap-2">
              {[
                { label:'Nutella', code:'3017620422003' },
                { label:'Kit Kat', code:'8901058851091' },
                { label:'Maggi',   code:'8901058000227' },
              ].map(ex => (
                <button key={ex.code} onClick={() => lookupProduct(ex.code)}
                  className="px-3 py-1.5 text-xs font-medium bg-gray-100 hover:bg-emerald-100 hover:text-emerald-700 text-gray-600 rounded-lg transition-colors">
                  {ex.label}
                </button>
              ))}
            </div>
          </div>
        </motion.div>
      )}

      {/* ── SCANNING: live camera ── */}
      {phase === 'scanning' && (
        <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }} className="space-y-4">
          <div className="relative rounded-2xl overflow-hidden bg-gray-900 shadow-xl">
            <video ref={videoRef} className="w-full h-auto" autoPlay playsInline muted/>

            {/* Overlay */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              {/* Dark vignette */}
              <div className="absolute inset-0 bg-black/30"/>
              {/* Scanner frame */}
              <motion.div
                animate={{ scale: scanPulse ? 1.05 : 1, borderColor: scanPulse ? '#10b981' : '#34d399' }}
                className="relative w-72 h-44 border-2 border-emerald-400 rounded-xl z-10"
              >
                {/* Corner accents */}
                {[
                  'top-0 left-0 border-t-4 border-l-4 rounded-tl-lg',
                  'top-0 right-0 border-t-4 border-r-4 rounded-tr-lg',
                  'bottom-0 left-0 border-b-4 border-l-4 rounded-bl-lg',
                  'bottom-0 right-0 border-b-4 border-r-4 rounded-br-lg',
                ].map((cls, i) => (
                  <div key={i} className={`absolute w-6 h-6 border-emerald-400 ${cls}`}/>
                ))}
                {/* Scan line */}
                <motion.div
                  animate={{ top: ['10%', '85%', '10%'] }}
                  transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                  style={{ position:'absolute', left:4, right:4, height:2 }}
                  className="bg-emerald-400 shadow-lg shadow-emerald-400/80 rounded"
                />
                <div className="absolute bottom-2 left-0 right-0 text-center">
                  <span className="text-xs text-emerald-300 font-medium tracking-widest bg-black/50 px-2 py-0.5 rounded">
                    ALIGN BARCODE HERE
                  </span>
                </div>
              </motion.div>
            </div>

            {/* Cancel button */}
            <div className="absolute bottom-4 left-0 right-0 flex justify-center z-20">
              <button onClick={reset}
                className="px-6 py-2.5 bg-white/20 backdrop-blur text-white rounded-xl font-medium flex items-center gap-2 border border-white/30 hover:bg-white/30 transition-all">
                <X size={16}/> Cancel
              </button>
            </div>
          </div>

          <p className="text-center text-sm text-gray-500">
            Scanning automatically… hold the barcode steady inside the frame
          </p>
        </motion.div>
      )}

      {/* ── LOADING ── */}
      {phase === 'loading' && (
        <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }}
          className="flex flex-col items-center gap-4 py-20">
          <div className="relative">
            <div className="w-20 h-20 rounded-full border-4 border-emerald-100 border-t-emerald-500 animate-spin"/>
            <Leaf className="absolute inset-0 m-auto text-emerald-500" size={28}/>
          </div>
          <p className="font-semibold text-gray-700">Fetching product data…</p>
          <p className="text-sm text-gray-400">Looking up Open Food Facts database</p>
        </motion.div>
      )}

      {/* ── ERROR ── */}
      {phase === 'error' && (
        <motion.div initial={{ opacity:0, y:20 }} animate={{ opacity:1, y:0 }}
          className="bg-rose-50 border border-rose-200 rounded-2xl p-8 text-center space-y-4">
          <div className="w-14 h-14 bg-rose-100 rounded-full flex items-center justify-center mx-auto">
            <AlertCircle className="text-rose-500" size={28}/>
          </div>
          <div>
            <p className="font-semibold text-rose-800">Product Not Found</p>
            <p className="text-sm text-rose-600 mt-1">{errorMsg}</p>
          </div>
          <button onClick={reset}
            className="inline-flex items-center gap-2 px-6 py-2.5 bg-rose-600 text-white rounded-xl font-medium hover:bg-rose-700 transition-colors">
            <RefreshCw size={16}/> Try Again
          </button>
        </motion.div>
      )}

      {/* ── RESULT: full nutrition card ── */}
      {phase === 'result' && product && (
        <motion.div initial={{ opacity:0, y:20 }} animate={{ opacity:1, y:0 }} className="space-y-5">

          {/* Back button */}
          <button onClick={reset}
            className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-800 transition-colors">
            <ArrowLeft size={16}/> Scan another product
          </button>

          {/* ── Hero card ── */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="bg-gradient-to-br from-emerald-500 to-teal-600 p-6 text-white">
              <div className="flex gap-4">
                {/* Product image */}
                {imgUrl ? (
                  <img src={imgUrl} alt={product.product_name}
                    className="w-24 h-24 rounded-xl object-contain bg-white/20 p-1 shrink-0"/>
                ) : (
                  <div className="w-24 h-24 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
                    <Package size={36} className="text-white/60"/>
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-emerald-100 text-xs font-medium uppercase tracking-wide mb-1">
                    {product.brands || 'Unknown Brand'}
                  </p>
                  <h2 className="text-xl font-bold leading-tight mb-2">
                    {product.product_name || product.product_name_en || 'Unknown Product'}
                  </h2>
                  <div className="flex flex-wrap gap-2">
                    {product.quantity && (
                      <span className="text-xs bg-white/20 px-2 py-0.5 rounded-full">{product.quantity}</span>
                    )}
                    {product.countries_tags?.slice(0,1).map(c => (
                      <span key={c} className="text-xs bg-white/20 px-2 py-0.5 rounded-full capitalize">
                        {c.replace('en:','')}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Quick stats row */}
            <div className="grid grid-cols-3 divide-x divide-gray-100 border-t border-gray-100">
              {[
                { icon: Flame,    label:'Calories',  value: n['energy-kcal_100g'] ? `${Math.round(n['energy-kcal_100g'])} kcal` : '—', color:'text-orange-500' },
                { icon: Droplets, label:'per 100g',  value: 'Values',  color:'text-blue-400' },
                { icon: Award,    label:'Nutri-Score',value: grade ? grade.toUpperCase() : '—', color: grade ? 'text-emerald-600' : 'text-gray-400' },
              ].map((s,i) => {
                const Icon = s.icon;
                return (
                  <div key={i} className="flex flex-col items-center py-4 px-2">
                    <Icon size={18} className={`${s.color} mb-1`}/>
                    <p className="text-lg font-bold text-gray-800">{s.value}</p>
                    <p className="text-xs text-gray-400">{s.label}</p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* ── Nutri-Score badge ── */}
          {gradeInfo && (
            <motion.div
              initial={{ opacity:0, x:-20 }} animate={{ opacity:1, x:0 }} transition={{ delay:0.1 }}
              className={`rounded-2xl p-5 ${gradeInfo.bg} flex items-center gap-4 shadow-sm`}
            >
              <div className="w-16 h-16 bg-white/20 rounded-xl flex items-center justify-center shrink-0">
                <span className={`text-4xl font-black ${gradeInfo.text}`}>{grade?.toUpperCase()}</span>
              </div>
              <div>
                <p className={`font-bold text-lg ${gradeInfo.text}`}>Nutri-Score {grade?.toUpperCase()}</p>
                <p className={`text-sm ${gradeInfo.text} opacity-80`}>{gradeInfo.label} nutritional quality</p>
              </div>
            </motion.div>
          )}

          {/* ── Nutrition Facts Table ── */}
          <motion.div
            initial={{ opacity:0, y:20 }} animate={{ opacity:1, y:0 }} transition={{ delay:0.15 }}
            className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden"
          >
            <div className="p-5 border-b border-gray-100">
              <h3 className="font-bold text-gray-800 flex items-center gap-2">
                <Zap className="text-yellow-500" size={18}/> Nutrition Facts
                <span className="ml-auto text-xs text-gray-400 font-normal">per 100g</span>
              </h3>
            </div>
            <div className="p-5 space-y-4">
              <NutrientBar label="Energy"        value={n['energy-kcal_100g']}    unit=" kcal" max={500}  color="bg-orange-400"/>
              <NutrientBar label="Fat"            value={n['fat_100g']}             unit="g"     max={40}   color="bg-yellow-400"/>
              <NutrientBar label="Saturated Fat"  value={n['saturated-fat_100g']}  unit="g"     max={20}   color="bg-red-400"/>
              <NutrientBar label="Carbohydrates"  value={n['carbohydrates_100g']}  unit="g"     max={100}  color="bg-blue-400"/>
              <NutrientBar label="Sugars"         value={n['sugars_100g']}         unit="g"     max={50}   color="bg-pink-400"/>
              <NutrientBar label="Fibre"          value={n['fiber_100g']}          unit="g"     max={15}   color="bg-emerald-400"/>
              <NutrientBar label="Protein"        value={n['proteins_100g']}       unit="g"     max={40}   color="bg-purple-400"/>
              <NutrientBar label="Salt"           value={n['salt_100g']}           unit="g"     max={5}    color="bg-gray-400"/>
            </div>

            {/* Detailed table */}
            <div className="border-t border-gray-100">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Nutrient</th>
                    <th className="text-right px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">per 100g</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {[
                    ['Energy',        n['energy-kcal_100g'], 'kcal'],
                    ['Fat',           n['fat_100g'],          'g'   ],
                    ['  Saturated',   n['saturated-fat_100g'],'g'  ],
                    ['  Trans',       n['trans-fat_100g'],    'g'   ],
                    ['Carbohydrates', n['carbohydrates_100g'],'g'   ],
                    ['  Sugars',      n['sugars_100g'],       'g'   ],
                    ['Fibre',         n['fiber_100g'],        'g'   ],
                    ['Protein',       n['proteins_100g'],     'g'   ],
                    ['Salt',          n['salt_100g'],         'g'   ],
                    ['Sodium',        n['sodium_100g'],       'mg'  ],
                    ['Calcium',       n['calcium_100g'],      'mg'  ],
                    ['Iron',          n['iron_100g'],         'mg'  ],
                    ['Vitamin C',     n['vitamin-c_100g'],    'mg'  ],
                  ].filter(([,v]) => v !== undefined && v !== null && v !== '').map(([label, val, unit]) => (
                    <tr key={label} className="hover:bg-gray-50 transition-colors">
                      <td className={`px-5 py-2.5 text-gray-700 ${label.startsWith('  ') ? 'pl-8 text-gray-500' : 'font-medium'}`}>
                        {label.trim()}
                      </td>
                      <td className="px-5 py-2.5 text-right font-semibold text-gray-800">
                        {parseFloat(val).toFixed(unit === 'kcal' ? 0 : 2)} {unit}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </motion.div>

          {/* ── Allergens ── */}
          {allergens.length > 0 && (
            <motion.div
              initial={{ opacity:0, y:20 }} animate={{ opacity:1, y:0 }} transition={{ delay:0.2 }}
              className="bg-rose-50 border border-rose-200 rounded-2xl p-5"
            >
              <h3 className="font-bold text-rose-800 flex items-center gap-2 mb-3">
                <AlertCircle className="text-rose-500" size={18}/> Allergens
              </h3>
              <div className="flex flex-wrap gap-2">
                {allergens.map(a => (
                  <span key={a} className="px-3 py-1.5 bg-rose-100 text-rose-700 rounded-full text-sm font-medium border border-rose-200 capitalize">
                    {a}
                  </span>
                ))}
              </div>
            </motion.div>
          )}

          {/* ── Ingredients ── */}
          {ingredients && (
            <motion.div
              initial={{ opacity:0, y:20 }} animate={{ opacity:1, y:0 }} transition={{ delay:0.25 }}
              className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm"
            >
              <h3 className="font-bold text-gray-800 flex items-center gap-2 mb-3">
                <Leaf className="text-emerald-500" size={18}/> Ingredients
              </h3>
              <p className="text-sm text-gray-600 leading-relaxed">{ingredients}</p>
            </motion.div>
          )}

          {/* ── Labels / Certifications ── */}
          {(product.labels_tags || []).length > 0 && (
            <motion.div
              initial={{ opacity:0, y:20 }} animate={{ opacity:1, y:0 }} transition={{ delay:0.3 }}
              className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm"
            >
              <h3 className="font-bold text-gray-800 flex items-center gap-2 mb-3">
                <Star className="text-yellow-500" size={18}/> Labels & Certifications
              </h3>
              <div className="flex flex-wrap gap-2">
                {product.labels_tags.slice(0, 10).map(l => (
                  <span key={l}
                    className="px-3 py-1.5 bg-emerald-50 text-emerald-700 rounded-full text-xs font-medium border border-emerald-200 capitalize">
                    <Check size={10} className="inline mr-1"/>
                    {l.replace('en:','').replace(/-/g,' ')}
                  </span>
                ))}
              </div>
            </motion.div>
          )}

          {/* ── Expiry / Packaging ── */}
          <motion.div
            initial={{ opacity:0, y:20 }} animate={{ opacity:1, y:0 }} transition={{ delay:0.35 }}
            className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm"
          >
            <h3 className="font-bold text-gray-800 flex items-center gap-2 mb-4">
              <Info className="text-blue-500" size={18}/> Product Info
            </h3>
            <div className="grid grid-cols-2 gap-3">
              {[
                { label:'Brand',       value: product.brands },
                { label:'Category',    value: (product.categories_tags||[])[0]?.replace('en:','').replace(/-/g,' ') },
                { label:'Quantity',    value: product.quantity },
                { label:'Packaging',   value: (product.packaging_tags||[]).slice(0,2).map(p=>p.replace('en:','')).join(', ') },
                { label:'Expiry',      value: expiryRaw },
                { label:'Barcode',     value: product.code },
              ].filter(r => r.value).map(row => (
                <div key={row.label} className="bg-gray-50 rounded-xl p-3">
                  <p className="text-xs text-gray-400 mb-0.5">{row.label}</p>
                  <p className="text-sm font-semibold text-gray-800 capitalize truncate">{row.value}</p>
                </div>
              ))}
            </div>
          </motion.div>

          {/* ── Data source ── */}
          <p className="text-center text-xs text-gray-400">
            Data from{' '}
            <a href="https://world.openfoodfacts.org" target="_blank" rel="noreferrer"
              className="text-emerald-600 hover:underline font-medium">
              Open Food Facts
            </a>{' '}
            · Free & open source · may not cover all products
          </p>

        </motion.div>
      )}
    </div>
  );
}