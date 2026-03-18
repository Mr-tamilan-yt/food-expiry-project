import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChefHat, Clock, AlertTriangle, Calendar, CheckCircle,
  XCircle, MessageSquare, Send, Loader, Sparkles, Leaf,
  Package, Utensils, Timer, Award, Users, ShoppingCart,
  Bot, HelpCircle, ThumbsUp, ThumbsDown, Copy, Bookmark,
  Beef, Wine, Milk, Search, Menu, X, RefreshCw,
  ExternalLink, Snowflake, Apple, Coffee
} from 'lucide-react';

// ── Theme ─────────────────────────────────────────────────────────────────────
const G   = '#479F11';
const GD  = '#3a8a0d';
const BG  = '#DBE4C9';

// ── Zepto search URL builder ───────────────────────────────────────────────────
function getZeptoUrl(productName) {
  const q = encodeURIComponent(productName.trim());
  return `https://zeptonow.com/search?query=${q}`;
}

// ── Category icon ─────────────────────────────────────────────────────────────
function getCategoryIcon(category) {
  const map = {
    Vegetables: Leaf, Fruits: Apple, Meat: Beef,
    Dairy: Milk, Beverages: Wine, Snacks: Package,
    Frozen: Snowflake, Grains: Package, Other: Package,
  };
  return map[category] || Package;
}

// ── Puter AI recipe generation ─────────────────────────────────────────────────
function loadPuter() {
  return new Promise((resolve, reject) => {
    if (window.puter) { resolve(window.puter); return; }
    const s = document.createElement('script');
    s.src = 'https://js.puter.com/v2/';
    s.onload = () => {
      const wait = (n) => {
        if (window.puter) resolve(window.puter);
        else if (n <= 0) reject(new Error('puter.js failed'));
        else setTimeout(() => wait(n - 1), 100);
      };
      wait(30);
    };
    s.onerror = () => reject(new Error('Failed to load puter.js'));
    document.head.appendChild(s);
  });
}

async function generateRecipeWithAI(productNames, userMessage = '') {
  const puter = await loadPuter();
  const prompt = userMessage
    ? `User asks: "${userMessage}"\nContext: we are using these expiring ingredients: ${productNames.join(', ')}.\nReply with a helpful cooking suggestion or recipe in plain text. Be concise and friendly.`
    : `Create a practical recipe using these expiring ingredients: ${productNames.join(', ')}.
Reply with ONLY this JSON (no markdown, no extra text):
{"name":"recipe name","ingredients":["item1","item2"],"instructions":["step1","step2","step3"],"prepTime":"X mins","difficulty":"Easy|Medium|Hard","servings":2,"tip":"one pro cooking tip"}`;

  const response = await puter.ai.chat(prompt, { model: 'gpt-4o' });
  const raw = (typeof response === 'string' ? response : response?.message?.content || '').trim();

  if (!userMessage) {
    const clean = raw.replace(/```json\s*/gi, '').replace(/```/g, '').trim();
    return { type: 'recipe', data: JSON.parse(clean) };
  }
  return { type: 'text', data: raw };
}

