const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5001;

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use('/uploads', express.static('uploads'));

const authRoutes = require('./routes/auth');
const productRoutes = require('./routes/products');
const enquiryRoutes = require('./routes/enquiry');
const homepageRoutes = require('./routes/homepage');
const blogRoutes = require('./routes/blogs');
const categoryRoutes = require('./routes/categories');

app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/enquiry', enquiryRoutes);
app.use('/api/homepage', homepageRoutes);
app.use('/api/blogs', blogRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/users', require('./routes/userRoutes'));

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log('Using Supabase as primary database');
});
