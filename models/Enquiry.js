const mongoose = require('mongoose');

const enquirySchema = new mongoose.Schema({
  name: { type: String, required: true },
  phone: { type: String, required: true },
  email: { type: String },
  product: { type: String, required: true },
  quantity: { type: String, required: true },
  message: { type: String },
  status: { type: String, enum: ['Pending', 'In-Progress', 'Resolved'], default: 'Pending' }
}, { timestamps: true });

module.exports = mongoose.model('Enquiry', enquirySchema);
