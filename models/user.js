const mongoose = require('mongoose');
const toJSONOptions = require('./utils/toJSONOptions');

const userSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      index: true,
    },
    password: {
      type: String,
      required: true,
    },
    isSystemAdmin: {
      type: Boolean,
      default: false,
    },
  },
  {
    toJSON: toJSONOptions(),
  },
);

const User = mongoose.model('User', userSchema);

module.exports = User;
