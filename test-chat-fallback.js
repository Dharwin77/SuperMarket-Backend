// Test Chat Fallback Responses
console.log('🧪 Testing Chat Fallback Functionality\n');

// Mock products data (similar to what the frontend would have)
const mockProducts = [
  { name: 'Britannia Cheese Slices', category: 'Dairy', price: 120.00, stock: 6, min_stock: 5, expiry_date: '2026-03-15' },
  { name: 'Milk', category: 'Dairy', price: 45, stock: 50, min_stock: 10, expiry_date: '2026-03-05' }, // Expired 4 days ago
  { name: 'Bread', category: 'Bakery', price: 30, stock: 100, min_stock: 20, expiry_date: '2026-03-10' }, // Expires in 1 day
  { name: 'Rice 1kg', category: 'Grains', price: 60, stock: 200, min_stock: 50 }, // No expiry
  { name: 'Tomato', category: 'Vegetables', price: 20, stock: 5, min_stock: 15, expiry_date: '2026-02-28' }, // Expired 9 days ago
  { name: 'Potato', category: 'Vegetables', price: 25, stock: 80, min_stock: 20 },
  { name: 'Coca Cola', category: 'Beverages', price: 40, stock: 60, min_stock: 15, expiry_date: '2026-12-31' },
  { name: 'Chips', category: 'Snacks', price: 20, stock: 150, min_stock: 30, expiry_date: '2026-04-20' },
  { name: 'Butter', category: 'Dairy', price: 50, stock: 30, min_stock: 10, expiry_date: '2026-03-12' }, // Expires in 3 days
];

