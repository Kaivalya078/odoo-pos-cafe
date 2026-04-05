require('dotenv').config();
const mongoose = require('mongoose');

async function run() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('✅ Connected\n');

  const col     = mongoose.connection.collection('orders');
  const prodCol = mongoose.connection.collection('products');

  // Build name (lowercase) → category map from actual current products
  const products = await prodCol.find({}, { projection: { name: 1, category: 1 } }).toArray();
  const nameMap  = {};
  for (const p of products) nameMap[p.name.toLowerCase()] = p.category;
  console.log(`Loaded ${products.length} products\n`);

  // Fetch all orders
  const orders = await col.find({}).toArray();
  console.log(`Processing ${orders.length} orders...\n`);

  let totalDocs = 0;

  for (const order of orders) {
    const updates = {};
    order.items.forEach((item, idx) => {
      const cat = nameMap[item.name?.toLowerCase()];
      if (cat && item.category !== cat) {
        updates[`items.${idx}.category`] = cat;
      }
    });

    if (Object.keys(updates).length > 0) {
      await col.updateOne({ _id: order._id }, { $set: updates });
      console.log(`  Updated order ${order._id} →`, updates);
      totalDocs++;
    }
  }

  console.log(`\n✅ Done! ${totalDocs} orders updated.`);
  await mongoose.disconnect();
}

run().catch(e => { console.error(e); process.exit(1); });
