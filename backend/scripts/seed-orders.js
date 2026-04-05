/**
 * seed-orders.js
 * --------------
 * Seeds 10 realistic paid orders with cross-category items.
 * Run: cd backend && node scripts/seed-orders.js
 */

require('dotenv').config();
const mongoose = require('mongoose');

async function run() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('✅ Connected\n');

  const prodCol  = mongoose.connection.collection('products');
  const tableCol = mongoose.connection.collection('tables');
  const orderCol = mongoose.connection.collection('orders');

  const products = await prodCol.find({}).toArray();
  const tables   = await tableCol.find({}).toArray();

  if (!products.length) { console.error('No products found'); process.exit(1); }
  if (!tables.length)   { console.error('No tables found');   process.exit(1); }

  const pick  = (arr) => arr[Math.floor(Math.random() * arr.length)];
  const rand  = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

  const payMethods    = ['CASH', 'UPI', 'CARD'];
  const customerNames = [
    'Aarav Shah', 'Priya Mehta', 'Rohan Desai', 'Sneha Patel', 'Karan Joshi',
    'Ananya Iyer', 'Vikram Rao',  'Pooja Sharma', 'Arjun Nair', 'Riya Gupta',
  ];

  const ordersToInsert = [];

  for (let i = 0; i < 10; i++) {
    const table = pick(tables);

    // Pick 2–5 random products from ANY category (cross-category)
    const itemCount      = rand(2, 5);
    const shuffled       = [...products].sort(() => 0.5 - Math.random());
    const chosenProducts = shuffled.slice(0, itemCount);

    let totalAmount = 0;
    const items = chosenProducts.map((p) => {
      const variant   = p.variants?.length ? pick(p.variants) : { name: 'Regular', price: 100 };
      const qty       = rand(1, 3);
      const itemTotal = parseFloat((variant.price * qty).toFixed(2));
      totalAmount    += itemTotal;
      return {
        _id:             new mongoose.Types.ObjectId(),
        product:         p._id,
        name:            p.name,
        category:        p.category,
        variant:         { name: variant.name, price: variant.price },
        addons:          [],
        quantity:        qty,
        preparedQuantity: qty,
        itemTotal,
      };
    });

    // Spread over last 14 days at varied hours
    const daysAgo   = rand(0, 14);
    const createdAt = new Date();
    createdAt.setDate(createdAt.getDate() - daysAgo);
    createdAt.setHours(rand(10, 22), rand(0, 59), 0, 0);

    const cats = [...new Set(items.map(it => it.category))].join(', ');
    console.log(`Order ${i + 1}: ${items.length} items [${cats}] — ₹${totalAmount.toFixed(2)}`);

    ordersToInsert.push({
      table:         table._id,
      session:       null,
      customerName:  customerNames[i],
      items,
      totalAmount:   parseFloat(totalAmount.toFixed(2)),
      status:        'PREPARED',
      paymentStatus: 'PAID',
      paymentMethod: pick(payMethods),
      paidAt:        createdAt,
      createdAt,
      updatedAt:     createdAt,
    });
  }

  const result = await orderCol.insertMany(ordersToInsert);
  console.log(`\n✅ Inserted ${result.insertedCount} orders. Refresh the chart!`);
  await mongoose.disconnect();
}

run().catch(e => { console.error('❌', e.message); process.exit(1); });
