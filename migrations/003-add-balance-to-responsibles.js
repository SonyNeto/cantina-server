if (process.env.NODE_ENV !== 'production') {
  require('dotenv').config({ path: '.env.prod' });
}

const mongoose = require('mongoose');
const Responsible = require('../models/responsible');

async function run() {
  await mongoose.connect(process.env.DB_URL);

  const result = await Responsible.updateMany(
    {
      balance: { $exists: false },
    },
    {
      $set: {
        balance: 0,
      },
    },
  );

  await mongoose.disconnect();

  console.log(`Migration concluída: ${result.modifiedCount} responsáveis atualizados`);
}

run().catch(async (error) => {
  console.error(error);
  await mongoose.disconnect();
  process.exit(1);
});
