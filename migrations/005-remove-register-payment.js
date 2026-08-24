if (process.env.NODE_ENV !== 'production') {
  require('dotenv').config({ path: '.env.prod' });
}

const mongoose = require('mongoose');
const Order = require('../models/order');
const Payment = require('../models/payment');
const Register = require('../models/register');

async function run() {
  await mongoose.connect(process.env.DB_URL);

  await Promise.all([
    Register.collection.updateMany({ payment: { $exists: true } }, { $unset: { payment: '' } }),
    Payment.collection.updateMany({ type: { $exists: false } }, { $set: { type: 'balance' } }),
    Order.collection.updateMany(
      { paymentApplied: { $exists: false } },
      { $set: { paymentApplied: 0 } },
    ),
    Order.collection.updateMany(
      { hasRegisteredItems: { $exists: false } },
      { $set: { hasRegisteredItems: false } },
    ),
  ]);

  await Promise.all([
    Payment.collection.createIndex({ workspaceId: 1 }),
    Payment.collection.createIndex({ created_at: 1 }),
    Payment.collection.createIndex(
      { workspaceId: 1, sourceOrderId: 1 },
      {
        unique: true,
        partialFilterExpression: {
          sourceOrderId: { $type: 'objectId' },
        },
      },
    ),
  ]);

  await mongoose.disconnect();
  console.log('Migration concluída');
}

run().catch(async (error) => {
  console.error(error);
  await mongoose.disconnect();
  process.exit(1);
});
