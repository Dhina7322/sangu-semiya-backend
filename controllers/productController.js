const { supabase, uploadToSupabase } = require('../utils/supabase');
const { Parser } = require('json2csv');
const csv = require('csv-parser');
const fs = require('fs');

const mapFromDb = (data) => {
  if (!data) return data;
  const mapped = { ...data };
  if (mapped.pack_size !== undefined) { mapped.packSize = mapped.pack_size; delete mapped.pack_size; }
  if (mapped.amazon_link !== undefined) { mapped.amazonLink = mapped.amazon_link; delete mapped.amazon_link; }
  if (mapped.created_at !== undefined) { mapped.createdAt = mapped.created_at; }
  return mapped;
};

const mapToDb = (data) => {
  if (!data) return data;
  const mapped = { ...data };
  if (mapped.packSize !== undefined) { mapped.pack_size = mapped.packSize; delete mapped.packSize; }
  if (mapped.amazonLink !== undefined) { mapped.amazon_link = mapped.amazonLink; delete mapped.amazonLink; }
  return mapped;
};

exports.getProducts = async (req, res) => {
  try {
    const { data: products, error } = await supabase
      .from('products')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error("Supabase Error in getProducts:", error.message);
      // Graceful degradation when Supabase project is missing/deleted
      return res.json([]);
    }
    const mappedProducts = (products || []).map(mapFromDb);
    res.json(mappedProducts);

  } catch (error) {
    console.error("Catch Error in getProducts:", error.message);
    res.json([]);
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
    res.json(mapFromDb(product));
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.createProduct = async (req, res) => {
  try {
    const productData = mapToDb({ ...req.body });
    
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
      if (error.message && (error.message.includes('Could not find the table') || error.message.includes('Project removed') || error.message.includes('fetch failed'))) {
        return res.status(503).json({ message: 'Database setup required: Please update your .env with valid Supabase credentials and create the products table.' });
      }
      throw error;
    }
    res.status(201).json(mapFromDb(createdProduct));
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

    if (getError) {
      if (getError.message && (getError.message.includes('Project removed') || getError.message.includes('fetch failed'))) {
        return res.status(503).json({ message: 'Database setup required: Please update your .env with valid Supabase credentials.' });
      }
    }
    if (getError || !product) return res.status(404).json({ message: 'Product not found' });

    const updateData = mapToDb({ ...req.body });

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
    res.json(mapFromDb(updatedProduct));
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

    const mappedProducts = products.map(mapFromDb);

    const fields = ['sku', 'name', 'category', 'packSize', 'amazonLink', 'variants', 'status', 'description', 'images', 'featured'];
    const json2csvParser = new Parser({ fields });
    const csvData = json2csvParser.parse(mappedProducts);
    
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
    .on('data', (data) => results.push(mapToDb(data)))
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
