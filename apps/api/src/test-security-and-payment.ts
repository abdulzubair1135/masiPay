import mongoose from 'mongoose';
import { ENV } from './config/env.js';
import { User } from './models/User.js';
import { MenuItem } from './models/MenuItem.js';
import { MenuCategory } from './models/MenuCategory.js';
import { Order } from './models/Order.js';
import { Payment } from './models/Payment.js';
import { OrderService } from './services/order.service.js';
import { PaymentService } from './services/payment.service.js';
import { generateToken, verifyToken } from './utils/jwt.js';

async function runSecurityAndPaymentTests() {
  console.log('====================================================');
  console.log('🛡️ RUNNING COMPREHENSIVE SECURITY & PAYMENT TEST SUITE');
  console.log('====================================================\n');

  await mongoose.connect(ENV.MONGODB_URI);
  console.log('✅ Connected to MongoDB Database');

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string, detail?: string) {
    if (condition) {
      console.log(`  🟢 PASS: ${testName} ${detail ? `(${detail})` : ''}`);
      passed++;
    } else {
      console.error(`  🔴 FAIL: ${testName} ${detail ? `(${detail})` : ''}`);
      failed++;
    }
  }

  try {
    // -------------------------------------------------------------
    // TEST 1: Price Tampering / Server-Side Price Calculation Check
    // -------------------------------------------------------------
    console.log('\n[1/6] 🛡️ Testing Price Tampering & Injection Attack...');
    let cat = await MenuCategory.findOne({ name: 'Snacks' });
    if (!cat) cat = await MenuCategory.create({ name: 'Snacks', displayOrder: 1 });

    let item = await MenuItem.findOne({ name: 'Security Test Samosa' });
    if (!item) {
      item = await MenuItem.create({
        categoryId: cat._id,
        name: 'Security Test Samosa',
        price: 25, // Actual Price = 25
        available: true,
        isVeg: true,
      });
    }

    // Student tries to send price = 1 in payload
    const testStudent = await User.create({
      name: 'Test Student Security',
      phone: `99999${Date.now().toString().slice(-5)}`,
      role: 'STUDENT',
      language: 'en',
      status: 'ACTIVE',
    });

    const orderPayload = {
      userId: testStudent._id.toString(),
      items: [{ menuItemId: item._id.toString(), quantity: 2, price: 1 }], // Injected fake price ₹1
    };

    const createdOrder = await OrderService.createOrder(orderPayload);
    if (!createdOrder) throw new Error('Failed to create order');

    assert(
      createdOrder.total === 50,
      'Server recalculates price strictly from DB',
      `Expected ₹50 (2 × ₹25), Got ₹${createdOrder.total}`
    );

    // -------------------------------------------------------------
    // TEST 2: Automated Smart Counter Allocation Check
    // -------------------------------------------------------------
    console.log('\n[2/6] 📍 Testing Automated Smart Counter Allocation...');
    assert(
      !!createdOrder.pickupCounter && createdOrder.pickupCounter.startsWith('Counter'),
      'Auto-Assigned Counter on Order Creation',
      `Assigned to: ${createdOrder.pickupCounter}`
    );

    // -------------------------------------------------------------
    // TEST 3: Duplicate UTR Anti-Fraud Replay Attack Test
    // -------------------------------------------------------------
    console.log('\n[3/6] 💳 Testing Anti-Fraud Duplicate UTR Protection...');
    const sharedUTR = `UTR_TEST_${Date.now()}`;
    await PaymentService.claimPayment(
      createdOrder._id.toString(),
      testStudent._id.toString(),
      sharedUTR,
      'UPI_MANUAL'
    );
    assert(true, 'First claim with unique UTR accepted', `UTR: ${sharedUTR}`);

    // Create a 2nd order with a different student trying to reuse the same UTR
    const student2 = await User.create({
      name: 'Attacker Student',
      phone: `88888${Date.now().toString().slice(-5)}`,
      role: 'STUDENT',
      language: 'en',
      status: 'ACTIVE',
    });
    const order2 = await OrderService.createOrder({
      userId: student2._id.toString(),
      items: [{ menuItemId: item._id.toString(), quantity: 1 }],
    });
    if (!order2) throw new Error('Failed to create order 2');

    let duplicateBlocked = false;
    try {
      await PaymentService.claimPayment(
        order2._id.toString(),
        student2._id.toString(),
        sharedUTR, // REUSED SAME UTR
        'UPI_MANUAL'
      );
    } catch (err: any) {
      duplicateBlocked = true;
      assert(
        err.message.includes('already been used'),
        'Blocked duplicate UTR replay attack',
        err.message
      );
    }
    if (!duplicateBlocked) {
      assert(false, 'Duplicate UTR was NOT blocked');
    }

    // -------------------------------------------------------------
    // TEST 4: IDOR / Order Ownership Check
    // -------------------------------------------------------------
    console.log('\n[4/6] 🔒 Testing IDOR (Insecure Direct Object Reference)...');
    let unauthorizedClaimBlocked = false;
    try {
      // Student 2 tries to claim payment on Student 1's order
      await PaymentService.claimPayment(
        createdOrder._id.toString(),
        student2._id.toString(),
        'NEW_UTR_123',
        'UPI_MANUAL'
      );
    } catch (err: any) {
      unauthorizedClaimBlocked = true;
      assert(
        err.message.includes('Unauthorized'),
        'Student cannot claim or alter another student’s order'
      );
    }
    if (!unauthorizedClaimBlocked) {
      assert(false, 'Student 2 altered Student 1 order!');
    }

    // -------------------------------------------------------------
    // TEST 5: Strict Payment Verification Authorization
    // -------------------------------------------------------------
    console.log('\n[5/6] 👩‍🍳 Testing Payment Verification & Kitchen Lifecycle...');
    const masiStaff = await User.create({
      name: 'Masi Kitchen Staff',
      phone: `77777${Date.now().toString().slice(-5)}`,
      role: 'STAFF',
      language: 'en',
      status: 'ACTIVE',
    });

    // Masi verifies payment
    const verifiedResult = await PaymentService.verifyPayment(
      createdOrder._id.toString(),
      masiStaff
    );
    assert(
      (verifiedResult as any).order?.status === 'ACCEPTED' || (verifiedResult as any).status === 'ACCEPTED',
      'Payment verified transitions status to ACCEPTED'
    );

    // Masi starts preparing
    const prepOrder = await OrderService.updateOrderStatus(
      createdOrder._id.toString(),
      'PREPARING',
      masiStaff
    );
    assert(prepOrder.status === 'PREPARING', 'Kitchen preparing status updated');

    // Masi marks ready with Counter B
    const readyOrder = await OrderService.updateOrderStatus(
      createdOrder._id.toString(),
      'READY',
      masiStaff,
      undefined,
      'Counter B'
    );
    assert(
      readyOrder.status === 'READY' && readyOrder.pickupCounter === 'Counter B',
      'Marked READY with Counter B placement'
    );

    // Masi hands over (delivered)
    const deliveredOrder = await OrderService.updateOrderStatus(
      createdOrder._id.toString(),
      'DELIVERED',
      masiStaff
    );
    assert(deliveredOrder.status === 'DELIVERED', 'Order completed & delivered');

    // -------------------------------------------------------------
    // TEST 6: JWT Token Tampering & Expiry Validation
    // -------------------------------------------------------------
    console.log('\n[6/6] 🔑 Testing JWT Signature & Tamper Resistance...');
    const validToken = generateToken({
      userId: testStudent._id.toString(),
      role: 'STUDENT',
      name: testStudent.name,
    });
    const decoded = verifyToken(validToken);
    assert(decoded.userId === testStudent._id.toString(), 'Valid JWT token decoded correctly');

    let tamperedBlocked = false;
    try {
      const tamperedToken = validToken.slice(0, -5) + 'AAAAA';
      verifyToken(tamperedToken);
    } catch (e) {
      tamperedBlocked = true;
      assert(true, 'Tampered / forged JWT token signature rejected');
    }
    if (!tamperedBlocked) {
      assert(false, 'Tampered JWT was accepted!');
    }

    // Clean up test records
    await Order.deleteMany({ _id: { $in: [createdOrder._id, order2._id] } });
    await Payment.deleteMany({ orderId: { $in: [createdOrder._id, order2._id] } });
    await User.deleteMany({ _id: { $in: [testStudent._id, student2._id, masiStaff._id] } });
    await MenuItem.deleteOne({ _id: item._id });

    console.log('\n====================================================');
    console.log(`🏁 TEST SUITE COMPLETED: ${passed} PASSED, ${failed} FAILED`);
    console.log('====================================================\n');
  } catch (err: any) {
    console.error('💥 Test suite runtime error:', err);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

runSecurityAndPaymentTests();
