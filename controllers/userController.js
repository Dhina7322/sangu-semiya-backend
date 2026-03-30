const { supabase } = require('../utils/supabase');
const bcrypt = require('bcryptjs');

// @desc    Get all admin users
// @route   GET /api/users
// @access  Private/Admin
exports.getUsers = async (req, res) => {
  try {
    const { data: users, error } = await supabase
      .from('users')
      .select('id, email, role, created_at');
    
    if (error) throw error;
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Create a new sub-admin
// @route   POST /api/users/subadmin
// @access  Private/Admin
exports.createSubAdmin = async (req, res) => {
  const rawEmail = req.body.email || '';
  const email = rawEmail.toLowerCase().trim();
  const { password } = req.body;
  try {
    const { data: existingUser } = await supabase
      .from('users')
      .select('email')
      .eq('email', email)
      .single();

    if (existingUser) {
      return res.status(400).json({ message: 'User already exists' });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const { data: user, error } = await supabase
      .from('users')
      .insert([{ email, password: hashedPassword, role: 'Sub-Admin' }])
      .select()
      .single();

    if (error) throw error;

    res.status(201).json({
      _id: user.id,
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
  const currentEmail = (req.body.currentEmail || '').toLowerCase().trim();
  const email = (req.body.email || '').toLowerCase().trim();
  const { currentPassword, password } = req.body;
  try {
    const { data: user, error: getError } = await supabase
      .from('users')
      .select('*')
      .eq('id', req.user.id || req.user._id)
      .single();

    if (getError || !user) return res.status(404).json({ message: 'User not found' });

    // Security: Verify current email and password before allowing changes
    const isEmailMatch = (user.email === currentEmail);
    const isPasswordMatch = await bcrypt.compare(currentPassword, user.password);

    if (!isEmailMatch || !isPasswordMatch) {
       return res.status(401).json({ message: 'Verification failed. Current email or password incorrect.' });
    }

    const updateData = { email: email || user.email };
    if (password) {
      const salt = await bcrypt.genSalt(10);
      updateData.password = await bcrypt.hash(password, salt);
    }

    // Role safeguard
    if (updateData.email === 'admin@sangusemiya.com') {
      updateData.role = 'Admin';
    }

    const { data: updatedUser, error: updateError } = await supabase
      .from('users')
      .update(updateData)
      .eq('id', user.id)
      .select()
      .single();

    if (updateError) throw updateError;

    res.json({
      _id: updatedUser.id,
      email: updatedUser.email,
      role: updatedUser.role,
      message: 'Profile updated successfully'
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Delete user
// @route   DELETE /api/users/:id
// @access  Private/Admin
exports.deleteUser = async (req, res) => {
  try {
    const { data: user, error: getError } = await supabase
      .from('users')
      .select('*')
      .eq('id', req.params.id)
      .single();

    if (getError || !user) return res.status(404).json({ message: 'User not found' });

    if (user.role === 'Admin' && user.email === 'admin@sangusemiya.com') {
       return res.status(400).json({ message: 'Cannot delete the primary admin account' });
    }

    const { error: deleteError } = await supabase
      .from('users')
      .delete()
      .eq('id', user.id);

    if (deleteError) throw deleteError;
    res.json({ message: 'User removed from system' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update any user (Admin only)
// @route   PUT /api/users/:id
// @access  Private/Admin
exports.updateUser = async (req, res) => {
  const email = (req.body.email || '').toLowerCase().trim();
  const { password } = req.body;
  try {
    const { data: user, error: getError } = await supabase
      .from('users')
      .select('*')
      .eq('id', req.params.id)
      .single();

    if (getError || !user) return res.status(404).json({ message: 'User not found' });

    if (user.email === 'admin@sangusemiya.com' && email && email !== 'admin@sangusemiya.com') {
      return res.status(400).json({ message: 'Primary admin email is protected' });
    }

    const updateData = { email: email || user.email };
    if (password) {
      const salt = await bcrypt.genSalt(10);
      updateData.password = await bcrypt.hash(password, salt);
    }

    const { data: updatedUser, error: updateError } = await supabase
      .from('users')
      .update(updateData)
      .eq('id', user.id)
      .select()
      .single();

    if (updateError) throw updateError;

    res.json({
      _id: updatedUser.id,
      email: updatedUser.email,
      role: updatedUser.role,
      message: 'User updated successfully'
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
