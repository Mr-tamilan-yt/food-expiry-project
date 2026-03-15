import express from 'express';
import auth from '../middleware/auth.js';
import Product from '../models/Product.js';

const router = express.Router();

// Recipe generator endpoint
router.get('/', auth, async (req, res) => {
  try {
    const expiringProducts = await Product.find({
      userId: req.user._id,
      status: 'active',
      expiryDate: { $lte: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000) } // 3 days
    });

    const productNames = expiringProducts.map(p => p.name);
    
    // Generate recipe suggestions based on expiring products
    const recipes = generateRecipes(productNames);
    
    res.json(recipes);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

function generateRecipes(products) {
  const allRecipes = [
    {
      id: 1,
      name: "Quick Vegetable Stir Fry",
      ingredients: ["Any vegetables", "Soy sauce", "Garlic", "Ginger", "Oil"],
      instructions: "Chop vegetables and stir fry with garlic and ginger. Add soy sauce and serve with rice.",
      prepTime: "15 mins",
      difficulty: "Easy"
    },
    {
      id: 2,
      name: "Fruit Smoothie",
      ingredients: ["Fruits", "Yogurt or milk", "Honey", "Ice"],
      instructions: "Blend all ingredients together until smooth. Add honey to taste.",
      prepTime: "5 mins",
      difficulty: "Easy"
    },
    {
      id: 3,
      name: "Omelette",
      ingredients: ["Eggs", "Vegetables", "Cheese", "Milk", "Butter"],
      instructions: "Beat eggs with milk. Cook in buttered pan, add vegetables and cheese. Fold and serve.",
      prepTime: "10 mins",
      difficulty: "Easy"
    },
    {
      id: 4,
      name: "Pasta with Vegetables",
      ingredients: ["Pasta", "Vegetables", "Olive oil", "Garlic", "Herbs"],
      instructions: "Cook pasta. Sauté vegetables with garlic and olive oil. Mix with pasta and herbs.",
      prepTime: "20 mins",
      difficulty: "Easy"
    },
    {
      id: 5,
      name: "Salad Bowl",
      ingredients: ["Fresh vegetables", "Leafy greens", "Dressing", "Nuts/seeds"],
      instructions: "Chop all vegetables and mix with greens. Add dressing and toppings.",
      prepTime: "10 mins",
      difficulty: "Easy"
    }
  ];

  // Filter recipes based on available ingredients
  const matchingRecipes = allRecipes.filter(recipe => {
    const recipeIngredients = recipe.ingredients.join(' ').toLowerCase();
    return products.some(product => 
      recipeIngredients.includes(product.toLowerCase())
    );
  });

  return matchingRecipes.length > 0 ? matchingRecipes : allRecipes.slice(0, 3);
}

export default router;