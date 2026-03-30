const User = require('../models/User');
const bcrypt = require('bcryptjs');

// @desc    Get all admin users
// @route   GET /api/users
// @access  Private/Admin
exports.getUsers = async (req, res) => {
  try {
    const users = await User.find({}).select('-password');
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Create a new sub-admin
// @route   POST /api/users/subadmin
// @access  Private/Admin
exports.createSubAdmin = async (req, res) => {
  const { email, password } = req.body;
  try {
    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({ message: 'User already exists' });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const user = await User.create({
      email,
      password: hashedPassword,
      role: 'Sub-Admin'
    });

    res.status(201).json({
      _id: user._id,
      email: user.email,
      role: user.role
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update current user profile (email/password)
// @route   PUT /api/users/profile
// @access  Private
exports.updateProfile = async (req, res) => {
  const { currentEmail, currentPassword, email, password } = req.body;
  try {
    const user = await User.findById(req.user._id);

    if (user) {
      // Security: Verify current email and password before allowing changes
      const isEmailMatch = (user.email === currentEmail);
      const isPasswordMatch = await bcrypt.compare(currentPassword, user.password);

      if (!isEmailMatch || !isPasswordMatch) {
         return res.status(401).json({ message: 'Verification failed. Current email or password incorrect.' });
      }

      user.email = email || user.email;
      if (password) {
        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(password, salt);
      }

      // Safeguard: Ensure the primary admin email is ALWAYS assigned the Admin role in the database
      if (user.email === 'admin@sangusemiya.com') {
        user.role = 'Admin';
      }

      const updatedUser = await user.save();

      res.json({
        _id: updatedUser._id,
        email: updatedUser.email,
        role: updatedUser.role,
        message: 'Profile updated successfully'
      });
    } else {
      res.status(404).json({ message: 'User not found' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Delete user
// @route   DELETE /api/users/:id
// @access  Private/Admin
exports.deleteUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (user) {
      if (user.role === 'Admin' && user.email === 'admin@sangusemiya.com') {
         return res.status(400).json({ message: 'Cannot delete the primary admin account' });
      }
      await User.deleteOne({ _id: user._id });
      res.json({ message: 'User removed from system' });
    } else {
      res.status(404).json({ message: 'User not found' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update any user (Admin only)
// @route   PUT /api/users/:id
// @access  Private/Admin
exports.updateUser = async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (user.email === 'admin@sangusemiya.com' && email && email !== 'admin@sangusemiya.com') {
      return res.status(400).json({ message: 'Primary admin email is protected' });
    }

    user.email = email || user.email;
    if (password) {
      const salt = await bcrypt.genSalt(10);
      user.password = await bcrypt.hash(password, salt);
    }

    const updatedUser = await user.save();
    res.json({
      _id: updatedUser._id,
      email: updatedUser.email,
      role: updatedUser.role,
      message: 'User updated successfully'
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
