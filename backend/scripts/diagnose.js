require('dotenv').config();
const mongoose = require('mongoose');

async function diagnose() {
  await mongoose.connect(process.env.MONGO_URI);
  const col = mongoose.connection.collection('orders');

  const orders = await col.find({ paymentStatus: 'PAID' }).limit(3).toArray();
  console.log(`\nFound ${orders.length} PAID orders\n`);

  for (const order of orders) {
    console.log('=== ORDER:', order._id);
    for (const item of order.items) {
      console.log({
        name: item.name,
        product: item.product,
        productType: typeof item.product,
        productConstructor: item.product?.constructor?.name,
        category: item.category,
        itemTotal: item.itemTotal,
      });
    }
    console.log('');
  }

  await mongoose.disconnect();
}

diagnose().catch(console.error);
