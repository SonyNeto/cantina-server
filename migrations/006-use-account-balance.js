if (process.env.NODE_ENV !== 'production') {
  require('dotenv').config({ path: '.env.prod' });
}

const mongoose = require('mongoose');
const Register = require('../models/register');
const Responsible = require('../models/responsible');
const Student = require('../models/student');

async function migrateAccountBalances() {
  const [orphanRegistersSummary] = await Register.collection
    .aggregate([
      {
        $lookup: {
          from: Student.collection.collectionName,
          localField: 'studentId',
          foreignField: '_id',
          as: 'student',
        },
      },
      { $match: { student: { $size: 0 } } },
      { $count: 'value' },
    ])
    .toArray();
  const orphanRegisters = orphanRegistersSummary?.value ?? 0;

  if (orphanRegisters > 0) {
    throw new Error(
      `Existem ${orphanRegisters} registros sem aluno; não foi possível calcular os saldos`,
    );
  }

  const consumptions = await Register.collection
    .aggregate([
      {
        $lookup: {
          from: Student.collection.collectionName,
          localField: 'studentId',
          foreignField: '_id',
          as: 'student',
        },
      },
      { $unwind: '$student' },
      {
        $group: {
          _id: '$student.responsibleId',
          value: { $sum: '$product.price' },
        },
      },
    ])
    .toArray();

  const consumptionByResponsible = new Map(
    consumptions.map(({ _id, value }) => [_id.toString(), value]),
  );
  const responsibles = await Responsible.collection
    .find({
      accountBalance: { $exists: false },
      balance: { $exists: true },
    })
    .toArray();

  if (responsibles.length > 0) {
    await Responsible.collection.bulkWrite(
      responsibles.map((responsible) => ({
        updateOne: {
          filter: {
            _id: responsible._id,
            accountBalance: { $exists: false },
            balance: { $exists: true },
          },
          update: {
            $set: {
              accountBalance:
                responsible.balance -
                (consumptionByResponsible.get(responsible._id.toString()) ?? 0),
            },
            $unset: { balance: '' },
          },
        },
      })),
    );
  }
}

async function run() {
  await mongoose.connect(process.env.DB_URL);

  await migrateAccountBalances();

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
