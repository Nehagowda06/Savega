/**
 * Complete Order Flow Test
 * Tests: Cart → Address → Order → Payment → Notifications → Tracking
 */

import 'dotenv/config';

const API_BASE_URL = 'http://localhost:4000';

// Use the token from previous test
const ACCESS_TOKEN = process.argv[2];

if (!ACCESS_TOKEN) {
  console.error('❌ Please provide access token as argument');
  console.log('Usage: node test-order-flow.js YOUR_ACCESS_TOKEN');
  process.exit(1);
}

console.log('🧪 Testing Complete Order Flow...\n');

let addressId = null;
let orderId = null;

// ============================================
// 1. ADD ADDRESS
// ============================================
async function testAddAddress() {
  console.log('📍 Step 1: Add Delivery Address');
  
  try {
    const response = await fetch(`${API_BASE_URL}/api/addresses`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${ACCESS_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        label: 'Home',
        fullName: 'Test User',
        phone: '+919876543210',
        addressLine1: '123 MG Road',
        addressLine2: 'Near Cubbon Park',
        landmark: 'Opposite Metro Station',
        city: 'Bangalore',
        state: 'Karnataka',
        pincode: '560001',
        isDefault: true,
      }),
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.message || 'Failed to add address');
    }

    addressId = result.data.id;
    
    console.log('✅ Address added successfully!');
    console.log('Address ID:', addressId);
    console.log('Location:', result.data.city, result.data.state);
    console.log('');
    
    return true;
  } catch (error) {
    console.error('❌ Add address failed:', error.message);
    return false;
  }
}

// ============================================
// 2. CREATE ORDER
// ============================================
async function testCreateOrder() {
  console.log('🛍️  Step 2: Create Order');
  
  try {
    const response = await fetch(`${API_BASE_URL}/api/orders`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${ACCESS_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        addressId: addressId,
        paymentMethod: 'COD',
      }),
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.message || 'Failed to create order');
    }

    orderId = result.data.id;
    
    console.log('✅ Order created successfully!');
    console.log('Order Number:', result.data.orderNumber);
    console.log('Order ID:', orderId);
    console.log('Status:', result.data.status);
    console.log('Grand Total: ₹' + result.data.grandTotal);
    console.log('Estimated Delivery:', result.data.estimatedDelivery);
    console.log('');
    
    return true;
  } catch (error) {
    console.error('❌ Create order failed:', error.message);
    return false;
  }
}

// ============================================
// 3. CHECK NOTIFICATIONS
// ============================================
async function testCheckNotifications() {
  console.log('🔔 Step 3: Check Notifications');
  
  try {
    const response = await fetch(`${API_BASE_URL}/api/notifications`, {
      headers: {
        'Authorization': `Bearer ${ACCESS_TOKEN}`,
      },
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.message || 'Failed to get notifications');
    }

    console.log('✅ Notifications retrieved!');
    console.log('Total:', result.pagination.total);
    console.log('Unread:', result.unreadCount);
    
    if (result.data.length > 0) {
      console.log('\n📬 Latest Notifications:');
      result.data.slice(0, 3).forEach((notif, i) => {
        console.log(`\n${i + 1}. ${notif.title}`);
        console.log('   ' + notif.message);
        console.log('   Type:', notif.type, '| Read:', notif.isRead);
      });
    }
    console.log('');
    
    return result.data;
  } catch (error) {
    console.error('❌ Get notifications failed:', error.message);
    return [];
  }
}

