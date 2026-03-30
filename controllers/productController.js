const Product = require('../models/Product');
const { Parser } = require('json2csv');
const csv = require('csv-parser');
const fs = require('fs');

exports.getProducts = async (req, res) => {
  try {
    const products = await Product.find({}).sort({ createdAt: -1 });
    res.json(products);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getProductById = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (product) {
      res.json(product);
    } else {
      res.status(404).json({ message: 'Product not found' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.createProduct = async (req, res) => {
  try {
    const productData = { ...req.body };
    
    // If files uploaded, add paths to image array
    if (req.files && req.files.length > 0) {
      const fileUrls = req.files.map(file => `http://localhost:5001/uploads/${file.filename}`);
      productData.images = fileUrls;
    }

    const product = new Product(productData);
    const createdProduct = await product.save();
    res.status(201).json(createdProduct);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.updateProduct = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ message: 'Product not found' });

    const updateData = { ...req.body };

    // If new files uploaded, handle them
    if (req.files && req.files.length > 0) {
      const fileUrls = req.files.map(file => `http://localhost:5001/uploads/${file.filename}`);
      // Join or replace based on logic
      updateData.images = fileUrls;
    }

    Object.assign(product, updateData);
    const updatedProduct = await product.save();
    res.json(updatedProduct);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.deleteProduct = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (product) {
      await Product.findByIdAndDelete(req.params.id);
      res.json({ message: 'Product removed' });
    } else {
      res.status(404).json({ message: 'Product not found' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// CSV Export
exports.exportProducts = async (req, res) => {
  try {
    const products = await Product.find({});
    const fields = ['sku', 'name', 'category', 'packSize', 'amazonLink', 'variants', 'status', 'description'];
    const json2csvParser = new Parser({ fields });
    const csv = json2csvParser.parse(products);
    
    res.header('Content-Type', 'text/csv');
    res.attachment('products_export.csv');
    return res.send(csv);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// CSV Import
exports.importProducts = async (req, res) => {
  if (!req.file) return res.status(400).json({ message: 'No CSV file uploaded' });

  const results = [];
  fs.createReadStream(req.file.path)
    .pipe(csv())
    .on('data', (data) => results.push(data))
    .on('end', async () => {
      try {
        // Bulk upsert by SKU if exists, otherwise create
        for (const item of results) {
          await Product.findOneAndUpdate(
            { sku: item.sku },
            { $set: item },
            { upsert: true, new: true }
          );
        }
        fs.unlinkSync(req.file.path); // Clean up temp file
        res.json({ message: `Successfully processed ${results.length} products.` });
      } catch (err) {
        res.status(500).json({ message: 'Error processing bulk data: ' + err.message });
      }
    });
};
