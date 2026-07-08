if (process.env.NODE_ENV !== 'production') {
  require('dotenv').config();
}

const mongoose = require('mongoose');
const SchoolClass = require('../models/schoolClass');

const classOrders = [
  { shiftId: 'morning', id: 'class-inf-2-morning', order: 1 },
  { shiftId: 'morning', id: 'class-inf-3-morning', order: 2 },
  { shiftId: 'morning', id: 'class-inf-4-morning', order: 3 },
  { shiftId: 'morning', id: 'class-inf-5-morning', order: 4 },
  { shiftId: 'morning', id: 'class-1-morning', order: 5 },
  { shiftId: 'morning', id: 'class-2-morning', order: 6 },
  { shiftId: 'morning', id: 'class-3-morning', order: 7 },
  { shiftId: 'morning', id: 'class-4-morning', order: 8 },
  { shiftId: 'morning', id: 'class-6-morning', order: 9 },

  { shiftId: 'afternoon', id: 'class-inf-3-afternoon', order: 1 },
  { shiftId: 'afternoon', id: 'class-inf-4-afternoon', order: 2 },
  { shiftId: 'afternoon', id: 'class-1-afternoon', order: 3 },
  { shiftId: 'afternoon', id: 'class-2-afternoon', order: 4 },
  { shiftId: 'afternoon', id: 'class-3-afternoon', order: 5 },
  { shiftId: 'afternoon', id: 'class-4-afternoon', order: 6 },
  { shiftId: 'afternoon', id: 'class-7-afternoon', order: 7 },
];

async function run() {
  await mongoose.connect(process.env.DB_URL);

  for (const schoolClass of classOrders) {
    const res = await SchoolClass.updateOne(
      {
        id: schoolClass.id,
        shiftId: schoolClass.shiftId,
      },
      {
        $set: { order: schoolClass.order },
      },
    );

    if (res.matchedCount === 0) {
      console.warn(`Turma não encontrada: ${schoolClass.shiftId}/${schoolClass.id}`);
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