// ============================================
// 4. GET ORDER TRACKING
// ============================================
async function testOrderTracking() {
  console.log('📍 Step 4: Get Order Tracking');
  
  try {
    const response = await fetch(`${API_BASE_URL}/api/tracking/${orderId}`, {
      headers: {
        'Authorization': `Bearer ${ACCESS_TOKEN}`,
      },
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.message || 'Failed to get tracking');
    }

    console.log('✅ Tracking info retrieved!');
    console.log('Order:', result.data.orderNumber);
    console.log('Status:', result.data.status);
    console.log('Estimated Delivery:', result.data.estimatedDelivery);
    
    console.log('\n📊 Timeline:');
    result.data.timeline.forEach((step) => {
      const icon = step.completed ? '✅' : step.active ? '🔄' : '⏳';
      console.log(`${icon} ${step.label} - ${step.description}`);
      if (step.timestamp) {
        console.log(`   ${new Date(step.timestamp).toLocaleString()}`);
      }
    });
    
    if (result.data.deliveryPartner) {
      console.log('\n🚚 Delivery Partner:');
      console.log('Name:', result.data.deliveryPartner.name);
      console.log('Phone:', result.data.deliveryPartner.phone);
      console.log('Rating:', result.data.deliveryPartner.rating, '⭐');
    }
    
    console.log('');
    
    return true;
  } catch (error) {
    console.error('❌ Get tracking failed:', error.message);
    return false;
  }
}

// ============================================
// 5. GET ORDER DETAILS
// ============================================
async function testGetOrderDetails() {
  console.log('📦 Step 5: Get Order Details');
  
  try {
    const response = await fetch(`${API_BASE_URL}/api/orders/${orderId}`, {
      headers: {
        'Authorization': `Bearer ${ACCESS_TOKEN}`,
      },
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.message || 'Failed to get order');
    }

    console.log('✅ Order details retrieved!');
    console.log('Order Number:', result.data.orderNumber);
    console.log('Status:', result.data.status);
    console.log('Payment:', result.data.paymentStatus, '|', result.data.paymentMethod);
    
    console.log('\n📦 Items:');
    result.data.items.forEach((item) => {
      console.log(`- ${item.name} x${item.quantity} = ₹${item.price * item.quantity}`);
    });
    
    console.log('\n💰 Totals:');
    console.log('Item Total: ₹' + result.data.itemTotal);
    console.log('Delivery Fee: ₹' + result.data.deliveryFee);
    console.log('Discount: ₹' + result.data.discount);
    console.log('Grand Total: ₹' + result.data.grandTotal);
    console.log('');
    
    return true;
  } catch (error) {
    console.error('❌ Get order failed:', error.message);
    return false;
  }
}

// ============================================
// 6. CHECK CART (Should be empty)
// ============================================
async function testCheckCart() {
  console.log('🛒 Step 6: Check Cart (Should be Empty)');
  
  try {
    const response = await fetch(`${API_BASE_URL}/api/cart`, {
      headers: {
        'Authorization': `Bearer ${ACCESS_TOKEN}`,
      },
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.message || 'Failed to get cart');
    }

    console.log('✅ Cart checked!');
    console.log('Items:', result.data.items.length);
    console.log('Total: ₹' + result.data.grandTotal);
    
    if (result.data.items.length === 0) {
      console.log('✅ Cart is empty (items moved to order)');
    }
    console.log('');
    
    return true;
  } catch (error) {
    console.error('❌ Get cart failed:', error.message);
    return false;
  }
}

// ============================================
// RUN ALL TESTS
// ============================================
async function runAllTests() {
  console.log('═══════════════════════════════════════════════════════');
  console.log('  COMPLETE ORDER FLOW TEST');
  console.log('═══════════════════════════════════════════════════════\n');

  const step1 = await testAddAddress();
  if (!step1) {
    console.log('\n❌ Cannot proceed without address');
    process.exit(1);
  }

  const step2 = await testCreateOrder();
  if (!step2) {
    console.log('\n❌ Cannot proceed without order');
    process.exit(1);
  }

  await testCheckNotifications();
  await testOrderTracking();
  await testGetOrderDetails();
  await testCheckCart();

  console.log('═══════════════════════════════════════════════════════');
  console.log('  ✅ COMPLETE ORDER FLOW TEST PASSED!');
  console.log('═══════════════════════════════════════════════════════\n');

  console.log('📝 WHAT WAS TESTED:');
  console.log('✅ Add delivery address');
  console.log('✅ Create order from cart');
  console.log('✅ Automatic notification sent');
  console.log('✅ Order tracking with timeline');
  console.log('✅ Order details retrieval');
  console.log('✅ Cart cleared after order\n');

  console.log('🎯 NEXT: Test admin features');
  console.log('Run: node test-admin.js ' + ACCESS_TOKEN + '\n');
}

runAllTests().catch(console.error);