// ─────────────────────────────────────────────────────────────────────────────
//  MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────────────────
export default function Recipes() {
  const [allProducts,      setAllProducts]      = useState([]);
  const [expiringProducts, setExpiringProducts] = useState([]);
  const [loading,          setLoading]          = useState(true);
  const [selectedProducts, setSelectedProducts] = useState([]);
  const [chatMessages,     setChatMessages]     = useState([]);
  const [isAiLoading,      setIsAiLoading]      = useState(false);
  const [chatInput,        setChatInput]        = useState('');
  const [sidebarOpen,      setSidebarOpen]      = useState(false); // mobile drawer
  const [productSearch,    setProductSearch]    = useState('');
  const [buyingId,         setBuyingId]         = useState(null);

  const chatEndRef  = useRef(null);
  const inputRef    = useRef(null);

  useEffect(() => {
    fetchData();
    loadPuter().catch(() => {});
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages, isAiLoading]);

  const fetchData = async () => {
    try {
      const [allRes, expRes] = await Promise.all([
        axios.get('/api/products'),
        axios.get('/api/products/expiring'),
      ]);
      setAllProducts(allRes.data || []);
      setExpiringProducts(expRes.data || []);
    } catch {
      setAllProducts([]); setExpiringProducts([]);
    } finally { setLoading(false); }
  };

  // ── Product search: search across ALL products, not just expiring ─────────
  const searchResults = productSearch.trim()
    ? allProducts.filter(p =>
        p.name.toLowerCase().includes(productSearch.toLowerCase()) ||
        (p.category||'').toLowerCase().includes(productSearch.toLowerCase())
      )
    : expiringProducts;

  // ── Select all toggle ──────────────────────────────────────────────────────
  const allSelected = searchResults.length > 0 &&
    searchResults.every(p => selectedProducts.find(s => s._id === p._id));

  const toggleSelectAll = () => {
    if (allSelected) {
      // Deselect all currently visible
      const ids = new Set(searchResults.map(p => p._id));
      setSelectedProducts(prev => prev.filter(p => !ids.has(p._id)));
    } else {
      // Add all visible that aren't already selected
      const existing = new Set(selectedProducts.map(p => p._id));
      const toAdd = searchResults.filter(p => !existing.has(p._id));
      setSelectedProducts(prev => [...prev, ...toAdd]);
    }
  };

  const toggleProduct = (product) => {
    setSelectedProducts(prev =>
      prev.find(p => p._id === product._id)
        ? prev.filter(p => p._id !== product._id)
        : [...prev, product]
    );
  };

  const clearSelection = () => setSelectedProducts([]);

  // ── Days until expiry ──────────────────────────────────────────────────────
  const getDays = (d) => {
    if (!d) return 0;
    const today = new Date(); today.setHours(0,0,0,0);
    const exp   = new Date(d); exp.setHours(0,0,0,0);
    return Math.ceil((exp - today) / 86400000);
  };

  // ── Buy Now → Zepto ───────────────────────────────────────────────────────
  const handleBuyNow = (product) => {
    setBuyingId(product._id);
    setTimeout(() => {
      setBuyingId(null);
      window.open(getZeptoUrl(product.name), '_blank', 'noopener');
    }, 600);
  };

  // ── AI Chat ────────────────────────────────────────────────────────────────
  const sendMessage = async (overrideText) => {
    const text = overrideText || chatInput.trim();
    if (!text && selectedProducts.length === 0) return;

    const isRecipeGenerate = !text; // no text = generate recipe from selected
    const userText = text || `Generate a recipe using: ${selectedProducts.map(p => p.name).join(', ')}`;

    const userMsg = { id: Date.now(), role: 'user', text: userText, ts: new Date() };
    setChatMessages(prev => [...prev, userMsg]);
    setChatInput('');
    setIsAiLoading(true);
    setSidebarOpen(false); // close mobile drawer

    try {
      const productNames = selectedProducts.length > 0
        ? selectedProducts.map(p => p.name)
        : expiringProducts.slice(0, 5).map(p => p.name);

      const result = await generateRecipeWithAI(
        productNames,
        isRecipeGenerate ? '' : text
      );

      const aiMsg = {
        id: Date.now() + 1,
        role: 'assistant',
        type: result.type,
        data: result.data,
        ts: new Date(),
      };
      setChatMessages(prev => [...prev, aiMsg]);
    } catch (err) {
      let errText = 'AI failed. Please try again.';
      if (err.message?.includes('sign') || err.message?.includes('auth'))
        errText = 'Puter AI needs a free sign-in. A popup may appear — sign in once and retry.';
      setChatMessages(prev => [...prev, {
        id: Date.now() + 1, role: 'assistant', type: 'error', data: errText, ts: new Date(),
      }]);
    } finally {
      setIsAiLoading(false);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  };

  // ─────────────────────────────────────────────────────────────────────────
  //  RENDER HELPERS
  // ─────────────────────────────────────────────────────────────────────────
  const ProductCard = ({ product }) => {
    const days    = getDays(product.expiryDate);
    const isSel   = !!selectedProducts.find(p => p._id === product._id);
    const isExp   = days <= 0;
    const isUrg   = days <= 2 && days > 0;
    const Icon    = getCategoryIcon(product.category);

    return (
      <motion.div
        layout
        initial={{ opacity:0, y:8 }} animate={{ opacity:1, y:0 }}
        whileHover={{ y:-2 }}
        onClick={() => toggleProduct(product)}
        className="cursor-pointer rounded-2xl border-2 p-3 transition-all select-none"
        style={{
          borderColor: isSel ? G : isUrg||isExp ? '#FBBF24' : '#E5E7EB',
          background:  isSel ? `${G}12` : isUrg ? '#FFFBEB' : isExp ? '#FFF1F2' : 'white',
        }}
      >
        <div className="flex items-start gap-2">
          {/* Checkbox */}
          <div className="shrink-0 mt-0.5 w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all"
            style={{ borderColor: isSel ? G : '#D1D5DB', background: isSel ? G : 'transparent' }}>
            {isSel && <CheckCircle size={13} color="white"/>}
          </div>

          {/* Icon */}
          <div className="shrink-0 p-1.5 rounded-xl"
            style={{ background: isUrg||isExp ? '#FEE2E2' : '#F0FDF4' }}>
            <Icon size={16} style={{ color: isUrg||isExp ? '#DC2626' : G }}/>
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-1">
              <span className="text-sm font-bold text-gray-800 truncate">{product.name}</span>
              <span className="shrink-0 text-[11px] font-bold px-2 py-0.5 rounded-full"
                style={{
                  background: isExp ? '#FEE2E2' : isUrg ? '#FEF3C7' : '#F0FDF4',
                  color:      isExp ? '#DC2626' : isUrg ? '#B45309' : G,
                }}>
                {isExp ? 'Expired' : days===0 ? 'Today' : `${days}d`}
              </span>
            </div>
            <div className="flex items-center gap-1 mt-0.5 text-[11px] text-gray-400">
              <Calendar size={9}/>
              {product.expiryDate ? new Date(product.expiryDate).toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'}) : '—'}
              {product.category && <span className="ml-1 px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-500">{product.category}</span>}
            </div>

            {/* Buy Now → Zepto */}
            <button
              onClick={e => { e.stopPropagation(); handleBuyNow(product); }}
              className="mt-2 w-full flex items-center justify-center gap-1.5 py-1.5 rounded-xl text-[11px] font-bold text-white transition-all active:scale-95"
              style={{ background: buyingId===product._id ? '#6B7280' : `linear-gradient(135deg, ${G}, ${GD})` }}
            >
              {buyingId===product._id
                ? <><Loader size={11} className="animate-spin"/> Opening…</>
                : <><ShoppingCart size={11}/> Buy on Zepto <ExternalLink size={9}/></>}
            </button>
          </div>
        </div>
      </motion.div>
    );
  };

  // ── Chat bubble renderer ──────────────────────────────────────────────────
  const ChatBubble = ({ msg }) => {
    const isUser = msg.role === 'user';

    if (isUser) return (
      <div className="flex justify-end">
        <div className="max-w-[80%] px-4 py-2.5 rounded-2xl rounded-tr-sm text-sm font-medium text-white"
          style={{ background:`linear-gradient(135deg, ${G}, ${GD})` }}>
          {msg.text}
          <p className="text-[10px] text-white/60 mt-1 text-right">
            {msg.ts.toLocaleTimeString('en-US',{hour:'2-digit',minute:'2-digit'})}
          </p>
        </div>
      </div>
    );

    if (msg.type === 'error') return (
      <div className="flex justify-start">
        <div className="max-w-[85%] px-4 py-2.5 rounded-2xl rounded-tl-sm bg-red-50 border border-red-200 text-sm text-red-700 font-medium">
          {msg.data}
        </div>
      </div>
    );

    if (msg.type === 'text') return (
      <div className="flex justify-start gap-2">
        <div className="shrink-0 w-7 h-7 rounded-full flex items-center justify-center mt-1" style={{ background:`${G}20` }}>
          <Bot size={14} style={{ color:G }}/>
        </div>
        <div className="max-w-[85%] px-4 py-3 rounded-2xl rounded-tl-sm bg-white border border-gray-200 text-sm text-gray-800 shadow-sm">
          {msg.data}
          <p className="text-[10px] text-gray-400 mt-1">
            {msg.ts.toLocaleTimeString('en-US',{hour:'2-digit',minute:'2-digit'})}
          </p>
        </div>
      </div>
    );

    if (msg.type === 'recipe') {
      const r = msg.data;
      return (
        <div className="flex justify-start gap-2">
          <div className="shrink-0 w-7 h-7 rounded-full flex items-center justify-center mt-1" style={{ background:`${G}20` }}>
            <ChefHat size={14} style={{ color:G }}/>
          </div>
          <div className="max-w-[90%] rounded-2xl rounded-tl-sm bg-white border-2 shadow-sm overflow-hidden"
            style={{ borderColor:`${G}30` }}>
            {/* Recipe header */}
            <div className="px-4 py-3 border-b border-gray-100" style={{ background:`${G}08` }}>
              <div className="flex items-center gap-2 mb-1">
                <Utensils size={14} style={{ color:G }}/>
                <span className="font-black text-gray-900 text-base">{r.name}</span>
              </div>
              <div className="flex items-center gap-3 text-[11px] text-gray-500">
                <span className="flex items-center gap-1"><Timer size={10}/>{r.prepTime}</span>
                <span className="flex items-center gap-1"><Award size={10}/>{r.difficulty}</span>
                <span className="flex items-center gap-1"><Users size={10}/>{r.servings} servings</span>
              </div>
            </div>

            <div className="p-4 space-y-3">
              {/* Ingredients */}
              <div>
                <p className="text-xs font-black text-gray-700 uppercase tracking-wide mb-1.5">Ingredients</p>
                <div className="flex flex-wrap gap-1.5">
                  {r.ingredients.map((ing, i) => (
                    <span key={i} className="text-xs px-2 py-1 rounded-full font-medium"
                      style={{ background:`${G}12`, color: GD }}>
                      {ing}
                    </span>
                  ))}
                </div>
              </div>

              {/* Steps */}
              <div>
                <p className="text-xs font-black text-gray-700 uppercase tracking-wide mb-1.5">Instructions</p>
                <ol className="space-y-1.5">
                  {r.instructions.map((step, i) => (
                    <li key={i} className="flex gap-2 text-sm text-gray-700">
                      <span className="shrink-0 w-5 h-5 rounded-full text-[11px] font-black text-white flex items-center justify-center mt-0.5"
                        style={{ background: G }}>{i+1}</span>
                      {step}
                    </li>
                  ))}
                </ol>
              </div>

              {/* Tip */}
              {r.tip && (
                <div className="px-3 py-2 rounded-xl text-xs font-medium text-amber-800 bg-amber-50 border border-amber-200">
                  💡 {r.tip}
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="px-4 py-2.5 border-t border-gray-100 flex items-center gap-2">
              <button className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"><ThumbsUp size={13} className="text-gray-400"/></button>
              <button className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"><ThumbsDown size={13} className="text-gray-400"/></button>
              <button className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"><Copy size={13} className="text-gray-400"/></button>
              <button className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"><Bookmark size={13} className="text-gray-400"/></button>
              <p className="ml-auto text-[10px] text-gray-400">
                {msg.ts.toLocaleTimeString('en-US',{hour:'2-digit',minute:'2-digit'})}
              </p>
            </div>
          </div>
        </div>
      );
    }

    return null;
  };

  // ── Sidebar panel ─────────────────────────────────────────────────────────
  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Sidebar header */}
      <div className="px-4 pt-4 pb-3 border-b border-gray-100">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-black text-gray-800 flex items-center gap-2">
            <AlertTriangle size={16} style={{ color:'#D97706' }}/> Products
          </h2>
          <div className="flex items-center gap-2">
            {searchResults.length > 0 && (
              <button
                onClick={e => { e.stopPropagation(); toggleSelectAll(); }}
                className="text-xs font-bold px-3 py-1.5 rounded-xl border-2 transition-all"
                style={{
                  background: allSelected ? G : 'black',
                  color: 'white',
                  borderColor: allSelected ? G : 'black',
                }}
              >
                {allSelected ? 'Deselect All' : 'Select All'}
              </button>
            )}
            {/* Mobile close */}
            <button onClick={() => setSidebarOpen(false)} className="lg:hidden p-1.5 rounded-xl hover:bg-gray-100">
              <X size={16} className="text-gray-500"/>
            </button>
          </div>
        </div>

        {/* Search bar */}
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"/>
          <input
            type="text"
            value={productSearch}
            onChange={e => setProductSearch(e.target.value)}
            placeholder="Search all products…"
            className="w-full pl-8 pr-3 py-2 text-sm border-2 rounded-xl outline-none transition-all"
            style={{ borderColor: productSearch ? G : '#E5E7EB' }}
          />
          {productSearch && (
            <button onClick={() => setProductSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
              <X size={13}/>
            </button>
          )}
        </div>

        {productSearch && (
          <p className="text-[11px] text-gray-400 mt-1.5">
            Showing {searchResults.length} result{searchResults.length!==1?'s':''} across all products
          </p>
        )}
        {!productSearch && (
          <p className="text-[11px] text-gray-400 mt-1.5">
            {expiringProducts.length} item{expiringProducts.length!==1?'s':''} expiring in next 6 days
          </p>
        )}
      </div>

      {/* Product list */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {searchResults.length === 0 ? (
          <div className="text-center py-10">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-3"
              style={{ background:`${G}15` }}>
              <CheckCircle size={24} style={{ color:G }}/>
            </div>
            <p className="text-sm font-semibold text-gray-600">
              {productSearch ? 'No products found' : 'No expiring products!'}
            </p>
            <p className="text-xs text-gray-400 mt-1">
              {productSearch ? 'Try a different search term' : 'Great job managing your food'}
            </p>
          </div>
        ) : (
          searchResults.map(p => <ProductCard key={p._id} product={p}/>)
        )}
      </div>

      {/* Selected summary */}
      {selectedProducts.length > 0 && (
        <div className="p-3 border-t border-gray-100" style={{ background:`${G}08` }}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-black" style={{ color:G }}>
              {selectedProducts.length} selected
            </span>
            <button onClick={clearSelection} className="text-xs text-gray-400 hover:text-gray-600 flex items-center gap-1">
              <X size={11}/> Clear
            </button>
          </div>
          <div className="flex flex-wrap gap-1">
            {selectedProducts.map(p => (
              <span key={p._id} className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full"
                style={{ background:`${G}20`, color: GD }}>
                {p.name}
                <button onClick={() => toggleProduct(p)}><X size={9}/></button>
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );

  // ─────────────────────────────────────────────────────────────────────────
  //  PAGE RENDER
  // ─────────────────────────────────────────────────────────────────────────
  if (loading) return (
    <div className="flex items-center justify-center min-h-96">
      <div className="text-center space-y-3">
        <div className="w-12 h-12 border-4 border-gray-200 rounded-full animate-spin mx-auto"
          style={{ borderTopColor: G }}/>
        <p className="text-sm text-gray-400 font-medium">Loading recipes…</p>
      </div>
    </div>
  );

  return (
    <div className="flex flex-col h-full" style={{ fontFamily:"'DM Sans', sans-serif", minHeight:'calc(100vh - 140px)' }}>

      {/* ── Page header ── */}
      <div className="flex items-center gap-3 mb-5 flex-wrap">
        {/* Mobile sidebar toggle */}
        <button
          onClick={() => setSidebarOpen(true)}
          className="lg:hidden flex items-center gap-2 px-3 py-2 rounded-xl border-2 font-bold text-sm transition-all"
          style={{ borderColor: G, color: G, background:`${G}10` }}
        >
          <Menu size={16}/> Products
          {expiringProducts.length > 0 && (
            <span className="px-1.5 py-0.5 rounded-full text-white text-[10px] font-black"
              style={{ background: G }}>{expiringProducts.length}</span>
          )}
        </button>

        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl flex items-center justify-center shadow-md"
            style={{ background:`linear-gradient(135deg, ${G}, ${GD})` }}>
            <ChefHat size={20} className="text-white"/>
          </div>
          <div>
            <h1 className="text-xl font-black text-gray-900">Smart Recipe Assistant</h1>
            <p className="text-xs text-gray-400 font-medium">Select expiring products → generate a recipe</p>
          </div>
        </div>

        {selectedProducts.length > 0 && (
          <div className="ml-auto flex items-center gap-2 px-3 py-1.5 rounded-full border-2 text-sm font-bold"
            style={{ borderColor:`${G}40`, background:`${G}10`, color: G }}>
            <CheckCircle size={14}/>
            {selectedProducts.length} selected
            <button onClick={clearSelection} className="text-gray-400 hover:text-gray-600 ml-1">
              <X size={13}/>
            </button>
          </div>
        )}
      </div>

      {/* ── Main layout: Sidebar + Chat ── */}
      <div className="flex gap-5 flex-1" style={{ minHeight:0 }}>

        {/* ── Mobile Drawer ── */}
        <AnimatePresence>
          {sidebarOpen && (
            <>
              <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}
                onClick={() => setSidebarOpen(false)}
                className="lg:hidden fixed inset-0 bg-black/40 z-40 backdrop-blur-sm"/>
              <motion.div
                initial={{ x:'-100%' }} animate={{ x:0 }} exit={{ x:'-100%' }}
                transition={{ type:'spring', stiffness:300, damping:30 }}
                className="lg:hidden fixed left-0 top-0 bottom-0 w-80 z-50 shadow-2xl overflow-hidden"
                style={{ background:'white' }}>
                <SidebarContent/>
              </motion.div>
            </>
          )}
        </AnimatePresence>

        {/* ── Desktop Sidebar ── */}
        <div className="hidden lg:flex flex-col w-72 xl:w-80 shrink-0 rounded-2xl border-2 border-gray-200 overflow-hidden bg-white shadow-sm">
          <SidebarContent/>
        </div>

        {/* ── Chat Panel ── */}
        <div className="flex-1 flex flex-col rounded-2xl border-2 border-gray-200 overflow-hidden bg-white shadow-sm"
          style={{ minHeight:'520px' }}>

          {/* Chat header */}
          <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between"
            style={{ background:`${G}08` }}>
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl flex items-center justify-center"
                style={{ background:`linear-gradient(135deg, ${G}, ${GD})` }}>
                <Bot size={16} className="text-white"/>
              </div>
              <div>
                <p className="text-sm font-black text-gray-900">AI Recipe Assistant</p>
                <p className="text-[11px] text-gray-400">Powered by GPT-4o · Free via Puter</p>
              </div>
            </div>
            {chatMessages.length > 0 && (
              <button
                onClick={() => setChatMessages([])}
                className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-xl border border-gray-200 text-gray-500 hover:bg-gray-50 transition-all">
                <RefreshCw size={12}/> Clear
              </button>
            )}
          </div>

          {/* Messages area */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4"
            style={{ background:'#FAFAFA' }}>

            {/* Empty state */}
            {chatMessages.length === 0 && (
              <div className="h-full flex flex-col items-center justify-center text-center py-10">
                <div className="w-20 h-20 rounded-3xl flex items-center justify-center mx-auto mb-4 shadow-md"
                  style={{ background:`linear-gradient(135deg, ${G}20, ${G}10)` }}>
                  <ChefHat size={36} style={{ color:G }}/>
                </div>
                <h3 className="text-lg font-black text-gray-800 mb-1">Ready to cook?</h3>
                <p className="text-sm text-gray-400 max-w-xs mb-6">
                  Select products from the left, then click <strong>Generate Recipe</strong> or type your own request below
                </p>

                {/* Quick start chips */}
                <div className="flex flex-wrap gap-2 justify-center max-w-sm">
                  {[
                    '🍳 What can I make with eggs?',
                    '🥗 Quick salad ideas',
                    '🍲 Something with vegetables',
                    '🍪 Easy snack recipe',
                  ].map(q => (
                    <button key={q} onClick={() => sendMessage(q)}
                      className="text-xs font-semibold px-3 py-1.5 rounded-full border-2 transition-all hover:shadow-sm active:scale-95"
                      style={{ borderColor:`${G}30`, color: G, background:`${G}08` }}>
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {chatMessages.map(msg => <ChatBubble key={msg.id} msg={msg}/>)}

            {/* Loading dots */}
            {isAiLoading && (
              <div className="flex justify-start gap-2">
                <div className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 mt-1" style={{ background:`${G}20` }}>
                  <Bot size={14} style={{ color:G }}/>
                </div>
                <div className="px-4 py-3 rounded-2xl rounded-tl-sm bg-white border border-gray-200 shadow-sm flex items-center gap-2">
                  {[0,1,2].map(i => (
                    <motion.div key={i}
                      animate={{ opacity:[0.3,1,0.3], scale:[0.7,1,0.7] }}
                      transition={{ duration:1.2, repeat:Infinity, delay:i*0.18 }}
                      className="w-2 h-2 rounded-full"
                      style={{ background: G }}/>
                  ))}
                </div>
              </div>
            )}
            <div ref={chatEndRef}/>
          </div>

          {/* ── Input area ── */}
          <div className="p-4 border-t border-gray-100 bg-white space-y-3">

            {/* Generate Recipe button — visible when products selected */}
            {selectedProducts.length > 0 && (
              <motion.button
                initial={{ opacity:0, y:6 }} animate={{ opacity:1, y:0 }}
                onClick={() => sendMessage()}
                disabled={isAiLoading}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl text-sm font-black text-white transition-all shadow-md active:scale-98 disabled:opacity-60"
                style={{ background:`linear-gradient(135deg, ${G}, ${GD})` }}
              >
                <Sparkles size={16}/>
                Generate Recipe with {selectedProducts.length} Selected Item{selectedProducts.length!==1?'s':''}
              </motion.button>
            )}

            {/* Text input */}
            <div className="flex gap-2">
              <input
                ref={inputRef}
                type="text"
                value={chatInput}
                onChange={e => setChatInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask anything… e.g. 'Make a healthy breakfast with milk and eggs'"
                className="flex-1 px-4 py-3 text-sm border-2 rounded-2xl outline-none transition-all"
                style={{ borderColor: chatInput ? G : '#E5E7EB' }}
                disabled={isAiLoading}
              />
              <button
                onClick={() => sendMessage()}
                disabled={(!chatInput.trim() && selectedProducts.length === 0) || isAiLoading}
                className="px-4 py-3 rounded-2xl text-white font-bold transition-all shadow-sm active:scale-95 disabled:opacity-50"
                style={{ background:`linear-gradient(135deg, ${G}, ${GD})` }}
              >
                {isAiLoading ? <Loader size={18} className="animate-spin"/> : <Send size={18}/>}
              </button>
            </div>

            {/* Quick action pills */}
            <div className="flex gap-2 flex-wrap">
              {['🔄 New Recipe','💡 Cooking Tips','⏱️ Quick Meal','🥗 Healthy Option'].map(label => (
                <button key={label}
                  onClick={() => sendMessage(label.replace(/^[^\s]+\s/,''))}
                  disabled={isAiLoading}
                  className="text-[11px] font-semibold px-2.5 py-1 rounded-full border transition-all hover:shadow-sm disabled:opacity-50"
                  style={{ borderColor:`${G}30`, color:G, background:`${G}08` }}>
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── Bottom stats ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5">
        {[
          { label:'Expiring Items', value: expiringProducts.length, color:'#D97706', bg:'#FFFBEB' },
          { label:'Selected',       value: selectedProducts.length, color: G,         bg:`${G}10`   },
          { label:'Total Products', value: allProducts.length,      color:'#3B82F6', bg:'#EFF6FF' },
          { label:'Messages',       value: chatMessages.length,     color:'#8B5CF6', bg:'#F5F3FF' },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-2xl border border-gray-200 px-4 py-3 text-center shadow-sm">
            <p className="text-[11px] text-gray-400 font-medium mb-1">{s.label}</p>
            <p className="text-2xl font-black" style={{ color:s.color }}>{s.value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}