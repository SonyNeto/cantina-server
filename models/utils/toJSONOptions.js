function toJSONOptions() {
  return {
    virtuals: true,
    versionKey: false,
    transform: (_doc, ret) => {
      ret.id = ret._id.toString();
      delete ret._id;
      return ret;
    },
  };
}

module.exports = toJSONOptions;
