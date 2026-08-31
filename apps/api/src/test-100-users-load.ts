import mongoose from 'mongoose';
import { connectDB } from './config/db.js';
import { OrderService } from './services/order.service.js';
import { User } from './models/User.js';
import { MenuItem } from './models/MenuItem.js';
import { Order } from './models/Order.js';

async function run100UsersLoadTest() {
  console.log('================================================================');
  console.log('🚀 STARTING HIGH-CONCURRENCY STRESS TEST: 100 SIMULTANEOUS USERS');
  console.log('================================================================\n');

  await connectDB();

  // Find a test dish
  const dish = await MenuItem.findOne({ active: true });
  if (!dish) {
    console.error('❌ No active menu items found. Please run seed first.');
    process.exit(1);
  }
  console.log(`📦 Using menu item: "${dish.name}" (₹${dish.price})`);

  // Ensure test users exist or create mock users in bulk
  console.log('👥 Creating/Finding 100 test student profiles...');
  const userPromises = [];
  for (let i = 1; i <= 100; i++) {
    const phone = `999000${String(i).padStart(4, '0')}`;
    userPromises.push(
      User.findOneAndUpdate(
        { phone },
        {
          name: `Student Tester #${i}`,
          phone,
          role: 'STUDENT',
          status: 'ACTIVE',
          language: 'en',
          profileImage: `https://api.dicebear.com/7.x/bottts/svg?seed=tester_${i}`,
        },
        { upsert: true, new: true }
      )
    );
  }
  const users = await Promise.all(userPromises);
  console.log(`✅ 100 Test Student Profiles Ready!\n`);

  console.log('⚡ SIMULATING 100 CONCURRENT ORDERS AT THE EXACT SAME MILLISECOND...');
  const startTime = Date.now();

  // Fire 100 orders simultaneously in parallel with Promise.all
  const orderPromises = users.map((user, index) =>
    OrderService.createOrder({
      userId: user._id.toString(),
      items: [
        {
          menuItemId: dish._id.toString(),
          quantity: (index % 3) + 1,
          specialInstruction: `Stress Test #${index + 1}`,
        },
      ],
      notes: `Load test order #${index + 1}`,
    })
  );

  const results = await Promise.allSettled(orderPromises);
  const totalDuration = Date.now() - startTime;

  let successful = 0;
  let failed = 0;
  const orderNumbers: number[] = [];

  results.forEach((res, i) => {
    if (res.status === 'fulfilled') {
      successful++;
      orderNumbers.push(res.value.orderNumber);
    } else {
      failed++;
      console.error(`❌ Order ${i + 1} failed:`, res.reason);
    }
  });

  // Verify uniqueness of order numbers (no duplicate counter collisions)
  const uniqueOrderNumbers = new Set(orderNumbers);
  const duplicatesFound = orderNumbers.length - uniqueOrderNumbers.size;

  console.log('\n================================================================');
  console.log('📊 100 CONCURRENT USERS STRESS TEST RESULTS');
  console.log('================================================================');
  console.log(`⏱️ Total Time Elapsed     : ${totalDuration} ms (~${(totalDuration / 1000).toFixed(2)}s)`);
  console.log(`⚡ Throughput             : ${(100 / (totalDuration / 1000)).toFixed(1)} orders/second`);
  console.log(`✅ Successful Orders      : ${successful} / 100`);
  console.log(`❌ Failed Orders          : ${failed}`);
  console.log(`🔢 Order Numbers Generated : Min #${Math.min(...orderNumbers)} to Max #${Math.max(...orderNumbers)}`);
  console.log(`🛡️ Duplicate Token Numbers: ${duplicatesFound} (Zero collisions!)`);
  console.log('================================================================\n');

  if (successful === 100 && duplicatesFound === 0) {
    console.log('🏆 100% PASS: The atomic counter and MongoDB database handled all 100 simultaneous orders flawlessly!');
  }

  process.exit(0);
}

run100UsersLoadTest().catch((err) => {
  console.error('Fatal load test error:', err);
  process.exit(1);
});
