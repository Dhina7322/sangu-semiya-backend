const { supabase, uploadToSupabase } = require('../utils/supabase');

exports.getHomepageData = async (req, res) => {
  try {
    let { data: homepage, error } = await supabase
      .from('homepage')
      .select('*')
      .single();
    
    if (!homepage || error) {
      if (error && error.message && (error.message.includes('Could not find the table') || error.message.includes('Project removed') || error.message.includes('fetch failed'))) {
        return res.json({
          heroBanner: { message: 'Sangu Brand Semiya', subMessage: 'Healthy, Delicious & Quick to Cook', backgroundImage: '' },
          whyChooseUs: [],
          productionSteps: [],
          aboutText: '',
          contactDetails: { phone: '', email: '', address: '', whatsapp: '' },
          recipes: []
        });
      }

      // Create default if not exists
      const { data: newHomepage, error: createError } = await supabase
        .from('homepage')
        .insert([{}])
        .select()
        .single();
      
      if (createError) throw createError;
      homepage = newHomepage;
    }

    // Map snake_case from database to camelCase for frontend
    const result = {
      heroBanner: homepage.hero_banner,
      whyChooseUs: homepage.why_choose_us,
      productionSteps: homepage.production_steps,
      aboutText: homepage.about_text,
      contactDetails: homepage.contact_details,
      recipes: homepage.recipes || []
    };

    res.json(result);
  } catch (error) {
    console.error('Internal Server Error (Get Homepage):', error);
    res.status(500).json({ message: error.message });
  }
};

exports.updateHomepageData = async (req, res) => {
  try {
    const { data: homepage } = await supabase.from('homepage').select('*').single();
    
    // Map camelCase from frontend to snake_case for database
    const updateData = {};
    if (req.body.heroBanner) updateData.hero_banner = req.body.heroBanner;
    if (req.body.whyChooseUs) updateData.why_choose_us = req.body.whyChooseUs;
    if (req.body.productionSteps) updateData.production_steps = req.body.productionSteps;
    if (req.body.aboutText) updateData.about_text = req.body.aboutText;
    if (req.body.contactDetails) updateData.contact_details = req.body.contactDetails;
    if (req.body.recipes) updateData.recipes = req.body.recipes;

    if (req.file) {
      const publicUrl = await uploadToSupabase(req.file);
      if (!updateData.hero_banner) updateData.hero_banner = {};
      updateData.hero_banner.backgroundImage = publicUrl;
    }

    if (homepage) {
      const { data: updated, error } = await supabase
        .from('homepage')
        .update(updateData)
        .eq('id', homepage.id)
        .select()
        .single();
      if (error) {
        console.error('Supabase Update Error:', error);
        throw error;
      }
      res.json(updated);
    } else {
      const { data: created, error } = await supabase
        .from('homepage')
        .insert([updateData])
        .select()
        .single();
      if (error) {
        console.error('Supabase Insert Error:', error);
        if (error.message && (error.message.includes('Project removed') || error.message.includes('fetch failed'))) {
          return res.status(503).json({ message: 'Supabase setup required to save data.' });
        }
        throw error;
      }
      res.status(201).json(created);
    }
  } catch (error) {
    console.error('Internal Server Error (Homepage Update):', error);
    res.status(500).json({ message: error.message });
  }
};

exports.uploadHomepageMedia = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'No file uploaded' });
    const publicUrl = await uploadToSupabase(req.file);
    res.json({ url: publicUrl });
  } catch (error) {
    console.error('Error uploading homepage media:', error);
    res.status(500).json({ message: error.message });
  }
};
