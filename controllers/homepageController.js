const Homepage = require('../models/Homepage');

exports.getHomepageData = async (req, res) => {
  try {
    let homepage = await Homepage.findOne({});
    if (!homepage) {
      // Create default if not exists
      homepage = await Homepage.create({});
    }
    res.json(homepage);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.updateHomepageData = async (req, res) => {
  try {
    let homepage = await Homepage.findOne({});
    if (homepage) {
      Object.assign(homepage, req.body);
      const updatedHomepage = await homepage.save();
      res.json(updatedHomepage);
    } else {
      // Should not happen if get was called before, but just in case
      const newHomepage = new Homepage(req.body);
      const createdHomepage = await newHomepage.save();
      res.status(201).json(createdHomepage);
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
