if (process.env.NODE_ENV !== 'production') {
  require('dotenv').config({ path: '.env.prod' });
}

const mongoose = require('mongoose');
const Student = require('../models/student');

async function run() {
  await mongoose.connect(process.env.DB_URL);

  await Student.collection.updateMany(
    { classId: { $exists: true } },
    { $rename: { classId: 'schoolClassId' } },
  );

  await mongoose.disconnect();
  console.log('Migration concluída');
}

run().catch(async (error) => {
  console.error(error);
  await mongoose.disconnect();
  process.exit(1);
});
