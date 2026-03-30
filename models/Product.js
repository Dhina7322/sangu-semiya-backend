const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  name: { type: String, required: true },
  sku: { type: String, unique: true },
  description: { type: String, required: true },
  images: [{ type: String }], // Will store local paths or URLs
  packSize: { type: String, required: true },
  amazonLink: { type: String },
  category: { type: String, default: 'General' },
  variants: { type: String }, // Store as string for now to match screenshot metadata
  status: { type: String, default: 'Active' },
  featured: { type: Boolean, default: false }
}, { timestamps: true });

module.exports = mongoose.model('Product', productSchema);
