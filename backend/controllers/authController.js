const User = require('../models/User');
const jwt = require('jsonwebtoken');
const { nanoid } = require('nanoid');

// Generate JWT
const generateToken = (id) => {
    return jwt.sign({ id }, process.env.JWT_SECRET, {
        expiresIn: '30d',
    });
};

// @desc    Create a new account
// @route   POST /api/auth/create-account
// @access  Public
const createAccount = async (req, res) => {
    const { name, phone, email, role } = req.body;

    try {
        // Check if phone or email is already registered (if email is provided)
        let query = [{ phone }];
        if (email) {
            query.push({ email });
        }

        const userExists = await User.findOne({ $or: query });

        if (userExists) {
            return res.status(400).json({ message: 'User already exists with this phone or email' });
        }

        const userId = nanoid(10); // generate unique id with length 10

        const user = await User.create({
            userId,
            name,
            phone,
            email,
            role: role || 'tenant', // default to tenant if not provided
        });

        if (user) {
            res.status(201).json({
                _id: user._id,
                userId: user.userId,
                name: user.name,
                phone: user.phone,
                email: user.email,
                role: user.role,
                token: generateToken(user._id),
            });
        } else {
            res.status(400).json({ message: 'Invalid user data' });
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

// @desc    Authenticate a user
// @route   POST /api/auth/login
// @access  Public
const loginUser = async (req, res) => {
    const { identifier } = req.body; // Can be userId or phone

    try {
        const user = await User.findOne({
            $or: [{ userId: identifier }, { phone: identifier }]
        });

        if (user) {
            res.json({
                _id: user._id,
                userId: user.userId,
                name: user.name,
                phone: user.phone,
                email: user.email,
                role: user.role,
                token: generateToken(user._id),
            });
        } else {
            res.status(401).json({ message: 'Invalid User ID or Phone Number' });
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

// @desc    Get user profile
// @route   GET /api/auth/profile
// @access  Private
const getUserProfile = async (req, res) => {
    try {
        const user = await User.findById(req.user._id);

        if (user) {
            res.json({
                _id: user._id,
                userId: user.userId,
                name: user.name,
                phone: user.phone,
                email: user.email,
                role: user.role,
            });
        } else {
            res.status(404).json({ message: 'User not found' });
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

module.exports = {
    createAccount,
    loginUser,
    getUserProfile,
};
