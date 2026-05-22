/**
 * Authentication Test Script
 * Tests Supabase auth and protected API endpoints
 */

import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;
const API_BASE_URL = 'http://localhost:4000';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Test user credentials
const TEST_USER = {
  email: 'test@savega.com',
  password: 'Test@123456',
  name: 'Test User',
  phone: '+919876543210'
};

let accessToken = null;

console.log('🧪 Starting Authentication Tests...\n');

// ============================================
// 1. SIGN UP TEST USER
// ============================================
async function testSignUp() {
  console.log('📝 Test 1: Sign Up New User');
  console.log('Email:', TEST_USER.email);
  
  try {
    const { data, error } = await supabase.auth.signUp({
      email: TEST_USER.email,
      password: TEST_USER.password,
      options: {
        data: {
          name: TEST_USER.name,
          phone: TEST_USER.phone,
        },
      },
    });

    if (error) {
      if (error.message.includes('already registered')) {
        console.log('⚠️  User already exists, will try to sign in instead\n');
        return false;
      }
      throw error;
    }

    console.log('✅ Sign up successful!');
    console.log('User ID:', data.user?.id);
    console.log('Email:', data.user?.email);
    console.log('⚠️  Check your email for verification link (if email confirmation is enabled)\n');
    
    return true;
  } catch (error) {
    console.error('❌ Sign up failed:', error.message);
    return false;
  }
}

// ============================================
// 2. SIGN IN TEST USER
// ============================================
async function testSignIn() {
  console.log('🔐 Test 2: Sign In');
  console.log('Email:', TEST_USER.email);
  
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: TEST_USER.email,
      password: TEST_USER.password,
    });

    if (error) throw error;

    accessToken = data.session.access_token;
    
    console.log('✅ Sign in successful!');
    console.log('User ID:', data.user.id);
    console.log('Email:', data.user.email);
    console.log('Access Token:', accessToken.substring(0, 50) + '...');
    console.log('Token expires at:', new Date(data.session.expires_at * 1000).toLocaleString());
    console.log('');
    
    return true;
  } catch (error) {
    console.error('❌ Sign in failed:', error.message);
    console.log('💡 Tip: If email confirmation is enabled in Supabase, verify your email first\n');
    return false;
  }
}

// ============================================
// 3. TEST PROTECTED API - GET PROFILE
// ============================================
async function testGetProfile() {
  console.log('👤 Test 3: Get User Profile (Protected API)');
  
  try {
    const response = await fetch(`${API_BASE_URL}/api/profile`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.message || 'Failed to get profile');
    }

    console.log('✅ Profile retrieved successfully!');
    console.log('Profile:', JSON.stringify(result.data, null, 2));
    console.log('');
    
    return result.data;
  } catch (error) {
    console.error('❌ Get profile failed:', error.message);
    return null;
  }
}

// ============================================
// 4. TEST PROTECTED API - ADD TO CART
// ============================================
async function testAddToCart() {
  console.log('🛒 Test 4: Add Item to Cart (Protected API)');
  
  try {
    // First, get a product ID
    const productsResponse = await fetch(`${API_BASE_URL}/api/products?limit=1`);
    const productsResult = await productsResponse.json();
    
    if (!productsResult.data || productsResult.data.length === 0) {
      throw new Error('No products available');
    }

    const productId = productsResult.data[0].id;
    const productName = productsResult.data[0].name;
    
    console.log('Adding product:', productName);

    const response = await fetch(`${API_BASE_URL}/api/cart/items`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        productId: productId,
        quantity: 2,
      }),
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.message || 'Failed to add to cart');
    }

    console.log('✅ Item added to cart successfully!');
    console.log('Cart Item:', JSON.stringify(result.data, null, 2));
    console.log('');
    
    return true;
  } catch (error) {
    console.error('❌ Add to cart failed:', error.message);
    return false;
  }
}

