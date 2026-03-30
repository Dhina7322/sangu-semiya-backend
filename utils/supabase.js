const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

const uploadToSupabase = async (file, bucketName = 'product-images') => {
  try {
    const fileContent = fs.readFileSync(file.path);
    const fileName = `${Date.now()}-${file.originalname.replace(/\s/g, '-')}`;
    
    const { data, error } = await supabase.storage
      .from(bucketName)
      .upload(fileName, fileContent, {
        contentType: file.mimetype,
        upsert: false
      });

    if (error) throw error;

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from(bucketName)
      .getPublicUrl(fileName);

    // Clean up local file after upload
    fs.unlinkSync(file.path);

    return publicUrl;
  } catch (error) {
    console.error('Supabase upload error:', error);
    throw error;
  }
};

module.exports = { supabase, uploadToSupabase };
