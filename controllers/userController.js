import User from '../models/userModel.js';

// Get All Users
export const getAllUsers = async (req, res) => {
  try {
    const filter = req.user.role === 'hr' ? { role: 'employee' } : { role: { $in: ['employee', 'hr'] } };
    const users = await User.find(filter).select('-password -__v');
    res.status(200).json({
      success: true,
      statusCode: 200,
      message: 'Users fetched successfully',
      data: {
        count: users.length,
        users,
      },
    });
  } catch (error) {
    res.status(500).json({ statusCode: 500, success: false, message: 'Failed to fetch users', error: error.message });
  }
};

// Get User by ID
export const getUserById = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password -__v');

    if (!user) {
      return res.status(404).json({ statusCode: 404, success: false ,message: 'User not found' });
    }

    if (req.user.role === 'hr' && user.role !== 'employee') {
      return res.status(403).json({ statusCode: 403, success: false,  message: 'Access denied' });
    }

    res.status(200).json({
      statusCode: 200,
      success: true,
      message: 'User fetched successfully',
      data: user,
    });
  } catch (error) {
    res.status(500).json({ statusCode: 500, success: false,  message: 'Failed to fetch user', error: error.message });
  }
};

// Update User
export const updateUser = async (req, res) => {
  try {
    const updatedUser = await User.findByIdAndUpdate(req.params.id, req.body, { new: true });

    if (!updatedUser) {
      return res.status(404).json({ statusCode: 404, success: false, message: 'User not found' });
    }

    res.status(200).json({
      statusCode: 200,
      success: true,
      message: 'User updated successfully',
      data: updatedUser,
    });
  } catch (error) {
    res.status(500).json({ statusCode: 500, success: false, message: 'Failed to update user', error: error.message });
  }
};

// Delete User
export const deleteUser = async (req, res) => {
  try {
    const deletedUser = await User.findByIdAndDelete(req.params.id);

    if (!deletedUser) {
      return res.status(404).json({ statusCode: 404, success: false, message: 'User not found' });
    }

    res.status(200).json({ statusCode: 200, success: true, message: 'User deleted successfully' });
  } catch (error) {
    res.status(500).json({ statusCode: 500,success: false,  message: 'Failed to delete user', error: error.message });
  }
};

// Get Dashboard by Role
export const getDashboard = async (req, res) => {
  try {
    switch (req.user.role) {
      case 'admin':
        return res.status(200).json({ statusCode: 200, success: true, message: 'Admin Dashboard' });
      case 'hr':
        return res.status(200).json({ statusCode: 200, success: true, message: 'HR Dashboard' });
      case 'employee':
        return res.status(200).json({ statusCode: 200, success: true, message: 'Employee Dashboard' });
      default:
        return res.status(403).json({ statusCode: 403, success: false, message: 'Unauthorized role' });
    }
  } catch (error) {
    res.status(500).json({ statusCode: 500, success: false, message: 'Failed to fetch dashboard', error: error.message });
  }
};
