import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import db from '../config/database.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// Register
router.post('/register', async (req, res) => {
  try {
    console.log('Registration request:', req.body);
    
    const { email, password, name, phone, city } = req.body;

    if (!email || !password || !name) {
      return res.status(400).json({ error: 'Email, password, and name are required' });
    }

    await db.read();

    const existingUser = db.data.users.find(u => u.email === email);
    if (existingUser) {
      return res.status(400).json({ error: 'User already exists with this email' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const userId = uuidv4();

    const newUser = {
      id: userId,
      email,
      password: hashedPassword,
      name,
      phone: phone || null,
      city: city || null,
      role: 'user',
      created_at: new Date().toISOString()
    };

    db.data.users.push(newUser);
    await db.write();

    const token = jwt.sign(
      { id: userId, email, role: 'user' },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    console.log('✅ User registered successfully:', userId);

    res.status(201).json({
      token,
      user: { id: userId, email, name, phone, city, role: 'user' }
    });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ error: 'Registration failed', message: error.message });
  }
});

// Login
router.post('/login', async (req, res) => {
  try {
    console.log('Login request:', req.body.email);
    
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    await db.read();

    const user = db.data.users.find(u => u.email === email);
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    console.log('✅ User logged in successfully:', user.id);

    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        phone: user.phone,
        city: user.city,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed', message: error.message });
  }
});

// Get current user
router.get('/me', authenticateToken, async (req, res) => {
  try {
    await db.read();
    const user = db.data.users.find(u => u.id === req.user.id);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      id: user.id,
      email: user.email,
      name: user.name,
      phone: user.phone,
      city: user.city,
      role: user.role
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Failed to fetch user' });
  }
});

// Update profile - FIXED
router.put('/profile', authenticateToken, async (req, res) => {
  try {
    const { name, phone, city } = req.body;

    console.log('📝 Profile update request:', { name, phone, city, userId: req.user.id });

    await db.read();
    
    const userIndex = db.data.users.findIndex(u => u.id === req.user.id);
    if (userIndex === -1) {
      return res.status(404).json({ error: 'User not found' });
    }

    db.data.users[userIndex] = {
      ...db.data.users[userIndex],
      name: name || db.data.users[userIndex].name,
      phone: phone || db.data.users[userIndex].phone,
      city: city || db.data.users[userIndex].city,
      updated_at: new Date().toISOString()
    };

    await db.write();

    console.log('✅ Profile updated successfully');

    res.json({ 
      message: 'Profile updated successfully',
      user: {
        id: db.data.users[userIndex].id,
        email: db.data.users[userIndex].email,
        name: db.data.users[userIndex].name,
        phone: db.data.users[userIndex].phone,
        city: db.data.users[userIndex].city,
        role: db.data.users[userIndex].role
      }
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

// Request owner role - FIXED
router.post('/request-owner', authenticateToken, async (req, res) => {
  try {
    console.log('📝 Owner upgrade request from user:', req.user.id);

    await db.read();
    
    const userIndex = db.data.users.findIndex(u => u.id === req.user.id);
    if (userIndex === -1) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (db.data.users[userIndex].role === 'owner') {
      return res.status(400).json({ error: 'You are already an owner' });
    }

    db.data.users[userIndex].role = 'owner';
    db.data.users[userIndex].updated_at = new Date().toISOString();

    await db.write();

    // Generate new token with updated role
    const newToken = jwt.sign(
      { id: db.data.users[userIndex].id, email: db.data.users[userIndex].email, role: 'owner' },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    console.log('✅ Owner role granted to user:', req.user.id);

    res.json({ 
      message: 'Owner role granted successfully',
      token: newToken,
      user: {
        id: db.data.users[userIndex].id,
        email: db.data.users[userIndex].email,
        name: db.data.users[userIndex].name,
        phone: db.data.users[userIndex].phone,
        city: db.data.users[userIndex].city,
        role: 'owner'
      }
    });
  } catch (error) {
    console.error('Request owner error:', error);
    res.status(500).json({ error: 'Failed to grant owner role' });
  }
});

// Vehicle management routes - NEW
router.get('/vehicles', authenticateToken, async (req, res) => {
  try {
    await db.read();
    
    // Initialize vehicles array if it doesn't exist
    if (!db.data.vehicles) {
      db.data.vehicles = [];
      await db.write();
    }

    const vehicles = db.data.vehicles.filter(v => v.user_id === req.user.id);
    
    console.log(`🚗 Fetched ${vehicles.length} vehicles for user ${req.user.id}`);
    res.json(vehicles);
  } catch (error) {
    console.error('Get vehicles error:', error);
    res.status(500).json({ error: 'Failed to fetch vehicles' });
  }
});

router.post('/vehicles', authenticateToken, async (req, res) => {
  try {
    const { model, capacity, efficiency, isDefault } = req.body;

    await db.read();

    // Initialize vehicles array if it doesn't exist
    if (!db.data.vehicles) {
      db.data.vehicles = [];
    }

    // If this is default, unset other defaults
    if (isDefault) {
      db.data.vehicles.forEach(v => {
        if (v.user_id === req.user.id) {
          v.is_default = false;
        }
      });
    }

    const vehicleId = uuidv4();
    const newVehicle = {
      id: vehicleId,
      user_id: req.user.id,
      model,
      capacity: parseFloat(capacity),
      efficiency: parseFloat(efficiency),
      is_default: isDefault || db.data.vehicles.filter(v => v.user_id === req.user.id).length === 0,
      created_at: new Date().toISOString()
    };

    db.data.vehicles.push(newVehicle);
    await db.write();

    console.log('✅ Vehicle added:', model);
    res.json({ message: 'Vehicle added successfully', vehicleId, vehicle: newVehicle });
  } catch (error) {
    console.error('Add vehicle error:', error);
    res.status(500).json({ error: 'Failed to add vehicle' });
  }
});

router.delete('/vehicles/:id', authenticateToken, async (req, res) => {
  try {
    await db.read();

    const vehicleIndex = db.data.vehicles.findIndex(
      v => v.id === req.params.id && v.user_id === req.user.id
    );

    if (vehicleIndex === -1) {
      return res.status(404).json({ error: 'Vehicle not found' });
    }

    db.data.vehicles.splice(vehicleIndex, 1);
    await db.write();

    console.log('✅ Vehicle deleted:', req.params.id);
    res.json({ message: 'Vehicle deleted successfully' });
  } catch (error) {
    console.error('Delete vehicle error:', error);
    res.status(500).json({ error: 'Failed to delete vehicle' });
  }
});

router.put('/vehicles/:id/default', authenticateToken, async (req, res) => {
  try {
    await db.read();

    // Unset all defaults
    db.data.vehicles.forEach(v => {
      if (v.user_id === req.user.id) {
        v.is_default = false;
      }
    });

    // Set new default
    const vehicleIndex = db.data.vehicles.findIndex(
      v => v.id === req.params.id && v.user_id === req.user.id
    );

    if (vehicleIndex === -1) {
      return res.status(404).json({ error: 'Vehicle not found' });
    }

    db.data.vehicles[vehicleIndex].is_default = true;
    await db.write();

    console.log('✅ Default vehicle set:', req.params.id);
    res.json({ message: 'Default vehicle updated' });
  } catch (error) {
    console.error('Set default vehicle error:', error);
    res.status(500).json({ error: 'Failed to set default vehicle' });
  }
});

export default router;