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
  // Ensure metadata is an object
  if (mapped.metadata && typeof mapped.metadata === 'string') {
    try { mapped.metadata = JSON.parse(mapped.metadata); } catch { mapped.metadata = {}; }
  }
  if (!mapped.metadata) mapped.metadata = {};
  return mapped;
};

// Strict whitelist: only send known columns to Supabase
const mapToDb = (data) => {
  if (!data) return data;
  const mapped = {};
  if (data.name       !== undefined) mapped.name       = data.name;
  if (data.sku        !== undefined) mapped.sku        = data.sku;
  if (data.description!== undefined) mapped.description= data.description;
  if (data.images     !== undefined) mapped.images     = data.images;
  if (data.category   !== undefined) mapped.category   = data.category;
  if (data.variants   !== undefined) mapped.variants   = data.variants;
  if (data.status     !== undefined) mapped.status     = data.status;
  // Convert featured from FormData string to boolean
  if (data.featured !== undefined) mapped.featured = data.featured === true || data.featured === 'true';
  // snake_case mapping
  const ps = data.packSize ?? data.pack_size;
  if (ps !== undefined) mapped.pack_size = ps;
  const al = data.amazonLink ?? data.amazon_link;
  if (al !== undefined) mapped.amazon_link = al;
  // Only include price if non-empty (column may not exist yet)
  if (data.price) mapped.price = data.price;
  // Metadata: parse from string if needed (FormData sends JSON as string)
  if (data.metadata !== undefined) {
    try {
      mapped.metadata = typeof data.metadata === 'string' ? JSON.parse(data.metadata) : data.metadata;
    } catch { mapped.metadata = {}; }
  }
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
    const { id } = req.params;
    
    // Check if the provided param is a valid UUID
    const uuidRegex = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;
    
    let query = supabase.from('products').select('*');
    
    if (uuidRegex.test(id)) {
      query = query.eq('id', id);
    } else {
      // Decode and trim the ID for better matching
      const decodedId = decodeURIComponent(id).trim();
      // Use ilike for case-insensitive matching
      query = query.ilike('name', decodedId);
    }

    // Use .maybeSingle() instead of .single() to avoid error on multiple matches
    // or just take the first match to be safe
    const { data: product, error } = await query.limit(1).maybeSingle();

    if (error) throw error;
    if (!product) return res.status(404).json({ message: 'Product not found' });
    
    res.json(mapFromDb(product));
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.createProduct = async (req, res) => {
  try {
    const productData = mapToDb({ ...req.body });
    
    // Handle main product images
    const images = [];
    if (req.files?.images?.length > 0) {
      const uploadPromises = req.files.images.map(file => uploadToSupabase(file));
      const fileUrls = await Promise.all(uploadPromises);
      images.push(...fileUrls);
    }
    productData.images = images;

    // Handle banner image separately
    if (req.files?.banner_image?.length > 0) {
      const bannerUrl = await uploadToSupabase(req.files.banner_image[0]);
      if (!productData.metadata) productData.metadata = {};
      productData.metadata.bannerImage = bannerUrl;
    }

    let { data: createdProduct, error } = await supabase
      .from('products')
      .insert([productData])
      .select()
      .single();

    // MISSING COLUMN RETRY LOGIC: If a column doesn't exist yet, retry without it
    if (error && error.message && (error.message.includes('price') || error.message.includes('metadata'))) {
      const filteredDataForRetry = { ...productData };
      if (error.message.includes('price')) delete filteredDataForRetry.price;
      if (error.message.includes('metadata')) delete filteredDataForRetry.metadata;
      
      const retry = await supabase.from('products').insert([filteredDataForRetry]).select().single();
      error = retry.error;
      createdProduct = retry.data;
    }

    if (error) throw error;
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

    if (getError || !product) return res.status(404).json({ message: 'Product not found' });

    const updateData = mapToDb({ ...req.body });

    // Handle existing images merger
    let imageList = [];
    if (req.body.existing_images) {
      try {
        imageList = typeof req.body.existing_images === 'string' 
          ? JSON.parse(req.body.existing_images) 
          : req.body.existing_images;
      } catch (e) {
        imageList = product.images || [];
      }
    } else {
      imageList = product.images || [];
    }

    // Handle new images upload
    if (req.files?.images?.length > 0) {
      const uploadPromises = req.files.images.map(file => uploadToSupabase(file));
      const fileUrls = await Promise.all(uploadPromises);
      imageList.push(...fileUrls);
    }
    
    updateData.images = imageList;

    // Handle banner image separately
    if (req.files?.banner_image?.length > 0) {
      const bannerUrl = await uploadToSupabase(req.files.banner_image[0]);
      if (!updateData.metadata) updateData.metadata = {};
      updateData.metadata.bannerImage = bannerUrl;
    }

    let { data: updatedProduct, error: updateError } = await supabase
      .from('products')
      .update(updateData)
      .eq('id', req.params.id)
      .select()
      .single();

    // MISSING COLUMN RETRY LOGIC: If a column doesn't exist yet, retry without it
    if (updateError && updateError.message && (updateError.message.includes('price') || updateError.message.includes('metadata'))) {
      const filteredDataForRetry = { ...updateData };
      if (updateError.message.includes('price')) delete filteredDataForRetry.price;
      if (updateError.message.includes('metadata')) delete filteredDataForRetry.metadata;

      const retry = await supabase.from('products').update(filteredDataForRetry).eq('id', req.params.id).select().single();
      updateError = retry.error;
      updatedProduct = retry.data;
    }

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

const puppeteer = require('puppeteer-core');

// Common Chrome paths on macOS
const CHROME_PATHS = [
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/Applications/Chromium.app/Contents/MacOS/Chromium',
  '/Applications/Brave Browser.app/Contents/MacOS/Brave Browser',
];

exports.fetchAmazonPrice = async (req, res) => {
  let browser = null;
  try {
    const { url } = req.body;
    if (!url) return res.status(400).json({ message: 'Amazon URL is required' });

    console.log(`[Puppeteer] Fetching price from: ${url}`);

    // Find an available Chrome executable
    const fs = require('fs');
    let executablePath = CHROME_PATHS.find(p => fs.existsSync(p));
    if (!executablePath) {
      return res.status(500).json({ message: 'Chrome not found. Please install Google Chrome.' });
    }

    browser = await puppeteer.launch({
      executablePath,
      headless: 'new',
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-blink-features=AutomationControlled',
        '--window-size=1366,768',
      ],
    });

    const page = await browser.newPage();

    // Set a realistic viewport and user agent
    await page.setViewport({ width: 1366, height: 768 });
    await page.setUserAgent(
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    );

    // Remove webdriver property to avoid bot detection
    await page.evaluateOnNewDocument(() => {
      Object.defineProperty(navigator, 'webdriver', { get: () => false });
    });

    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 20000 });

    // Try to extract price using multiple selectors
    const price = await page.evaluate(() => {
      // Selector 1: Modern Amazon India price
      const whole = document.querySelector('.a-price-whole');
      const fraction = document.querySelector('.a-price-fraction');
      if (whole) {
        const w = whole.textContent.replace(/[^0-9]/g, '');
        const f = fraction ? fraction.textContent.replace(/[^0-9]/g, '') : '00';
        return `₹${w}.${f}`;
      }

      // Selector 2: offscreen price (often the cleanest)
      const offscreen = document.querySelector('.a-offscreen');
      if (offscreen && offscreen.textContent.trim()) {
        return offscreen.textContent.trim();
      }

      // Selector 3: older layout
      const old = document.querySelector('#priceblock_ourprice, #priceblock_dealprice');
      if (old) return old.textContent.trim();

      return null;
    });

    await browser.close();
    browser = null;

    if (!price) {
      return res.status(404).json({ message: 'Price not found. The product may be out of stock or unavailable in your region.' });
    }

    console.log(`[Puppeteer] Price found: ${price}`);
    res.json({ price });

  } catch (error) {
    if (browser) await browser.close();
    console.error('[Puppeteer] Error:', error.message);
    res.status(500).json({ message: `Failed to fetch price: ${error.message}` });
  }
};
