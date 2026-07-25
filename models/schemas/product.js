const mongoose = require('mongoose');

const productSchema = new mongoose.Schema(
  {
    id: {
      type: String,
      required: true,
    },
    label: {
      type: String,
      required: true,
    },
    price: {
      type: Number,
      required: true,
      min: 0,
      validate: {
        validator: Number.isSafeInteger,
        message: 'O preco deve ser informado em centavos',
      },
    },
  },
  {
    _id: false,
    id: false,
  },
);

module.exports = productSchema;
