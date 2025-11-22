import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import Card from '../components/Card';
import Input from '../components/Input';
import Button from '../components/Button';
import { User, Car, Shield, Trash2, Check } from 'lucide-react';
import { authAPI } from '../services/api';
import axios from 'axios';

const Profile = () => {
  const { t } = useTranslation();
  const { user, updateProfile, logout } = useAuth();
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [upgrading, setUpgrading] = useState(false);
  const [profileData, setProfileData] = useState({
    name: '',
    phone: '',
    city: ''
  });
  const [vehicles, setVehicles] = useState([]);
  const [showAddVehicle, setShowAddVehicle] = useState(false);
  const [newVehicle, setNewVehicle] = useState({
    model: 'Tata Nexon EV',
    capacity: '30.2',
    efficiency: '6.5',
    isDefault: false
  });

  const evModels = [
    { name: 'Tata Nexon EV', capacity: 30.2, efficiency: 6.5 },
    { name: 'Tata Nexon EV Max', capacity: 40.5, efficiency: 6.8 },
    { name: 'MG ZS EV', capacity: 50.3, efficiency: 6.2 },
    { name: 'Hyundai Kona Electric', capacity: 39.2, efficiency: 6.0 },
    { name: 'Mahindra XUV400', capacity: 39.4, efficiency: 6.4 },
    { name: 'BYD Atto 3', capacity: 60.48, efficiency: 6.7 },
    { name: 'Tata Tiago EV', capacity: 24.0, efficiency: 7.0 },
    { name: 'Citroen eC3', capacity: 29.2, efficiency: 6.8 },
    { name: 'Custom', capacity: 50, efficiency: 6.0 }
  ];

  useEffect(() => {
    if (user) {
      setProfileData({
        name: user.name || '',
        phone: user.phone || '',
        city: user.city || ''
      });
      loadVehicles();
    }
  }, [user]);

  const loadVehicles = async () => {
    try {
      const data = await authAPI.getVehicles();
      setVehicles(data);
    } catch (error) {
      console.error('Failed to load vehicles:', error);
    }
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await updateProfile(profileData);
      setEditing(false);
      alert('Profile updated successfully!');
    } catch (error) {
      console.error('Failed to update profile:', error);
      alert('Failed to update profile: ' + (error.error || error.message));
    } finally {
      setLoading(false);
    }
  };

  const handleRequestOwner = async () => {
    if (!window.confirm('Do you want to upgrade to Station Owner account?')) {
      return;
    }

    setUpgrading(true);
    try {
      const response = await authAPI.requestOwner();
      
      // Update token and reload
      if (response.token) {
        localStorage.setItem('token', response.token);
      }
      
      alert('Congratulations! You are now a Station Owner. Please log in again.');
      logout();
      window.location.href = '/login';
    } catch (error) {
      console.error('Failed to upgrade:', error);
      alert('Failed to upgrade: ' + (error.error || error.message));
    } finally {
      setUpgrading(false);
    }
  };

  const handleAddVehicle = async (e) => {
    e.preventDefault();
    try {
      await authAPI.addVehicle(newVehicle);
      setShowAddVehicle(false);
      setNewVehicle({
        model: 'Tata Nexon EV',
        capacity: '30.2',
        efficiency: '6.5',
        isDefault: false
      });
      loadVehicles();
      alert('Vehicle added successfully!');
    } catch (error) {
      console.error('Failed to add vehicle:', error);
      alert('Failed to add vehicle');
    }
  };

  const handleDeleteVehicle = async (id) => {
    if (!window.confirm('Are you sure you want to delete this vehicle?')) {
      return;
    }

    try {
      await authAPI.deleteVehicle(id);
      loadVehicles();
      alert('Vehicle deleted successfully!');
    } catch (error) {
      console.error('Failed to delete vehicle:', error);
      alert('Failed to delete vehicle');
    }
  };

  const handleSetDefault = async (id) => {
    try {
      await authAPI.setDefaultVehicle(id);
      loadVehicles();
    } catch (error) {
      console.error('Failed to set default vehicle:', error);
      alert('Failed to set default vehicle');
    }
  };

  const handleModelChange = (modelName) => {
    const selectedModel = evModels.find(m => m.name === modelName);
    if (selectedModel) {
      setNewVehicle({
        ...newVehicle,
        model: modelName,
        capacity: selectedModel.capacity.toString(),
        efficiency: selectedModel.efficiency.toString()
      });
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fade-in">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">{t('profile.title')}</h1>
        <p className="text-gray-600 mt-1">Manage your account and vehicle information</p>
      </div>

      {/* Personal Information */}
      <Card title={t('profile.personalInfo')}>
        <form onSubmit={handleSaveProfile}>
          <div className="space-y-4">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-20 h-20 bg-gradient-to-br from-primary-500 to-primary-700 rounded-full flex items-center justify-center text-white text-3xl font-bold">
                {user?.name?.[0]?.toUpperCase()}
              </div>
              <div>
                <h2 className="text-xl font-bold">{user?.name}</h2>
                <p className="text-gray-600">{user?.email}</p>
                <span className="inline-block mt-1 px-3 py-1 bg-primary-100 text-primary-800 text-sm rounded-full capitalize">
                  {user?.role}
                </span>
              </div>
            </div>

            <Input
              label={t('auth.name')}
              value={profileData.name}
              onChange={(e) => setProfileData({ ...profileData, name: e.target.value })}
              disabled={!editing}
              required
            />

            <Input
              label={t('auth.phone')}
              type="tel"
              value={profileData.phone}
              onChange={(e) => setProfileData({ ...profileData, phone: e.target.value })}
              disabled={!editing}
              placeholder="Enter phone number"
            />

            <Input
              label={t('auth.city')}
              value={profileData.city}
              onChange={(e) => setProfileData({ ...profileData, city: e.target.value })}
              disabled={!editing}
              placeholder="Enter your city"
            />

            <div className="flex gap-3">
              {!editing ? (
                <Button type="button" onClick={() => setEditing(true)}>
                  {t('common.edit')}
                </Button>
              ) : (
                <>
                  <Button type="submit" loading={loading}>
                    {t('common.save')}
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => {
                      setEditing(false);
                      setProfileData({
                        name: user.name,
                        phone: user.phone,
                        city: user.city
                      });
                    }}
                  >
                    {t('common.cancel')}
                  </Button>
                </>
              )}
            </div>
          </div>
        </form>
      </Card>

      {/* Vehicle Information */}
      <Card title={t('profile.vehicleInfo')}>
        <div className="space-y-4">
          {vehicles.map((vehicle) => (
            <div
              key={vehicle.id}
              className="p-4 border rounded-lg flex items-center justify-between hover:bg-gray-50"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-primary-100 rounded-lg flex items-center justify-center">
                  <Car className="text-primary-600" size={24} />
                </div>
                <div>
                  <h3 className="font-semibold">{vehicle.model}</h3>
                  <p className="text-sm text-gray-600">
                    {vehicle.capacity} kWh • {vehicle.efficiency} km/kWh
                  </p>
                  {vehicle.is_default && (
                    <span className="text-xs text-primary-600 font-medium flex items-center gap-1 mt-1">
                      <Check size={14} /> Default Vehicle
                    </span>
                  )}
                </div>
              </div>
              <div className="flex gap-2">
                {!vehicle.is_default && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleSetDefault(vehicle.id)}
                  >
                    Set Default
                  </Button>
                )}
                <Button
                  size="sm"
                  variant="danger"
                  onClick={() => handleDeleteVehicle(vehicle.id)}
                >
                  <Trash2 size={16} />
                </Button>
              </div>
            </div>
          ))}

          {vehicles.length === 0 && (
            <p className="text-center text-gray-500 py-4">No vehicles added yet</p>
          )}

          {!showAddVehicle ? (
            <Button onClick={() => setShowAddVehicle(true)} className="w-full">
              + Add Vehicle
            </Button>
          ) : (
            <form onSubmit={handleAddVehicle} className="mt-4 p-6 border-2 border-dashed rounded-lg bg-gray-50">
              <h3 className="font-semibold mb-3">Add New Vehicle</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium mb-2">EV Model</label>
                  <select
                    className="w-full p-2 border rounded-lg"
                    value={newVehicle.model}
                    onChange={(e) => handleModelChange(e.target.value)}
                    required
                  >
                    {evModels.map((model) => (
                      <option key={model.name} value={model.name}>
                        {model.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Battery Capacity (kWh)</label>
                  <input
                    type="number"
                    step="0.1"
                    className="w-full p-2 border rounded-lg"
                    value={newVehicle.capacity}
                    onChange={(e) => setNewVehicle({ ...newVehicle, capacity: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Efficiency (km/kWh)</label>
                  <input
                    type="number"
                    step="0.1"
                    className="w-full p-2 border rounded-lg"
                    value={newVehicle.efficiency}
                    onChange={(e) => setNewVehicle({ ...newVehicle, efficiency: e.target.value })}
                    required
                  />
                </div>
                <div className="md:col-span-2 flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="isDefault"
                    checked={newVehicle.isDefault}
                    onChange={(e) => setNewVehicle({ ...newVehicle, isDefault: e.target.checked })}
                    className="w-4 h-4"
                  />
                  <label htmlFor="isDefault" className="text-sm">Make this my default vehicle</label>
                </div>
              </div>
              <div className="flex gap-2 mt-4">
                <Button type="submit">Add Vehicle</Button>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setShowAddVehicle(false)}
                >
                  Cancel
                </Button>
              </div>
            </form>
          )}
        </div>
      </Card>

      {/* Upgrade to Owner */}
      {user?.role === 'user' && (
        <Card>
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
              <Shield className="text-orange-600" size={24} />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold">Become a Station Owner</h3>
              <p className="text-sm text-gray-600">
                Register your charging station and help grow the EV ecosystem
              </p>
            </div>
            <Button variant="outline" onClick={handleRequestOwner} loading={upgrading}>
              Request Upgrade
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
};

export default Profile;