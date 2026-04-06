const { supabase } = require('../utils/supabase');

exports.getCategories = async (req, res) => {
  try {
    const { data: categories, error } = await supabase
      .from('categories')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    res.json(categories || []);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.createCategory = async (req, res) => {
  try {
    const { name, description, status } = req.body;
    const { data: category, error } = await supabase
      .from('categories')
      .insert([{ name, description, status }])
      .select()
      .single();

    if (error) throw error;
    res.status(201).json(category);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.updateCategory = async (req, res) => {
  try {
    const { name, description, status } = req.body;
    const { data: category, error } = await supabase
      .from('categories')
      .update({ name, description, status })
      .eq('id', req.params.id)
      .select()
      .single();

    if (error) throw error;
    res.json(category);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.deleteCategory = async (req, res) => {
  try {
    const { error } = await supabase
      .from('categories')
      .delete()
      .eq('id', req.params.id);

    if (error) throw error;
    res.json({ message: 'Category removed' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.assignProducts = async (req, res) => {
  try {
    const { productIds } = req.body;
    const { id } = req.params;

    // Get the category name to update the string field for compatibility
    const { data: category, error: catError } = await supabase
      .from('categories')
      .select('name')
      .eq('id', id)
      .single();

    if (catError) throw catError;

    // Update all products in the list
    // This is a bulk update in Supabase
    const { error: updateError } = await supabase
      .from('products')
      .update({ category: category.name }) // Supporting both for now
      .in('id', productIds);

    if (updateError) throw updateError;

    res.json({ message: `Successfully assigned ${productIds.length} products to ${category.name}.` });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
