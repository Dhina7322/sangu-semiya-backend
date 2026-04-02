require('dotenv').config();
const { supabase } = require('./utils/supabase');

async function listProducts() {
    try {
        const { data, error } = await supabase.from('products').select('id, name, status');
        if (error) {
            console.error('Supabase Error:', error);
        } else {
            console.log('Available Products:', JSON.stringify(data, null, 2));
        }
    } catch (e) {
        console.error('Runtime Error:', e.message);
    }
}

listProducts();
