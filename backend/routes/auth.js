import express from 'express';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

// Generate Token helper
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: '30d',
  });
};

// @desc    Register a new user
// @route   POST /api/auth/register
// @access  Public
router.post('/register', async (req, res) => {
  const { username, email, password } = req.body;

  try {
    if (!username || !email || !password) {
      return res.status(400).json({ message: 'Please provide all fields' });
    }

    // Check if user already exists
    const userExists = await User.findOne({ $or: [{ email }, { username }] });
    if (userExists) {
      return res.status(400).json({ message: 'User already exists with this email or username' });
    }

    // Create user
    const user = await User.create({
      username,
      email,
      password,
    });

    if (user) {
      return res.status(201).json({
        _id: user._id,
        username: user.username,
        email: user.email,
        token: generateToken(user._id),
      });
    } else {
      return res.status(400).json({ message: 'Invalid user data' });
    }
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});

// @desc    Authenticate user & get token
// @route   POST /api/auth/login
// @access  Public
router.post('/login', async (req, res) => {
  const { emailOrUsername, password } = req.body;

  try {
    if (!emailOrUsername || !password) {
      return res.status(400).json({ message: 'Please fill in all fields' });
    }

    // Find user by username or email
    const user = await User.findOne({
      $or: [{ email: emailOrUsername.toLowerCase() }, { username: emailOrUsername }],
    });

    if (user && (await user.matchPassword(password))) {
      return res.json({
        _id: user._id,
        username: user.username,
        email: user.email,
        token: generateToken(user._id),
      });
    } else {
      return res.status(401).json({ message: 'Invalid email/username or password' });
    }
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});

// @desc    Get current user profile
// @route   GET /api/auth/me
// @access  Private
router.get('/me', protect, async (req, res) => {
  return res.json({
    _id: req.user._id,
    username: req.user.username,
    email: req.user.email,
  });
});

export default router;
