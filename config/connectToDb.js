const mongoose = require('mongoose');

async function connectToDb() {
  try {
    await mongoose.connect(process.env.DB_URL, {
      autoIndex: process.env.NODE_ENV !== 'production',
    });
    console.log('Connected to database');
  } catch (err) {
    console.log(err);
  }
}

module.exports = connectToDb;
