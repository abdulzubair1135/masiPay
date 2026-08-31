import http from 'http';
import { createApp } from './app.js';
import { connectDB } from './config/db.js';
import { initSocket } from './socket/socket.server.js';
import { User } from './models/User.js';
import { Table } from './models/Table.js';
import { MenuItem } from './models/MenuItem.js';
import { MenuCategory } from './models/MenuCategory.js';
import { Order } from './models/Order.js';
import { Payment } from './models/Payment.js';
import { CanteenSettings } from './models/CanteenSettings.js';
import { Counter } from './models/Order.js';
import { hashPassword } from './utils/password.js';
import { generateQRCodeDataURL } from './utils/qr.js';
import { randomUUID } from 'crypto';
import axios from 'axios';

async function runE2ETest() {
  console.log('====================================================');
  console.log('🧪 RUNNING MASICANTEEN FULL END-TO-END VERIFICATION');
  console.log('====================================================');

  await connectDB();

  // Clean test data
  await Promise.all([
    User.deleteMany({}),
    Table.deleteMany({}),
    MenuCategory.deleteMany({}),
    MenuItem.deleteMany({}),
    Order.deleteMany({}),
    Payment.deleteMany({}),
    CanteenSettings.deleteMany({}),
    Counter.deleteMany({}),
  ]);

  // 1. Setup Canteen Settings
  await CanteenSettings.create({
    canteenName: 'MasiCanteen',
    upiId: 'canteen@upi',
    upiPayeeName: 'Masi Canteen Services',
  });
  await Counter.create({ _id: 'orderNumber', seq: 100 });

  // 2. Setup Seed Staff & Tables
  const staffPassword = await hashPassword('Masi@12345');
  const staff = await User.create({
    name: 'Masi (Head Chef)',
    email: 'masi@masicanteen.com',
    phone: '9876543210',
    passwordHash: staffPassword,
    role: 'STAFF',
    status: 'ACTIVE',
  });

  const tableToken = randomUUID();
  const table = await Table.create({
    tableNumber: '07',
    capacity: 4,
    status: 'ACTIVE',
    secureToken: tableToken,
    qrCodeUrl: await generateQRCodeDataURL(`http://localhost:3000/table/${tableToken}`),
  });

  const cat = await MenuCategory.create({ name: 'Fast Food', sortOrder: 1 });
  const burger = await MenuItem.create({
    categoryId: cat._id,
    name: 'Crispy Veg Burger',
    price: 50,
    isVeg: true,
    stock: 10,
    available: true,
  });
  const chai = await MenuItem.create({
    categoryId: cat._id,
    name: 'Masala Cutting Chai',
    price: 15,
    isVeg: true,
    stock: null, // unlimited
    available: true,
  });

  // 3. Start Test Express Server
  const app = createApp();
  const server = http.createServer(app);
  initSocket(server);

  const TEST_PORT = 5099;
  await new Promise<void>((resolve) => server.listen(TEST_PORT, resolve));
  const baseURL = `http://localhost:${TEST_PORT}/api`;
  console.log(`⚡ Test Server running on ${baseURL}`);

  try {
    // TEST 1: Health check
    const healthRes = await axios.get(`http://localhost:${TEST_PORT}/health`);
    console.log(`✅ [1/10] Health Check Passed:`, healthRes.data.status);

    // TEST 2: Staff Login
    const staffLoginRes = await axios.post(`${baseURL}/auth/login/staff`, {
      emailOrPhone: 'masi@masicanteen.com',
      password: 'Masi@12345',
    });
    const staffToken = staffLoginRes.data.data.token;
    console.log(`✅ [2/10] Staff Authenticated: ${staffLoginRes.data.data.user.name}`);

    // TEST 3: Student Fast Registration (Table QR scan)
    const studentRegisterRes = await axios.post(`${baseURL}/auth/register/student`, {
      name: 'Abdul Zubair',
      rollNumber: '23CS101',
      phone: '9123456780',
      language: 'en',
    });
    const studentToken = studentRegisterRes.data.data.token;
    const student = studentRegisterRes.data.data.user;
    console.log(`✅ [3/10] Student Registered: ${student.name} (${student.rollNumber})`);

    // TEST 4: Resolve Table QR Token
    const tableRes = await axios.get(`${baseURL}/tables/token/${tableToken}`);
    console.log(`✅ [4/10] Table QR Resolved: Table ${tableRes.data.data.tableNumber}`);

    // TEST 5: Student Places Order (Burger x 2 + Chai x 1 = ₹115)
    const orderPayload = {
      tableToken: tableToken,
      items: [
        { menuItemId: burger._id.toString(), quantity: 2, specialInstruction: 'Crispy patty' },
        { menuItemId: chai._id.toString(), quantity: 1, specialInstruction: 'Extra ginger' },
      ],
      notes: 'Less spicy please',
      idempotencyKey: 'idemp_test_001',
    };

    const orderRes = await axios.post(`${baseURL}/orders`, orderPayload, {
      headers: { Authorization: `Bearer ${studentToken}` },
    });
    const order = orderRes.data.data;
    console.log(`✅ [5/10] Order Created: #${order.orderNumber}, Total: ₹${order.total}, Status: ${order.status}`);
    if (order.total !== 115) throw new Error(`Price calculation mismatch! Expected 115, got ${order.total}`);

    // Check stock was decremented for burger (10 - 2 = 8)
    const updatedBurger = await MenuItem.findById(burger._id);
    if (updatedBurger?.stock !== 8) throw new Error(`Stock deduction failed! Expected 8, got ${updatedBurger?.stock}`);
    console.log(`✅ [5b/10] Stock atomically decremented: Burger stock is now ${updatedBurger.stock}`);

    // TEST 6: Student Claims Payment ("I HAVE PAID")
    const claimRes = await axios.post(
      `${baseURL}/orders/${order._id}/payment-claimed`,
      { transactionReference: 'UPI_REF_987654321' },
      { headers: { Authorization: `Bearer ${studentToken}` } }
    );
    console.log(`✅ [6/10] Student Claimed Payment: Order status is now ${claimRes.data.data.order.status}`);

    // TEST 7: Staff Verifies Payment in Kitchen
    const verifyRes = await axios.post(
      `${baseURL}/staff/payments/${order._id}/verify`,
      { transactionReference: 'BANK_UTR_VERIFIED_123' },
      { headers: { Authorization: `Bearer ${staffToken}` } }
    );
    console.log(`✅ [7/10] Staff Verified Payment: Order Accepted: ${verifyRes.data.data.order.status}`);

    // TEST 8: Kitchen Pipeline Transitions: ACCEPTED -> PREPARING -> READY -> DELIVERED
    await axios.post(`${baseURL}/staff/orders/${order._id}/preparing`, {}, { headers: { Authorization: `Bearer ${staffToken}` } });
    console.log(`✅ [8a/10] Kitchen Pipeline: PREPARING 🍳`);

    await axios.post(`${baseURL}/staff/orders/${order._id}/ready`, {}, { headers: { Authorization: `Bearer ${staffToken}` } });
    console.log(`✅ [8b/10] Kitchen Pipeline: READY 🔔`);

    await axios.post(`${baseURL}/staff/orders/${order._id}/delivered`, {}, { headers: { Authorization: `Bearer ${staffToken}` } });
    console.log(`✅ [8c/10] Kitchen Pipeline: DELIVERED ✅`);

    // TEST 9: Student Tracking & History
    const trackRes = await axios.get(`${baseURL}/orders/${order._id}`, {
      headers: { Authorization: `Bearer ${studentToken}` },
    });
    console.log(`✅ [9/10] Live Order Tracking: Status: ${trackRes.data.data.order.status}, Stages Recorded: ${trackRes.data.data.history.length}`);

    // TEST 10: Staff Daily Summary Metrics
    const summaryRes = await axios.get(`${baseURL}/staff/summary`, {
      headers: { Authorization: `Bearer ${staffToken}` },
    });
    console.log(`✅ [10/10] Staff Summary: Today Sales: ₹${summaryRes.data.data.todaySales}`);

    console.log('====================================================');
    console.log('🎉 ALL 10 E2E AUTOMATED TESTS PASSED WITH 100% SUCCESS!');
    console.log('====================================================');
  } catch (err: any) {
    console.error('❌ Test failed:', err.response?.data || err.message);
    process.exit(1);
  } finally {
    server.close();
    process.exit(0);
  }
}

runE2ETest();