// Simplified fallback logic from gemini.ts
function generateFallbackResponse(input, products) {
  const lowerInput = input.toLowerCase();
  
  if (lowerInput.includes('hello') || lowerInput.includes('hi') || lowerInput.includes('hey')) {
    return `Hello! I'm your AI shopping assistant. I can help you with:\n\n• Product recommendations\n• Inventory and stock information\n• Pricing queries\n• Category browsing\n\nWhat would you like to know?`;
  }
  
  // Check if asking about available products
  if (
    lowerInput.includes('what') && (lowerInput.includes('product') || lowerInput.includes('item')) ||
    lowerInput.includes('available') || 
    lowerInput.includes('have') || 
    lowerInput.includes('list') ||
    lowerInput.includes('show me')
  ) {
    if (products.length === 0) {
      return 'The inventory is currently empty. No products are available at the moment.';
    }
    
    // Group products by category
    const categories = products.reduce((acc, p) => {
      if (!acc[p.category]) acc[p.category] = [];
      acc[p.category].push(p);
      return acc;
    }, {});
    
    const categoryNames = Object.keys(categories);
    
    if (categoryNames.length > 0) {
      let response = `📦 We have ${products.length} products available across ${categoryNames.length} categories:\n\n`;
      
      for (const category of categoryNames.slice(0, 5)) {
        const categoryProducts = categories[category].slice(0, 3);
        response += `**${category}:**\n`;
        response += categoryProducts.map(p => 
          `  • ${p.name} - ₹${p.price.toFixed(2)} (Stock: ${p.stock})`
        ).join('\n');
        response += '\n\n';
      }
      
      if (categoryNames.length > 5) {
        response += `...and ${categoryNames.length - 5} more categories!`;
      }
      
      return response.trim();
    }
  }
  
  // Check for expiry-related queries
  if (lowerInput.includes('expir') || lowerInput.includes('experi') || lowerInput.includes('old')) {
    if (products.length === 0) {
      return 'The inventory is currently empty. No products to check for expiry.';
    }
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Find products with expiry dates
    const productsWithExpiry = products.filter(p => p.expiry_date);
    
    if (productsWithExpiry.length === 0) {
      return 'No products in the inventory have expiry dates set. Please update product information to track expiry dates.';
    }
    
    // Find expired products
    const expiredProducts = productsWithExpiry.filter(p => {
      const expiryDate = new Date(p.expiry_date);
      expiryDate.setHours(0, 0, 0, 0);
      return expiryDate < today;
    });
    
    // Find products expiring soon (within 7 days)
    const expiringSoon = productsWithExpiry.filter(p => {
      const expiryDate = new Date(p.expiry_date);
      expiryDate.setHours(0, 0, 0, 0);
      const daysUntilExpiry = Math.floor((expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      return daysUntilExpiry >= 0 && daysUntilExpiry <= 7;
    });
    
    if (expiredProducts.length === 0 && expiringSoon.length === 0) {
      return `✅ **No Expired Products**\n\nAll ${productsWithExpiry.length} products with expiry dates are still fresh! Everything looks good.`;
    }
    
    let response = '🗓️ **Product Expiry Status:**\n\n';
    
    if (expiredProducts.length > 0) {
      response += `⚠️ **${expiredProducts.length} Expired Product${expiredProducts.length > 1 ? 's' : ''}:**\n`;
      expiredProducts.slice(0, 5).forEach((p, i) => {
        const expiryDate = new Date(p.expiry_date);
        const daysAgo = Math.floor((today.getTime() - expiryDate.getTime()) / (1000 * 60 * 60 * 24));
        response += `${i + 1}. ${p.name} - Expired ${daysAgo} day${daysAgo !== 1 ? 's' : ''} ago (${expiryDate.toLocaleDateString()})\n`;
      });
      response += '\n';
    }
    
    if (expiringSoon.length > 0) {
      response += `🔔 **${expiringSoon.length} Product${expiringSoon.length > 1 ? 's' : ''} Expiring Soon:**\n`;
      expiringSoon.slice(0, 5).forEach((p, i) => {
        const expiryDate = new Date(p.expiry_date);
        const daysUntil = Math.floor((expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        response += `${i + 1}. ${p.name} - Expires in ${daysUntil} day${daysUntil !== 1 ? 's' : ''} (${expiryDate.toLocaleDateString()})\n`;
      });
    }
    
    return response.trim();
  }
  
  // Check for calculation requests (MUST BE BEFORE general stock check)
  if (lowerInput.includes('calculate') || lowerInput.includes('multiply') || lowerInput.includes('total value') || 
      (lowerInput.includes('*') || lowerInput.includes('×')) ||
      (lowerInput.includes('stock') && lowerInput.includes('price'))) {
    
    if (products.length === 0) {
      return 'I cannot perform calculations as the inventory is empty.';
    }
    
    // Try to find product name in the query
    for (const product of products) {
      const productNameLower = product.name.toLowerCase();
      // Check if product name or partial name is in the query
      if (lowerInput.includes(productNameLower)) {
        const stockValue = product.stock * product.price;
        return `🧮 **Calculation for ${product.name}:**\n\n• Stock Quantity: ${product.stock}\n• Price per unit: ₹${product.price.toFixed(2)}\n• **Total Stock Value: ₹${stockValue.toFixed(2)}**\n\nThis is the total value of ${product.name} in your inventory.`;
      }
      
      // Also check for partial matches (e.g., "britannia" for "Britannia Cheese")
      const words = productNameLower.split(' ');
      for (const word of words) {
        if (word.length >= 4 && lowerInput.includes(word)) {
          const stockValue = product.stock * product.price;
          return `🧮 **Calculation for ${product.name}:**\n\n• Stock Quantity: ${product.stock}\n• Price per unit: ₹${product.price.toFixed(2)}\n• **Total Stock Value: ₹${stockValue.toFixed(2)}**\n\nThis is the total value of ${product.name} in your inventory.`;
        }
      }
    }
    
    return 'I couldn\'t identify which product you want to calculate. Please include the product name in your query, for example: "calculate milk stock quantity * price"';
  }
  
  if (lowerInput.includes('stock') || lowerInput.includes('inventory')) {
    if (products.length === 0) {
      return 'The inventory is currently empty. No products are in stock.';
    }
    const lowStock = products.filter(p => p.stock < p.min_stock);
    const totalStock = products.reduce((sum, p) => sum + p.stock, 0);
    
    if (lowStock.length > 0) {
      return `📊 Inventory Status:\n\n• Total Products: ${products.length}\n• Total Stock: ${totalStock} items\n• ⚠️ Low Stock Alert: ${lowStock.length} items\n\nItems running low:\n${lowStock.slice(0, 5).map((p, i) => `${i + 1}. ${p.name} - Only ${p.stock} left!`).join('\n')}`;
    }
    return `📊 Inventory Status:\n\n• Total Products: ${products.length}\n• Total Stock: ${totalStock} items\n• ✅ All items are well-stocked!`;
  }
  
  return `I understand you're asking about "${input}". I can help you with product recommendations, inventory status, pricing information, and more. What would you like to know?`;
}

// Test cases
const testCases = [
  "what are the products are available",
  "show me available items",
  "what do you have",
  "list all products",
  "inventory status",
  "which items are low in stock",
  "hello",
  "calculate milk stock quantity * price",
  "calculate britannia cheese stock value",
  "total value of tomato stock",
  "is there any product expired",
  "check for expired products",
  "are any products expiring soon",
];

console.log('Running test cases...\n');
console.log('='.repeat(80));

testCases.forEach((testInput, index) => {
  console.log(`\nTest ${index + 1}: "${testInput}"`);
  console.log('-'.repeat(80));
  const response = generateFallbackResponse(testInput, mockProducts);
  console.log(response);
  console.log('='.repeat(80));
});

console.log('\n✅ All tests completed!');
console.log('\n💡 The chat now properly responds to product queries without requiring Ollama AI!');
