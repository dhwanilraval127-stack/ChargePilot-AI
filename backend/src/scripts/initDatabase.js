import { Low } from 'lowdb';
import { JSONFile } from 'lowdb/node';
import bcrypt from 'bcryptjs';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbDir = path.join(__dirname, '../../database');
const dbPath = path.join(dbDir, 'db.json');

if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const adapter = new JSONFile(dbPath);
const db = new Low(adapter, {});

await db.read();

console.log('🗄️  Initializing ChargePilot Database...');

const adminPassword = await bcrypt.hash('admin123', 10);

db.data = {
  users: [
    {
      id: 'admin-001',
      email: 'admin@chargepilot.ai',
      password: adminPassword,
      name: 'Admin User',
      phone: null,
      city: 'Mumbai',
      role: 'admin',
      created_at: new Date().toISOString()
    }
  ],
  vehicles: [],
  stations: [
    {
      id: 'station-1',
      name: 'Tata Power Charging Station',
      address: 'Phoenix Marketcity, Kurla',
      city: 'Mumbai',
      state: 'Maharashtra',
      latitude: 19.0878,
      longitude: 72.8914,
      connector_types: 'CCS2, CHAdeMO, Type2',
      power_kw: 50,
      pricing_info: '₹15/kWh',
      source: 'dataset',
      is_verified: 1,
      owner_id: null,
      health_score: 95,
      avg_rating: 4.5,
      total_reviews: 0,
      is_active: 1,
      created_at: new Date().toISOString()
    },
    {
      id: 'station-2',
      name: 'Ather Grid',
      address: 'MG Road Metro Station',
      city: 'Bangalore',
      state: 'Karnataka',
      latitude: 12.9756,
      longitude: 77.6065,
      connector_types: 'Type2, Bharat DC',
      power_kw: 30,
      pricing_info: '₹12/kWh',
      source: 'dataset',
      is_verified: 1,
      owner_id: null,
      health_score: 88,
      avg_rating: 4.2,
      total_reviews: 0,
      is_active: 1,
      created_at: new Date().toISOString()
    },
    {
      id: 'station-3',
      name: 'Reliance BP Charging Hub',
      address: 'Connaught Place',
      city: 'New Delhi',
      state: 'Delhi',
      latitude: 28.6315,
      longitude: 77.2167,
      connector_types: 'CCS2, Type2',
      power_kw: 60,
      pricing_info: '₹18/kWh',
      source: 'dataset',
      is_verified: 1,
      owner_id: null,
      health_score: 92,
      avg_rating: 4.7,
      total_reviews: 0,
      is_active: 1,
      created_at: new Date().toISOString()
    }
  ],
  reviews: [],
  reports: [],
  trips: [],
  sessions: [],
  claims: []
};

await db.write();

console.log('✅ Database initialized successfully!');
console.log('✅ Admin user created:');
console.log('   Email: admin@chargepilot.ai');
console.log('   Password: admin123');
console.log('✅ Sample stations added');
console.log('🎉 Setup complete!');