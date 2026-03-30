const { supabase, uploadToSupabase } = require('../utils/supabase');

exports.getHomepageData = async (req, res) => {
  try {
    let { data: homepage, error } = await supabase
      .from('homepage')
      .select('*')
      .single();
    
    if (!homepage) {
      if (error && error.message && error.message.includes('Could not find the table')) {
        return res.json({
          heroBanner: { message: 'Sangu Brand Semiya', subMessage: 'Healthy, Delicious & Quick to Cook', backgroundImage: '' },
          whyChooseUs: [],
          productionSteps: [],
          aboutText: '',
          contactDetails: { phone: '', email: '', address: '', whatsapp: '' }
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
    res.json(homepage);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.updateHomepageData = async (req, res) => {
  try {
    const { data: homepage } = await supabase.from('homepage').select('*').single();
    const updateData = { ...req.body };

    if (req.file) {
      const publicUrl = await uploadToSupabase(req.file);
      if (!updateData.heroBanner) updateData.heroBanner = {};
      updateData.heroBanner.backgroundImage = publicUrl;
    }

    if (homepage) {
      const { data: updated, error } = await supabase
        .from('homepage')
        .update(updateData)
        .eq('id', homepage.id)
        .select()
        .single();
      if (error) throw error;
      res.json(updated);
    } else {
      const { data: created, error } = await supabase
        .from('homepage')
        .insert([updateData])
        .select()
        .single();
      if (error) throw error;
      res.status(201).json(created);
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
