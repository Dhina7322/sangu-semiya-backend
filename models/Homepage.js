const mongoose = require('mongoose');

const homepageSchema = new mongoose.Schema({
  heroBanner: {
    message: { type: String, default: 'Sangu Brand Semiya' },
    subMessage: { type: String, default: 'Healthy, Delicious & Quick to Cook' },
    backgroundImage: { type: String, default: '' }
  },
  whyChooseUs: [{
    title: { type: String },
    description: { type: String },
    icon: { type: String }
  }],
  productionSteps: [{
    stepNumber: { type: Number },
    title: { type: String },
    description: { type: String },
    image: { type: String }
  }],
  aboutText: { type: String, default: '' },
  contactDetails: {
    phone: { type: String, default: '' },
    email: { type: String, default: '' },
    address: { type: String, default: '' },
    whatsapp: { type: String, default: '' }
  }
}, { timestamps: true });

module.exports = mongoose.model('Homepage', homepageSchema);