// ============================================
// 5. TEST PROTECTED API - GET CART
// ============================================
async function testGetCart() {
  console.log('🛍️  Test 5: Get Cart (Protected API)');
  
  try {
    const response = await fetch(`${API_BASE_URL}/api/cart`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.message || 'Failed to get cart');
    }

    console.log('✅ Cart retrieved successfully!');
    console.log('Cart Summary:');
    console.log('  Items:', result.data.items.length);
    console.log('  Item Total: ₹' + result.data.itemTotal);
    console.log('  Delivery Fee: ₹' + result.data.deliveryFee);
    console.log('  Grand Total: ₹' + result.data.grandTotal);
    console.log('');
    
    return result.data;
  } catch (error) {
    console.error('❌ Get cart failed:', error.message);
    return null;
  }
}

// ============================================
// 6. TEST PROTECTED API - GET NOTIFICATIONS
// ============================================
async function testGetNotifications() {
  console.log('🔔 Test 6: Get Notifications (Protected API)');
  
  try {
    const response = await fetch(`${API_BASE_URL}/api/notifications`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.message || 'Failed to get notifications');
    }

    console.log('✅ Notifications retrieved successfully!');
    console.log('Total Notifications:', result.pagination.total);
    console.log('Unread Count:', result.unreadCount);
    
    if (result.data.length > 0) {
      console.log('\nLatest Notification:');
      console.log('  Title:', result.data[0].title);
      console.log('  Message:', result.data[0].message);
      console.log('  Type:', result.data[0].type);
    }
    console.log('');
    
    return result.data;
  } catch (error) {
    console.error('❌ Get notifications failed:', error.message);
    return null;
  }
}

// ============================================
// 7. TEST WITHOUT AUTH (Should Fail)
// ============================================
async function testWithoutAuth() {
  console.log('🚫 Test 7: Access Protected API Without Auth (Should Fail)');
  
  try {
    const response = await fetch(`${API_BASE_URL}/api/profile`);
    const result = await response.json();

    if (response.status === 401) {
      console.log('✅ Correctly rejected! Status:', response.status);
      console.log('Error:', result.message);
      console.log('');
      return true;
    } else {
      console.log('❌ Should have been rejected but got status:', response.status);
      return false;
    }
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    return false;
  }
}

// ============================================
// RUN ALL TESTS
// ============================================
async function runAllTests() {
  console.log('═══════════════════════════════════════════════════════');
  console.log('  SUPABASE AUTHENTICATION & PROTECTED API TESTS');
  console.log('═══════════════════════════════════════════════════════\n');

  // Check if server is running
  try {
    const healthCheck = await fetch(`${API_BASE_URL}/health`);
    if (!healthCheck.ok) {
      throw new Error('Server not responding');
    }
    console.log('✅ Backend server is running\n');
  } catch (error) {
    console.error('❌ Backend server is not running!');
    console.error('Please start the server with: npm run dev\n');
    process.exit(1);
  }

  // Run tests
  const signedUp = await testSignUp();
  
  if (!signedUp) {
    // User exists, try to sign in
    const signedIn = await testSignIn();
    if (!signedIn) {
      console.log('\n❌ Cannot proceed without authentication');
      console.log('\n💡 TROUBLESHOOTING:');
      console.log('1. Check if email confirmation is enabled in Supabase');
      console.log('2. Go to Supabase Dashboard → Authentication → Settings');
      console.log('3. Disable "Enable email confirmations" for testing');
      console.log('4. Or verify the email sent to:', TEST_USER.email);
      process.exit(1);
    }
  } else {
    // New user created, sign in
    await testSignIn();
  }

  // Test protected APIs
  await testGetProfile();
  await testAddToCart();
  await testGetCart();
  await testGetNotifications();
  await testWithoutAuth();

  console.log('═══════════════════════════════════════════════════════');
  console.log('  ✅ ALL TESTS COMPLETED!');
  console.log('═══════════════════════════════════════════════════════\n');

  console.log('📝 NEXT STEPS:');
  console.log('1. Test other protected APIs (orders, addresses, lists)');
  console.log('2. Test admin APIs (requires admin role)');
  console.log('3. Deploy backend to Render');
  console.log('4. Connect frontend to backend\n');

  console.log('🔑 SAVE THIS ACCESS TOKEN FOR MANUAL TESTING:');
  console.log(accessToken);
  console.log('\nUse it in API requests:');
  console.log('Authorization: Bearer ' + accessToken.substring(0, 30) + '...\n');
}

// Run tests
runAllTests().catch(console.error);
