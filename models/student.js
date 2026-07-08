const mongoose = require('mongoose');
const toJSONOptions = require('./utils/toJSONOptions');

const studentSchema = new mongoose.Schema(
  {
    workspaceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Workspace',
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
    },
    classId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'SchoolClass',
      required: true,
    },
    responsibleId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Responsible',
      required: true,
    },
  },
  {
    toJSON: toJSONOptions(),
  },
);

const Student = mongoose.model('Student', studentSchema);

module.exports = Student;
