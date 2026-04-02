const { supabase } = require('../utils/supabase');

exports.createEnquiry = async (req, res) => {
  try {
    const { data: createdEnquiry, error } = await supabase
      .from('enquiries')
      .insert([req.body])
      .select()
      .single();

    if (error) {
      if (error.message && error.message.includes('Could not find the table')) {
        return res.status(503).json({ message: 'Database setup required for inquiries' });
      }
      throw error;
    }
    res.status(201).json(createdEnquiry);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getEnquiries = async (req, res) => {
  try {
    const { data: enquiries, error } = await supabase
      .from('enquiries')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error("Supabase Error in getEnquiries:", error.message);
      return res.json([]);
    }
    res.json(enquiries || []);
  } catch (error) {
    console.error("Catch Error in getEnquiries:", error.message);
    res.json([]);
  }
};

exports.updateEnquiryStatus = async (req, res) => {
  try {
    const { data: updatedEnquiry, error } = await supabase
      .from('enquiries')
      .update({ status: req.body.status })
      .eq('id', req.params.id)
      .select()
      .single();

    if (error) return res.status(404).json({ message: 'Enquiry not found or update failed' });
    res.json(updatedEnquiry);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.deleteEnquiry = async (req, res) => {
  try {
    const { error } = await supabase
      .from('enquiries')
      .delete()
      .eq('id', req.params.id);

    if (error) throw error;
    res.status(200).json({ message: 'Enquiry deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
