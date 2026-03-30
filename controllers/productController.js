const { supabase, uploadToSupabase } = require('../utils/supabase');
const { Parser } = require('json2csv');
const csv = require('csv-parser');
const fs = require('fs');

exports.getProducts = async (req, res) => {
  try {
    const { data: products, error } = await supabase
      .from('products')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) {
      if (error.message && error.message.includes('Could not find the table')) return res.json([]);
      throw error;
    }
    res.json(products);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getProductById = async (req, res) => {
  try {
    const { data: product, error } = await supabase
      .from('products')
      .select('*')
      .eq('id', req.params.id)
      .single();

    if (error || !product) return res.status(404).json({ message: 'Product not found' });
    res.json(product);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.createProduct = async (req, res) => {
  try {
    const productData = { ...req.body };
    
    if (req.files && req.files.length > 0) {
      const uploadPromises = req.files.map(file => uploadToSupabase(file));
      const fileUrls = await Promise.all(uploadPromises);
      productData.images = fileUrls;
    }

    const { data: createdProduct, error } = await supabase
      .from('products')
      .insert([productData])
      .select()
      .single();

    if (error) {
      if (error.message && error.message.includes('Could not find the table')) {
        return res.status(503).json({ message: 'Database setup required: Please run the SQL schema in your Supabase dashboard to create the products table.' });
      }
      throw error;
    }
    res.status(201).json(createdProduct);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.updateProduct = async (req, res) => {
  try {
    const { data: product, error: getError } = await supabase
      .from('products')
      .select('*')
      .eq('id', req.params.id)
      .single();

    if (getError || !product) return res.status(404).json({ message: 'Product not found' });

    const updateData = { ...req.body };

    if (req.files && req.files.length > 0) {
      const uploadPromises = req.files.map(file => uploadToSupabase(file));
      const fileUrls = await Promise.all(uploadPromises);
      updateData.images = fileUrls;
    }

    const { data: updatedProduct, error: updateError } = await supabase
      .from('products')
      .update(updateData)
      .eq('id', req.params.id)
      .select()
      .single();

    if (updateError) throw updateError;
    res.json(updatedProduct);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.deleteProduct = async (req, res) => {
  try {
    const { error } = await supabase
      .from('products')
      .delete()
      .eq('id', req.params.id);

    if (error) throw error;
    res.json({ message: 'Product removed' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// CSV Export
exports.exportProducts = async (req, res) => {
  try {
    const { data: products, error } = await supabase.from('products').select('*');
    if (error) throw error;

    const fields = ['sku', 'name', 'category', 'packSize', 'amazonLink', 'variants', 'status', 'description', 'images', 'featured'];
    const json2csvParser = new Parser({ fields });
    const csvData = json2csvParser.parse(products);
    
    res.header('Content-Type', 'text/csv');
    res.attachment('products_export.csv');
    return res.send(csvData);
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
        for (const item of results) {
          await supabase
            .from('products')
            .upsert(item, { onConflict: 'sku' });
        }
        fs.unlinkSync(req.file.path);
        res.json({ message: `Successfully processed ${results.length} products.` });
      } catch (err) {
        res.status(500).json({ message: 'Error processing bulk data: ' + err.message });
      }
    });
};
