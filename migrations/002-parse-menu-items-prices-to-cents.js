if (process.env.NODE_ENV !== 'production') {
  require('dotenv').config({ path: '.env.prod' });
}

const MenuItem = require('../models/menuItem');

const mongoose = require('mongoose');

async function run() {
  await mongoose.connect(process.env.DB_URL);

  const menuItems = await MenuItem.find();

  for (const menuItem of menuItems) {
    const res = await MenuItem.updateOne(
      {
        _id: menuItem._id,
        label: menuItem.label,
      },
      {
        $set: { price: Math.round(menuItem.price * 100) },
      },
    );

    if (res.matchedCount === 0) {
      console.warn(`Item não encontrado: ${menuItem.label}/${menuItem._id}`);
    }
  }

  await mongoose.disconnect();
  console.log('Migration concluída');
}

run().catch(async (err) => {
  console.error(err);
  await mongoose.disconnect();
  process.exit(1);
});
