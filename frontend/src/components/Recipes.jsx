import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';

import {
  ChefHat,
  Clock,
  AlertTriangle,
  Calendar,
  CheckCircle,
  XCircle,
  MessageSquare,
  Send,
  Loader,
  Sparkles,
  Leaf,
  Package,
  ShoppingBag,
  Utensils,
  Timer,
  Award,
  Users,
  Flame,
  ShoppingCart,
  PlusCircle,
  MinusCircle,
  Bot,
  HelpCircle,
  ThumbsUp,
  ThumbsDown,
  Copy,
  Share2,
  Bookmark,
  Apple,
  Beef,
  Coffee,
  Wine,
  Milk,
  Egg,
  Fish,
  Home
} from 'lucide-react';

function Recipes() {
  const [recipes, setRecipes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expiringProducts, setExpiringProducts] = useState([]);
  const [selectedProducts, setSelectedProducts] = useState([]);
  const [chatMessages, setChatMessages] = useState([]);
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const [showChat, setShowChat] = useState(false);
  const [currentRecipe, setCurrentRecipe] = useState(null);
  const [buyNowLoading, setBuyNowLoading] = useState({});

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [recipesResponse, expiringResponse] = await Promise.all([
        axios.get('/api/recipes'),
        axios.get('/api/products/expiring')
      ]);
      
      setRecipes(recipesResponse.data || []);
      setExpiringProducts(expiringResponse.data || []);
    } catch (error) {
      console.error('Error fetching data:', error);
      // Set empty arrays on error to prevent crashes
      setRecipes([]);
      setExpiringProducts([]);
    } finally {
      setLoading(false);
    }
  };

  const getDaysUntilExpiry = (expiryDate) => {
    if (!expiryDate) return 0;
    const today = new Date();
    const expiry = new Date(expiryDate);
    const diffTime = expiry - today;
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  const toggleProductSelection = (product) => {
    if (selectedProducts.find(p => p._id === product._id)) {
      setSelectedProducts(selectedProducts.filter(p => p._id !== product._id));
    } else {
      setSelectedProducts([...selectedProducts, product]);
    }
  };

  const selectAllProducts = () => {
    setSelectedProducts([...expiringProducts]);
  };

  const clearSelection = () => {
    setSelectedProducts([]);
  };

  const handleBuyNow = (productId) => {
    setBuyNowLoading(prev => ({ ...prev, [productId]: true }));
    
    // Simulate API call
    setTimeout(() => {
      setBuyNowLoading(prev => ({ ...prev, [productId]: false }));
      alert(`🛒 Added to cart: ${expiringProducts.find(p => p._id === productId)?.name}`);
    }, 1000);
  };

  const generateRecipe = () => {
    if (selectedProducts.length === 0) {
      alert('Please select at least one product to generate a recipe');
      return;
    }

    setIsChatLoading(true);
    setShowChat(true);
    
    // Add user message
    const userMessage = {
      id: Date.now(),
      type: 'user',
      text: `Generate a recipe using: ${selectedProducts.map(p => p.name).join(', ')}`,
      timestamp: new Date().toISOString()
    };
    
    setChatMessages([userMessage]);

    // Simulate AI response
    setTimeout(() => {
      const productNames = selectedProducts.map(p => p.name);
      const mainProduct = productNames[0] || 'ingredients';
      const otherProducts = productNames.slice(1);
      
      const dummyRecipes = [
        {
          name: `${mainProduct} Delight`,
          ingredients: productNames,
          instructions: `1. Prepare all ingredients\n2. Cook ${mainProduct} until golden\n3. Add ${otherProducts.join(' and ')} and simmer for 15 minutes\n4. Season to taste\n5. Serve hot and enjoy!`,
          prepTime: '25 mins',
          difficulty: 'Easy',
          servings: 4
        },
        {
          name: `Quick ${mainProduct} Stir-fry`,
          ingredients: [...productNames, 'Oil', 'Salt', 'Pepper', 'Garlic'],
          instructions: `1. Heat oil in a pan\n2. Add garlic and sauté until fragrant\n3. Add all ingredients and stir-fry for 10-12 minutes\n4. Season with salt and pepper\n5. Serve with rice or bread`,
          prepTime: '20 mins',
          difficulty: 'Easy',
          servings: 3
        },
        {
          name: `Mediterranean ${mainProduct} Bowl`,
          ingredients: [...productNames, 'Olive oil', 'Lemon juice', 'Herbs', 'Quinoa'],
          instructions: `1. Cook quinoa according to package instructions\n2. Prepare all vegetables\n3. Mix olive oil, lemon juice, and herbs for dressing\n4. Combine everything in a bowl\n5. Drizzle with dressing and serve`,
          prepTime: '30 mins',
          difficulty: 'Medium',
          servings: 2
        }
      ];

      const randomRecipe = dummyRecipes[Math.floor(Math.random() * dummyRecipes.length)];
      setCurrentRecipe(randomRecipe);

      const aiResponse = {
        id: Date.now() + 1,
        type: 'assistant',
        text: `I found a perfect recipe for you! 🍳\n\n**${randomRecipe.name}**\n\n**Ingredients:**\n${randomRecipe.ingredients.map(ing => `• ${ing}`).join('\n')}\n\n**Instructions:**\n${randomRecipe.instructions}\n\n**Time:** ${randomRecipe.prepTime} | **Difficulty:** ${randomRecipe.difficulty} | **Servings:** ${randomRecipe.servings}\n\nWould you like me to suggest another recipe or modify this one?`,
        recipe: randomRecipe,
        timestamp: new Date().toISOString()
      };

      setChatMessages(prev => [...prev, aiResponse]);
      setIsChatLoading(false);
    }, 2000);
  };

  const sendMessage = () => {
    if (!chatInput.trim()) return;

    const userMessage = {
      id: Date.now(),
      type: 'user',
      text: chatInput,
      timestamp: new Date().toISOString()
    };

    setChatMessages(prev => [...prev, userMessage]);
    setChatInput('');
    setIsChatLoading(true);

    // Simulate AI response
    setTimeout(() => {
      const responses = [
        "You can add more ingredients or adjust the cooking time based on your preference.",
        "Try adding some herbs and spices to enhance the flavor!",
        "This recipe works great with pasta or rice as a side dish.",
        "You can store leftovers in an airtight container for up to 3 days.",
        "For a healthier version, reduce the oil and add more vegetables."
      ];

      const aiResponse = {
        id: Date.now() + 1,
        type: 'assistant',
        text: responses[Math.floor(Math.random() * responses.length)],
        timestamp: new Date().toISOString()
      };

      setChatMessages(prev => [...prev, aiResponse]);
      setIsChatLoading(false);
    }, 1500);
  };

  const clearChat = () => {
    setChatMessages([]);
    setCurrentRecipe(null);
    setShowChat(false);
  };

  const getCategoryIcon = (category) => {
    const icons = {
      'Vegetables': Package,
      'Fruits': Package,
      'Meat': Beef,
      'Dairy': Milk,
      'Beverages': Coffee,
      'Snacks': Package,
      'Frozen': Package,
      'Eggs': Egg,
      'Fish': Fish,
      'Other': Package
    };
    return icons[category] || Package;
  };

  if (loading) {
    return (
      <div style={{ 
        minHeight: '400px', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center' 
      }}>
        <div style={{ position: 'relative' }}>
          <div style={{ 
            width: '48px', 
            height: '48px', 
            borderRadius: '50%', 
            border: '4px solid #e5e7eb' 
          }}></div>
          <div style={{ 
            width: '48px', 
            height: '48px', 
            borderRadius: '50%', 
            border: '4px solid #10b981', 
            borderTopColor: 'transparent',
            position: 'absolute',
            top: 0,
            left: 0,
            animation: 'spin 1s linear infinite'
          }}></div>
        </div>
        <style>{`
          @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '0 16px' }}>
      {/* Header */}
      <div style={{ marginBottom: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ 
            padding: '8px', 
            background: 'linear-gradient(135deg, #10b981, #059669)',
            borderRadius: '12px',
            boxShadow: '0 4px 6px -1px rgba(16, 185, 129, 0.2)'
          }}>
            <ChefHat color="white" size={24} />
          </div>
          <h1 style={{ fontSize: '24px', fontWeight: 'bold', color: '#1f2937' }}>
            Smart Recipe Assistant
          </h1>
        </div>
        <p style={{ color: '#6b7280', marginTop: '8px', marginLeft: '48px' }}>
          Select expiring products and let AI create recipes for you
        </p>
      </div>

      {/* Selected Products Badge */}
      {selectedProducts.length > 0 && (
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: '8px', 
          marginBottom: '16px',
          padding: '8px 12px',
          background: '#ecfdf5',
          borderRadius: '8px',
          border: '1px solid #a7f3d0'
        }}>
          <span style={{ 
            padding: '2px 8px', 
            background: '#10b981', 
            color: 'white', 
            borderRadius: '9999px',
            fontSize: '14px',
            fontWeight: '500'
          }}>
            {selectedProducts.length} selected
          </span>
          <button
            onClick={clearSelection}
            style={{
              padding: '4px',
              color: '#6b7280',
              background: 'none',
              border: 'none',
              cursor: 'pointer'
            }}
          >
            <XCircle size={18} />
          </button>
        </div>
      )}

      {/* Main Grid */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: '1fr 2fr', 
        gap: '24px',
        marginBottom: '24px'
      }}>
        {/* Expiring Products Section */}
        <div style={{ 
          background: 'white', 
          borderRadius: '12px', 
          border: '1px solid #e5e7eb',
          overflow: 'hidden'
        }}>
          <div style={{ 
            padding: '16px', 
            borderBottom: '1px solid #e5e7eb',
            background: 'linear-gradient(to right, #fffbeb, #fef3c7)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <h2 style={{ 
                fontWeight: '600', 
                color: '#1f2937', 
                display: 'flex', 
                alignItems: 'center', 
                gap: '8px' 
              }}>
                <AlertTriangle color="#d97706" size={18} />
                Expiring Soon
              </h2>
              {expiringProducts.length > 0 && (
                <button
                  onClick={selectAllProducts}
                  style={{
                    fontSize: '12px',
                    padding: '4px 8px',
                    background: 'white',
                    borderRadius: '8px',
                    border: '1px solid #fcd34d',
                    color: '#b45309',
                    cursor: 'pointer'
                  }}
                >
                  Select All
                </button>
              )}
            </div>
            <p style={{ fontSize: '12px', color: '#6b7280', marginTop: '4px' }}>
              Products expiring in the next 6 days
            </p>
          </div>

          <div style={{ padding: '12px', maxHeight: '500px', overflowY: 'auto' }}>
            {expiringProducts.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '32px 16px' }}>
                <div style={{ 
                  width: '64px', 
                  height: '64px', 
                  background: '#d1fae5', 
                  borderRadius: '50%', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center',
                  margin: '0 auto 12px'
                }}>
                  <CheckCircle color="#10b981" size={32} />
                </div>
                <p style={{ color: '#4b5563' }}>No expiring products!</p>
                <p style={{ fontSize: '12px', color: '#9ca3af', marginTop: '4px' }}>
                  Great job managing your food
                </p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {expiringProducts.map(product => {
                  const daysLeft = getDaysUntilExpiry(product.expiryDate);
                  const isSelected = selectedProducts.find(p => p._id === product._id);
                  const isBuyNowLoading = buyNowLoading[product._id];
                  const CategoryIcon = getCategoryIcon(product.category);

                  return (
                    <div
                      key={product._id}
                      style={{ 
                        border: `1px solid ${isSelected ? '#10b981' : '#e5e7eb'}`,
                        borderRadius: '8px',
                        padding: '12px',
                        background: isSelected ? '#f0fdf4' : 'white',
                        transition: 'all 0.2s'
                      }}
                    >
                      <div style={{ display: 'flex', gap: '12px' }}>
                        {/* Checkbox */}
                        <button
                          onClick={() => toggleProductSelection(product)}
                          style={{
                            width: '20px',
                            height: '20px',
                            borderRadius: '4px',
                            border: `2px solid ${isSelected ? '#10b981' : '#d1d5db'}`,
                            background: isSelected ? '#10b981' : 'transparent',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer'
                          }}
                        >
                          {isSelected && <CheckCircle color="white" size={14} />}
                        </button>

                        {/* Product Icon */}
                        <div style={{ 
                          padding: '6px', 
                          background: daysLeft <= 2 ? '#fee2e2' : '#fef3c7',
                          borderRadius: '8px'
                        }}>
                          <CategoryIcon 
                            color={daysLeft <= 2 ? '#dc2626' : '#d97706'} 
                            size={16} 
                          />
                        </div>

                        {/* Product Details */}
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <h3 style={{ fontWeight: '500', color: '#1f2937', fontSize: '14px' }}>
                              {product.name}
                            </h3>
                            <span style={{ 
                              fontSize: '12px', 
                              padding: '2px 6px', 
                              borderRadius: '9999px',
                              background: daysLeft <= 2 ? '#fee2e2' : '#fef3c7',
                              color: daysLeft <= 2 ? '#dc2626' : '#b45309'
                            }}>
                              {daysLeft} {daysLeft === 1 ? 'day' : 'days'}
                            </span>
                          </div>
                          
                          <div style={{ 
                            display: 'flex', 
                            alignItems: 'center', 
                            gap: '8px', 
                            marginTop: '4px', 
                            fontSize: '12px', 
                            color: '#6b7280' 
                          }}>
                            <Calendar size={10} />
                            {product.expiryDate ? new Date(product.expiryDate).toLocaleDateString() : 'No date'}
                          </div>

                          {/* Buy Now Button */}
                          <button
                            onClick={() => handleBuyNow(product._id)}
                            disabled={isBuyNowLoading}
                            style={{
                              marginTop: '8px',
                              width: '100%',
                              padding: '4px 8px',
                              background: 'linear-gradient(to right, #10b981, #059669)',
                              color: 'white',
                              border: 'none',
                              borderRadius: '8px',
                              fontSize: '12px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: '4px',
                              cursor: isBuyNowLoading ? 'not-allowed' : 'pointer',
                              opacity: isBuyNowLoading ? 0.5 : 1
                            }}
                          >
                            {isBuyNowLoading ? (
                              <>
                                <Loader size={12} style={{ animation: 'spin 1s linear infinite' }} />
                                Adding...
                              </>
                            ) : (
                              <>
                                <ShoppingCart size={12} />
                                Buy Now
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Selection Summary */}
          {selectedProducts.length > 0 && (
            <div style={{ 
              padding: '12px', 
              borderTop: '1px solid #e5e7eb', 
              background: '#f9fafb' 
            }}>
              <p style={{ fontSize: '12px', color: '#4b5563', marginBottom: '8px' }}>
                Selected for recipe:
              </p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                {selectedProducts.map(p => (
                  <span
                    key={p._id}
                    style={{
                      padding: '2px 8px',
                      background: '#d1fae5',
                      color: '#047857',
                      borderRadius: '9999px',
                      fontSize: '12px',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}
                  >
                    {p.name}
                    <button
                      onClick={() => toggleProductSelection(p)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer' }}
                    >
                      <XCircle size={12} color="#047857" />
                    </button>
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Chat/Recipe Section */}
        <div style={{ 
          background: 'white', 
          borderRadius: '12px', 
          border: '1px solid #e5e7eb',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column'
        }}>
          {!showChat ? (
            <div style={{ 
              padding: '32px', 
              textAlign: 'center',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              minHeight: '500px'
            }}>
              <div style={{ 
                width: '96px', 
                height: '96px', 
                background: 'linear-gradient(135deg, #d1fae5, #a7f3d0)',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '16px'
              }}>
                <Bot color="#10b981" size={48} />
              </div>
              <h2 style={{ fontSize: '20px', fontWeight: '600', color: '#1f2937', marginBottom: '8px' }}>
                AI Recipe Assistant
              </h2>
              <p style={{ color: '#6b7280', maxWidth: '400px', marginBottom: '24px' }}>
                Select expiring products from the left and click generate to get personalized recipe suggestions
              </p>
              
              <button
                onClick={generateRecipe}
                disabled={selectedProducts.length === 0}
                style={{
                  padding: '12px 24px',
                  borderRadius: '8px',
                  fontWeight: '500',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  background: selectedProducts.length > 0 
                    ? 'linear-gradient(to right, #10b981, #059669)'
                    : '#e5e7eb',
                  color: selectedProducts.length > 0 ? 'white' : '#9ca3af',
                  border: 'none',
                  cursor: selectedProducts.length > 0 ? 'pointer' : 'not-allowed',
                  boxShadow: selectedProducts.length > 0 ? '0 4px 6px -1px rgba(16, 185, 129, 0.2)' : 'none'
                }}
              >
                <Sparkles size={18} />
                Generate Recipe with {selectedProducts.length} {selectedProducts.length === 1 ? 'Item' : 'Items'}
              </button>

              {selectedProducts.length === 0 && (
                <p style={{ fontSize: '12px', color: '#9ca3af', marginTop: '16px' }}>
                  👆 Select products to get started
                </p>
              )}
            </div>
          ) : (
            <>
              {/* Chat Header */}
              <div style={{ 
                padding: '16px', 
                borderBottom: '1px solid #e5e7eb',
                background: 'linear-gradient(to right, #ecfdf5, #d1fae5)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ padding: '8px', background: '#10b981', borderRadius: '8px' }}>
                    <MessageSquare color="white" size={16} />
                  </div>
                  <div>
                    <h3 style={{ fontWeight: '600', color: '#1f2937' }}>Recipe Assistant</h3>
                    <p style={{ fontSize: '12px', color: '#6b7280' }}>AI-powered cooking suggestions</p>
                  </div>
                </div>
                <button
                  onClick={clearChat}
                  style={{
                    padding: '8px',
                    color: '#6b7280',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer'
                  }}
                >
                  <XCircle size={18} />
                </button>
              </div>

              {/* Chat Messages */}
              <div style={{ 
                flex: 1, 
                padding: '16px', 
                overflowY: 'auto', 
                maxHeight: '400px',
                display: 'flex',
                flexDirection: 'column',
                gap: '16px'
              }}>
                {chatMessages.map((msg) => (
                  <div
                    key={msg.id}
                    style={{
                      display: 'flex',
                      justifyContent: msg.type === 'user' ? 'flex-end' : 'flex-start'
                    }}
                  >
                    <div style={{
                      maxWidth: '80%',
                      padding: '12px',
                      borderRadius: '12px',
                      background: msg.type === 'user' ? '#10b981' : '#f3f4f6',
                      color: msg.type === 'user' ? 'white' : '#1f2937'
                    }}>
                      {msg.type === 'assistant' && msg.recipe ? (
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                            <Utensils color="#10b981" size={16} />
                            <span style={{ fontWeight: '600' }}>{msg.recipe.name}</span>
                          </div>
                          
                          <div style={{ fontSize: '14px', marginBottom: '8px' }}>
                            <div style={{ fontWeight: '500', marginBottom: '4px' }}>Ingredients:</div>
                            <ul style={{ paddingLeft: '20px', marginBottom: '8px' }}>
                              {msg.recipe.ingredients.map((ing, i) => (
                                <li key={i}>{ing}</li>
                              ))}
                            </ul>
                            
                            <div style={{ fontWeight: '500', marginBottom: '4px' }}>Instructions:</div>
                            <p style={{ whiteSpace: 'pre-line', marginBottom: '8px' }}>{msg.recipe.instructions}</p>
                            
                            <div style={{ display: 'flex', gap: '12px', color: '#6b7280', fontSize: '12px' }}>
                              <span><Timer size={12} /> {msg.recipe.prepTime}</span>
                              <span><Award size={12} /> {msg.recipe.difficulty}</span>
                              <span><Users size={12} /> {msg.recipe.servings} servings</span>
                            </div>
                          </div>

                          <div style={{ 
                            display: 'flex', 
                            gap: '8px', 
                            paddingTop: '8px', 
                            borderTop: '1px solid #e5e7eb',
                            marginTop: '8px'
                          }}>
                            <button style={{ padding: '4px', background: 'none', border: 'none', cursor: 'pointer' }}>
                              <ThumbsUp size={14} color="#6b7280" />
                            </button>
                            <button style={{ padding: '4px', background: 'none', border: 'none', cursor: 'pointer' }}>
                              <ThumbsDown size={14} color="#6b7280" />
                            </button>
                            <button style={{ padding: '4px', background: 'none', border: 'none', cursor: 'pointer' }}>
                              <Copy size={14} color="#6b7280" />
                            </button>
                            <button style={{ padding: '4px', background: 'none', border: 'none', cursor: 'pointer' }}>
                              <Bookmark size={14} color="#6b7280" />
                            </button>
                          </div>
                        </div>
                      ) : (
                        <p style={{ fontSize: '14px', whiteSpace: 'pre-line' }}>{msg.text}</p>
                      )}
                      <p style={{ 
                        fontSize: '10px', 
                        opacity: 0.7, 
                        marginTop: '4px',
                        textAlign: 'right'
                      }}>
                        {new Date(msg.timestamp).toLocaleTimeString()}
                      </p>
                    </div>
                  </div>
                ))}

                {isChatLoading && (
                  <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
                    <div style={{ 
                      background: '#f3f4f6', 
                      padding: '12px', 
                      borderRadius: '12px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px'
                    }}>
                      <Loader size={16} style={{ animation: 'spin 1s linear infinite' }} />
                      <span style={{ fontSize: '14px', color: '#4b5563' }}>Thinking...</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Chat Input */}
              <div style={{ padding: '16px', borderTop: '1px solid #e5e7eb' }}>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input
                    type="text"
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                    placeholder="Ask about the recipe or request modifications..."
                    style={{
                      flex: 1,
                      padding: '8px 12px',
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px',
                      outline: 'none'
                    }}
                  />
                  <button
                    onClick={sendMessage}
                    disabled={!chatInput.trim() || isChatLoading}
                    style={{
                      padding: '8px 12px',
                      background: '#10b981',
                      color: 'white',
                      border: 'none',
                      borderRadius: '8px',
                      cursor: !chatInput.trim() || isChatLoading ? 'not-allowed' : 'pointer',
                      opacity: !chatInput.trim() || isChatLoading ? 0.5 : 1
                    }}
                  >
                    <Send size={18} />
                  </button>
                </div>
                
                {/* Quick Actions */}
                <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
                  <button
                    onClick={generateRecipe}
                    style={{
                      fontSize: '12px',
                      padding: '4px 8px',
                      background: '#f3f4f6',
                      border: 'none',
                      borderRadius: '4px',
                      color: '#4b5563',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      cursor: 'pointer'
                    }}
                  >
                    <Sparkles size={12} />
                    New Recipe
                  </button>
                  <button style={{
                    fontSize: '12px',
                    padding: '4px 8px',
                    background: '#f3f4f6',
                    border: 'none',
                    borderRadius: '4px',
                    color: '#4b5563',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    cursor: 'pointer'
                  }}>
                    <HelpCircle size={12} />
                    Tips
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Quick Stats */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(4, 1fr)', 
        gap: '16px',
        marginTop: '24px'
      }}>
        <div style={{ 
          background: 'white', 
          padding: '12px', 
          borderRadius: '8px', 
          border: '1px solid #e5e7eb',
          textAlign: 'center'
        }}>
          <p style={{ fontSize: '12px', color: '#6b7280' }}>Expiring Items</p>
          <p style={{ fontSize: '20px', fontWeight: 'bold', color: '#d97706' }}>{expiringProducts.length}</p>
        </div>
        <div style={{ 
          background: 'white', 
          padding: '12px', 
          borderRadius: '8px', 
          border: '1px solid #e5e7eb',
          textAlign: 'center'
        }}>
          <p style={{ fontSize: '12px', color: '#6b7280' }}>Selected</p>
          <p style={{ fontSize: '20px', fontWeight: 'bold', color: '#10b981' }}>{selectedProducts.length}</p>
        </div>
        <div style={{ 
          background: 'white', 
          padding: '12px', 
          borderRadius: '8px', 
          border: '1px solid #e5e7eb',
          textAlign: 'center'
        }}>
          <p style={{ fontSize: '12px', color: '#6b7280' }}>Recipes Available</p>
          <p style={{ fontSize: '20px', fontWeight: 'bold', color: '#3b82f6' }}>{recipes.length}</p>
        </div>
        <div style={{ 
          background: 'white', 
          padding: '12px', 
          borderRadius: '8px', 
          border: '1px solid #e5e7eb',
          textAlign: 'center'
        }}>
          <p style={{ fontSize: '12px', color: '#6b7280' }}>Waste Saved</p>
          <p style={{ fontSize: '20px', fontWeight: 'bold', color: '#8b5cf6' }}>2.5kg</p>
        </div>
      </div>

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

export default Recipes;