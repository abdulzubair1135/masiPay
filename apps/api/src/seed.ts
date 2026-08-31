import mongoose from 'mongoose';
import { connectDB } from './config/db.js';
import { User } from './models/User.js';
import { Table } from './models/Table.js';
import { MenuCategory } from './models/MenuCategory.js';
import { MenuItem } from './models/MenuItem.js';
import { CanteenSettings } from './models/CanteenSettings.js';
import { Counter } from './models/Order.js';
import { hashPassword } from './utils/password.js';
import { generateQRCodeDataURL } from './utils/qr.js';
import { ENV } from './config/env.js';
import { randomUUID } from 'crypto';

async function seed() {
  console.log('[Seed] Starting database seed...');
  await connectDB();

  // Clear existing demo data
  await Promise.all([
    User.deleteMany({}),
    Table.deleteMany({}),
    MenuCategory.deleteMany({}),
    MenuItem.deleteMany({}),
    CanteenSettings.deleteMany({}),
    Counter.deleteMany({}),
  ]);

  // 1. Seed Canteen Settings
  await CanteenSettings.create({
    canteenName: 'MasiCanteen',
    tagline: 'Order karo, Masi tak turant pahunchao.',
    upiId: 'canteen@upi',
    upiPayeeName: 'Masi Canteen Services',
    currencySymbol: '₹',
    defaultLanguage: 'en',
    estimatedPrepTimeMin: 10,
    warningTimeThresholdMin: 10,
    lateTimeThresholdMin: 20,
    allowStudentCancel: true,
  });
  console.log('✅ Seeded Canteen Settings');

  // 2. Initialize Order Counter
  await Counter.create({ _id: 'orderNumber', seq: 100 });

  // 3. Seed Users
  const adminPassword = await hashPassword('Admin@12345');
  const staffPassword = await hashPassword('Masi@12345');

  const admin = await User.create({
    name: 'College Admin',
    email: 'admin@masicanteen.com',
    phone: '9998887770',
    passwordHash: adminPassword,
    role: 'SUPER_ADMIN',
    status: 'ACTIVE',
    language: 'en',
    profileImage: 'https://api.dicebear.com/7.x/bottts/svg?seed=Admin',
  });

  const staff = await User.create({
    name: 'Masi (Kitchen Lead)',
    email: 'masi@masicanteen.com',
    phone: '9876543210',
    passwordHash: staffPassword,
    role: 'STAFF',
    status: 'ACTIVE',
    language: 'hi',
    profileImage: 'https://api.dicebear.com/7.x/bottts/svg?seed=Masi',
  });

  const student = await User.create({
    name: 'Abdul Zubair',
    rollNumber: '23CS101',
    email: 'abdul@college.edu',
    phone: '9123456780',
    role: 'STUDENT',
    status: 'ACTIVE',
    language: 'en',
    profileImage: 'https://api.dicebear.com/7.x/bottts/svg?seed=Abdul',
  });

  console.log('✅ Seeded Users:');
  console.log('   - Super Admin : admin@masicanteen.com / Admin@12345');
  console.log('   - Staff (Masi): masi@masicanteen.com / Masi@12345 (Phone: 9876543210)');
  console.log('   - Student     : Roll: 23CS101 / abdul@college.edu');

  // 4. Seed Tables (Table 01 to Table 10)
  const tablesData = [
    { tableNumber: '01', capacity: 2 },
    { tableNumber: '02', capacity: 4 },
    { tableNumber: '03', capacity: 4 },
    { tableNumber: '04', capacity: 6 },
    { tableNumber: '05', capacity: 4 },
    { tableNumber: '06', capacity: 2 },
    { tableNumber: '07', capacity: 4 },
    { tableNumber: '08', capacity: 6 },
    { tableNumber: '09', capacity: 4 },
    { tableNumber: '10', capacity: 8 },
  ];

  for (const t of tablesData) {
    const secureToken = randomUUID();
    const qrTargetUrl = `${ENV.CLIENT_URL}/table/${secureToken}`;
    const qrCodeUrl = await generateQRCodeDataURL(qrTargetUrl);

    await Table.create({
      tableNumber: t.tableNumber,
      capacity: t.capacity,
      status: 'ACTIVE',
      secureToken,
      qrCodeUrl,
    });
  }
  console.log('✅ Seeded 10 Tables with Secure Tokens & QR Codes');

  // 5. Seed Menu Categories
  const catSnacks = await MenuCategory.create({
    name: 'Snacks & Quick Bites',
    nameHi: 'नाश्ता और स्नैक्स',
    nameGu: 'નાસ્તો અને સ્નેક્સ',
    sortOrder: 1,
  });

  const catMeals = await MenuCategory.create({
    name: 'Meals & Thali',
    nameHi: 'भोजन और थाली',
    nameGu: 'ભોજન અને થાળી',
    sortOrder: 2,
  });

  const catBeverages = await MenuCategory.create({
    name: 'Chai & Beverages',
    nameHi: 'चाय और पेय',
    nameGu: 'ચા અને પીણાં',
    sortOrder: 3,
  });

  const catFastFood = await MenuCategory.create({
    name: 'Burgers & Sandwiches',
    nameHi: 'बर्गर और सैंडविच',
    nameGu: 'બર્ગર અને સેન્ડવિચ',
    sortOrder: 4,
  });

  const catSpecials = await MenuCategory.create({
    name: 'Masi Special',
    nameHi: 'मासी स्पेशल',
    nameGu: 'માસી સ્પેશિયલ',
    sortOrder: 5,
  });

  // 6. Seed Menu Items
  const items = [
    {
      categoryId: catFastFood._id,
      name: 'Crispy Veg Burger',
      nameHi: 'क्रिस्पी वेज बर्गर',
      nameGu: 'ક્રિસ્પી વેજ બર્ગર',
      description: 'Golden fried vegetable patty with cheese, fresh lettuce, and house mayo.',
      descriptionHi: 'पनीर और ताजी सब्जियों से बना स्वादिष्ट क्रिस्पी बर्गर।',
      descriptionGu: 'ચીઝ અને તાજા શાકભાજી સાથે ક્રિસ્પી બર્ગર.',
      price: 50,
      isVeg: true,
      stock: 30,
      image: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=500&auto=format&fit=crop&q=60',
      sortOrder: 1,
    },
    {
      categoryId: catFastFood._id,
      name: 'Grilled Cheese Sandwich',
      nameHi: 'ग्रिल्ड चीज़ सैंडविच',
      nameGu: 'ગ્રીલ્ડ ચીઝ સેન્ડવિચ',
      description: 'Loaded with melted cheddar, mozzarella, onions, and capsicum with mint chutney.',
      descriptionHi: 'चीज़ और पुदीना चटनी के साथ टोस्टेड सैंडविच।',
      descriptionGu: 'ચીઝ અને પુદીના ચટણી સાથે શેકેલી સેન્ડવિચ.',
      price: 40,
      isVeg: true,
      stock: 25,
      image: 'https://images.unsplash.com/photo-1528735602780-2552fd46c7af?w=500&auto=format&fit=crop&q=60',
      sortOrder: 2,
    },
    {
      categoryId: catBeverages._id,
      name: 'Masala Cutting Chai',
      nameHi: 'मसाला कटिंग चाय',
      nameGu: 'મસાલા કટિંગ ચા',
      description: 'Freshly brewed aromatic tea infused with ginger, cardamom, and spices.',
      descriptionHi: 'अदरक और इलायची से बनी गरमा-गरम चाय।',
      descriptionGu: 'આદુ અને ઈલાયચી સાથે તાજી ગરમ ચા.',
      price: 15,
      isVeg: true,
      stock: null, // infinite
      image: 'https://images.unsplash.com/photo-1576092768241-dec231879fc3?w=500&auto=format&fit=crop&q=60',
      sortOrder: 1,
    },
    {
      categoryId: catBeverages._id,
      name: 'Cold Coffee with Ice Cream',
      nameHi: 'कोल्ड कॉफी आइसक्रीम के साथ',
      nameGu: 'કોલ્ડ કોફી આઈસ્ક્રીમ સાથે',
      description: 'Rich blended creamy coffee topped with a scoop of vanilla ice cream.',
      descriptionHi: 'ठंडी मलाईदार कॉफी वैनिला आइसक्रीम के साथ।',
      descriptionGu: 'ઠંડી ક્રીમી કોફી વેનીલા આઈસ્ક્રીમ સાથે.',
      price: 45,
      isVeg: true,
      stock: 20,
      image: 'https://images.unsplash.com/photo-1517256064527-09c73fc73e38?w=500&auto=format&fit=crop&q=60',
      sortOrder: 2,
    },
    {
      categoryId: catSnacks._id,
      name: 'Hot Samosa (2 pcs)',
      nameHi: 'गरमा-गरम समोसा (2 पीस)',
      nameGu: 'ગરમાગરમ સમોસા (2 નંગ)',
      description: 'Crispy pastry filled with spiced potato and peas, served with sweet & spicy chutneys.',
      descriptionHi: 'स्वादिष्ट आलू मसाले से भरा कुरकुरा समोसा।',
      descriptionGu: 'મસાલેદાર બટાકાથી ભરેલા ક્રિસ્પી સમોસા.',
      price: 30,
      isVeg: true,
      stock: 40,
      image: 'https://images.unsplash.com/photo-1601050690597-df0568f70950?w=500&auto=format&fit=crop&q=60',
      sortOrder: 1,
    },
    {
      categoryId: catSnacks._id,
      name: 'Mumbai Pav Bhaji',
      nameHi: 'मुंबई पाव भाजी',
      nameGu: 'મુંબઈ પાવ ભાજી',
      description: 'Buttery mashed mixed vegetable curry served with toasted butter pav and onions.',
      descriptionHi: 'मक्खन से भरपूर पाव भाजी नीम्बू और प्याज के साथ।',
      descriptionGu: 'માખણવાળી સ્વાદિષ્ટ પાવ ભાજી.',
      price: 70,
      isVeg: true,
      stock: 20,
      image: 'https://images.unsplash.com/photo-1606491956689-2ea866880c84?w=500&auto=format&fit=crop&q=60',
      sortOrder: 2,
    },
    {
      categoryId: catMeals._id,
      name: 'Executive Student Thali',
      nameHi: 'एग्जीक्यूटिव स्टूडेंट थाली',
      nameGu: 'એક્ઝિક્યુટિવ સ્ટુડન્ટ થાળી',
      description: 'Paneer sabji, dal fry, jeera rice, 3 butter rotis, salad, and sweet gulab jamun.',
      descriptionHi: 'पनीर सब्जी, दाल, चावल, 3 रोटी, सलाद और गुलाब जामुन।',
      descriptionGu: 'પનીર સબ્જી, દાળ, ભાત, 3 રોટલી, સલાડ અને ગુલાબ જાંબુ.',
      price: 90,
      isVeg: true,
      stock: 35,
      image: 'https://images.unsplash.com/photo-1610057099443-fde8c4d50f91?w=500&auto=format&fit=crop&q=60',
      sortOrder: 1,
    },
    {
      categoryId: catSpecials._id,
      name: 'Masi Special Maggi Double Cheese',
      nameHi: 'मासी स्पेशल मैगी डबल चीज़',
      nameGu: 'માસી સ્પેશિયલ મેગી ડબલ ચીઝ',
      description: 'Classic canteen Maggi cooked with butter, vegetables, and loaded double cheese.',
      descriptionHi: 'मक्खन, सब्जियों और ढेर सारे चीज़ वाली स्पेशल मैगी।',
      descriptionGu: 'ચીઝ અને શાકભાજીથી ભરપૂર સ્પેશિયલ મેગી.',
      price: 45,
      isVeg: true,
      stock: null,
      image: 'https://images.unsplash.com/photo-1612927601601-6638404737ce?w=500&auto=format&fit=crop&q=60',
      sortOrder: 1,
    },
  ];

  await MenuItem.insertMany(items);
  console.log(`✅ Seeded 5 Categories and ${items.length} Menu Items`);

  console.log('[Seed] Database seeding completed successfully!');
  await mongoose.disconnect();
  process.exit(0);
}

seed().catch((err) => {
  console.error('[Seed Error]:', err);
  process.exit(1);
});
