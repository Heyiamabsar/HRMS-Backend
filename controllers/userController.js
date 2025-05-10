import User from '../models/User.js';

// Get All Users
export const getAllUsers = async (req, res) => {
  try {
    const filter = req.user.role === 'hr' ? { role: 'employee' } : { role: { $in: ['employee', 'hr'] } };
    const users = await User.find(filter);
    res.status(200).json(users);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch users', error: error.message });
  }
};

// Get User by ID
export const getUserById = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (req.user.role === 'hr' && user.role !== 'employee') {
      return res.status(403).json({ message: 'Access denied' });
    }

    res.status(200).json(user);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch user', error: error.message });
  }
};

// Update User
export const updateUser = async (req, res) => {
  try {
    const updatedUser = await User.findByIdAndUpdate(req.params.id, req.body, { new: true });

    if (!updatedUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.status(200).json(updatedUser);
  } catch (error) {
    res.status(500).json({ message: 'Failed to update user', error: error.message });
  }
};

// Delete User
export const deleteUser = async (req, res) => {
  try {
    const deletedUser = await User.findByIdAndDelete(req.params.id);

    if (!deletedUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.status(200).json({ message: 'User deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Failed to delete user', error: error.message });
  }
};

// Get Dashboard by Role
export const getDashboard = async (req, res) => {
  try {
    switch (req.user.role) {
      case 'admin':
        return res.status(200).json({ message: 'Admin Dashboard' });
      case 'hr':
        return res.status(200).json({ message: 'HR Dashboard' });
      case 'employee':
        return res.status(200).json({ message: 'Employee Dashboard' });
      default:
        return res.status(403).json({ message: 'Unauthorized role' });
    }
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch dashboard', error: error.message });
  }
};
