if (process.env.NODE_ENV !== 'production') {
  require('dotenv').config({ path: '.env.prod' });
}

const mongoose = require('mongoose');
const Responsible = require('../models/responsible');

async function run() {
  await mongoose.connect(process.env.DB_URL);

  await Responsible.collection.updateMany(
    {
      accountBalance: { $exists: false },
      balance: { $exists: true },
    },
    {
      $rename: {
        balance: 'accountBalance',
      },
    },
  );

  await Responsible.collection.updateMany(
    { accountBalance: { $exists: false } },
    { $set: { accountBalance: 0 } },
  );

  await Responsible.collection.updateMany(
    { balance: { $exists: true } },
    { $unset: { balance: '' } },
  );

  await mongoose.connection
    .collection('payments')
    .updateMany({ type: 'balance' }, { $set: { type: 'manual' } });

  await mongoose.disconnect();
  console.log('Migration concluída');
}

run().catch(async (error) => {
  console.error(error);
  await mongoose.disconnect();
  process.exit(1);
});
