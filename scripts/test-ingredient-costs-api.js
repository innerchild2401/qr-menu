// Test script to verify ingredient costs API
// Run this with: node scripts/test-ingredient-costs-api.js

const testIngredientCosts = async () => {
  try {
    console.log('🧪 Testing Ingredient Costs API...');
    
    // Test data
    const testData = {
      ingredients: ['carne de porc', 'ceapă', 'usturoi', 'sare'],
      language: 'ro',
      restaurantId: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
      userId: 'test-user'
    };
    
    console.log('📤 Sending test data:', testData);
    
    // Make API call
    const response = await fetch('http://localhost:3000/api/calculate-ingredient-costs', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer test-token' // This will be handled by your auth system
      },
      body: JSON.stringify(testData)
    });
    
    console.log('📥 Response status:', response.status);
    
    if (response.ok) {
      const result = await response.json();
      console.log('✅ Success! API Response:', JSON.stringify(result, null, 2));
    } else {
      const error = await response.text();
      console.log('❌ Error:', error);
    }
    
  } catch (error) {
    console.error('💥 Test failed:', error.message);
  }
};

// Run the test
testIngredientCosts();
