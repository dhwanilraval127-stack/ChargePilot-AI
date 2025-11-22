"""
Generate realistic synthetic EV consumption data for training
"""

import pandas as pd
import numpy as np
from typing import Tuple
import os

class EVDataGenerator:
    def __init__(self, seed: int = 42):
        np.random.seed(seed)
        
        # EV Models Database
        self.ev_models = {
            'Tata Nexon EV': {'battery': 30.2, 'base_efficiency': 5.2},
            'Tata Tigor EV': {'battery': 26.0, 'base_efficiency': 5.5},
            'MG ZS EV': {'battery': 50.3, 'base_efficiency': 6.0},
            'Hyundai Kona': {'battery': 39.2, 'base_efficiency': 6.5},
            'BYD Atto 3': {'battery': 60.5, 'base_efficiency': 6.8},
            'Mahindra e-Verito': {'battery': 21.2, 'base_efficiency': 4.8},
            'Tesla Model 3': {'battery': 60.0, 'base_efficiency': 7.2},
            'Volvo XC40': {'battery': 78.0, 'base_efficiency': 6.2},
        }
        
        # Indian cities for realistic location data
        self.cities = [
            'Mumbai', 'Delhi', 'Bangalore', 'Hyderabad', 'Chennai',
            'Kolkata', 'Pune', 'Ahmedabad', 'Jaipur', 'Lucknow'
        ]
        
    def generate_consumption_data(self, n_samples: int = 20000) -> pd.DataFrame:
        """
        Generate EV energy consumption dataset
        """
        
        data = []
        
        for _ in range(n_samples):
            # Select random EV model
            model_name = np.random.choice(list(self.ev_models.keys()))
            model_specs = self.ev_models[model_name]
            
            # Basic parameters
            battery_capacity = model_specs['battery']
            base_efficiency = model_specs['base_efficiency']
            
            # Current State of Charge (10-100%)
            current_soc = np.random.uniform(10, 100)
            
            # Trip parameters
            terrain = np.random.choice(['Highway', 'City', 'Mixed'], p=[0.3, 0.4, 0.3])
            
            # Speed depends on terrain
            if terrain == 'Highway':
                avg_speed = np.random.uniform(80, 120)
            elif terrain == 'City':
                avg_speed = np.random.uniform(20, 60)
            else:  # Mixed
                avg_speed = np.random.uniform(40, 80)
            
            # Environmental conditions
            season = np.random.choice(['Summer', 'Winter', 'Monsoon', 'Spring'], 
                                     p=[0.3, 0.25, 0.25, 0.2])
            
            if season == 'Summer':
                temperature = np.random.uniform(28, 45)
            elif season == 'Winter':
                temperature = np.random.uniform(5, 20)
            elif season == 'Monsoon':
                temperature = np.random.uniform(22, 32)
            else:  # Spring
                temperature = np.random.uniform(18, 30)
            
            # AC usage (more likely in summer)
            if temperature > 30:
                ac_usage = np.random.choice(['On', 'Off'], p=[0.9, 0.1])
            elif temperature < 15:
                ac_usage = np.random.choice(['On', 'Off'], p=[0.6, 0.4])  # Heater
            else:
                ac_usage = np.random.choice(['On', 'Off'], p=[0.3, 0.7])
            
            # Driving style
            driving_style = np.random.choice(['Eco', 'Moderate', 'Aggressive'], 
                                            p=[0.2, 0.6, 0.2])
            
            # Payload (kg) - affects consumption
            payload = np.random.uniform(0, 400)
            
            # Road condition
            road_condition = np.random.choice(['Good', 'Average', 'Poor'], 
                                             p=[0.5, 0.35, 0.15])
            
            # Traffic density (affects city driving)
            if terrain == 'City':
                traffic = np.random.choice(['Light', 'Moderate', 'Heavy'], 
                                          p=[0.3, 0.5, 0.2])
            else:
                traffic = 'Light'
            
            # Elevation change (m) - hills reduce range
            elevation_change = np.random.uniform(-200, 500)
            
            # Calculate realistic range
            range_km = self._calculate_range(
                battery_capacity=battery_capacity,
                current_soc=current_soc,
                base_efficiency=base_efficiency,
                terrain=terrain,
                avg_speed=avg_speed,
                temperature=temperature,
                ac_usage=ac_usage,
                driving_style=driving_style,
                payload=payload,
                road_condition=road_condition,
                traffic=traffic,
                elevation_change=elevation_change
            )
            
            data.append({
                'EV_Model': model_name,
                'Battery_Capacity_kWh': battery_capacity,
                'Current_SoC_%': current_soc,
                'Terrain': terrain,
                'Avg_Speed_kmh': avg_speed,
                'Temperature_C': temperature,
                'Season': season,
                'AC_Usage': ac_usage,
                'Driving_Style': driving_style,
                'Payload_kg': payload,
                'Road_Condition': road_condition,
                'Traffic': traffic,
                'Elevation_Change_m': elevation_change,
                'Range_km': range_km,
                'City': np.random.choice(self.cities)
            })
        
        df = pd.DataFrame(data)
        return df
    
    def _calculate_range(
        self,
        battery_capacity: float,
        current_soc: float,
        base_efficiency: float,
        terrain: str,
        avg_speed: float,
        temperature: float,
        ac_usage: str,
        driving_style: str,
        payload: float,
        road_condition: str,
        traffic: str,
        elevation_change: float
    ) -> float:
        """
        Calculate realistic EV range based on multiple factors
        """
        
        # Start with base efficiency (km/kWh)
        efficiency = base_efficiency
        
        # Terrain adjustment
        terrain_factors = {'Highway': 1.1, 'City': 0.85, 'Mixed': 1.0}
        efficiency *= terrain_factors[terrain]
        
        # Speed efficiency curve (optimal around 50-60 km/h)
        if avg_speed < 40:
            speed_factor = 0.85  # Stop-start reduces efficiency
        elif 50 <= avg_speed <= 70:
            speed_factor = 1.0   # Optimal
        elif 70 < avg_speed <= 90:
            speed_factor = 0.95
        elif 90 < avg_speed <= 110:
            speed_factor = 0.85
        else:
            speed_factor = 0.75  # High speed = high drag
        
        efficiency *= speed_factor
        
        # Temperature effect (optimal 20-25°C)
        temp_diff = abs(temperature - 22.5)
        temp_factor = 1 - (temp_diff * 0.008)  # ~0.8% loss per degree deviation
        efficiency *= max(temp_factor, 0.7)  # Minimum 70% efficiency
        
        # AC/Heater usage
        if ac_usage == 'On':
            if temperature > 35 or temperature < 10:
                efficiency *= 0.80  # 20% reduction in extreme weather
            else:
                efficiency *= 0.90  # 10% reduction in moderate weather
        
        # Driving style impact
        style_factors = {'Eco': 1.15, 'Moderate': 1.0, 'Aggressive': 0.75}
        efficiency *= style_factors[driving_style]
        
        # Payload effect (roughly 1% per 50kg)
        payload_factor = 1 - (payload / 5000)
        efficiency *= max(payload_factor, 0.85)
        
        # Road condition
        road_factors = {'Good': 1.0, 'Average': 0.95, 'Poor': 0.85}
        efficiency *= road_factors[road_condition]
        
        # Traffic (mostly affects city driving)
        traffic_factors = {'Light': 1.0, 'Moderate': 0.95, 'Heavy': 0.85}
        efficiency *= traffic_factors[traffic]
        
        # Elevation (uphill reduces range, downhill increases via regen)
        if elevation_change > 0:  # Uphill
            elevation_factor = 1 - (elevation_change / 10000)  # Simplified
            efficiency *= max(elevation_factor, 0.7)
        else:  # Downhill - regenerative braking benefit
            elevation_factor = 1 + (abs(elevation_change) / 20000)
            efficiency *= min(elevation_factor, 1.15)
        
        # Available energy
        available_energy = battery_capacity * (current_soc / 100)
        
        # Calculate range
        range_km = available_energy * efficiency
        
        # Add small random variation (±5%)
        noise = np.random.uniform(0.95, 1.05)
        range_km *= noise
        
        # Ensure positive and realistic
        range_km = max(5, min(range_km, 800))
        
        return round(range_km, 2)
    
    def generate_station_data(self, n_stations: int = 5000) -> pd.DataFrame:
        """
        Generate Indian EV charging station dataset
        """
        
        data = []
        
        # Coordinates for major Indian cities (rough center points)
        city_coords = {
            'Mumbai': (19.0760, 72.8777),
            'Delhi': (28.7041, 77.1025),
            'Bangalore': (12.9716, 77.5946),
            'Hyderabad': (17.3850, 78.4867),
            'Chennai': (13.0827, 80.2707),
            'Kolkata': (22.5726, 88.3639),
            'Pune': (18.5204, 73.8567),
            'Ahmedabad': (23.0225, 72.5714),
            'Jaipur': (26.9124, 75.7873),
            'Lucknow': (26.8467, 80.9462)
        }
        
        station_types = ['Public', 'Semi-Public', 'Private']
        connector_types = ['Type 2', 'CCS2', 'CHAdeMO', 'Bharat AC001', 'Bharat DC001']
        operators = ['Tata Power', 'Ather Grid', 'Fortum', 'Magenta', 'Reliance BP', 
                     'ChargeZone', 'EESL', 'Other']
        
        for i in range(n_stations):
            city = np.random.choice(list(city_coords.keys()))
            base_lat, base_lng = city_coords[city]
            
            # Random offset for location (within ~50km radius)
            lat = base_lat + np.random.uniform(-0.5, 0.5)
            lng = base_lng + np.random.uniform(-0.5, 0.5)
            
            station_type = np.random.choice(station_types, p=[0.6, 0.3, 0.1])
            
            # Power rating based on station type
            if station_type == 'Public':
                power_kw = np.random.choice([3.3, 7.4, 22, 50, 120, 150], 
                                            p=[0.1, 0.2, 0.3, 0.25, 0.1, 0.05])
            else:
                power_kw = np.random.choice([3.3, 7.4, 22], p=[0.4, 0.4, 0.2])
            
            # Number of charging points
            num_chargers = np.random.choice([1, 2, 4, 6, 8], p=[0.3, 0.4, 0.2, 0.07, 0.03])
            
            # Connector type based on power
            if power_kw >= 50:
                connector = np.random.choice(['CCS2', 'CHAdeMO'], p=[0.7, 0.3])
            elif power_kw >= 22:
                connector = 'Type 2'
            else:
                connector = np.random.choice(['Type 2', 'Bharat AC001'], p=[0.6, 0.4])
            
            # Pricing (₹/kWh or ₹/session)
            if power_kw >= 50:
                price_per_kwh = np.random.uniform(15, 25)
            else:
                price_per_kwh = np.random.uniform(8, 15)
            
            # Operating hours
            operates_24_7 = np.random.choice([True, False], p=[0.4, 0.6])
            
            data.append({
                'Station_ID': f'ST{i+1:05d}',
                'Station_Name': f'{city} Charging Hub {i+1}',
                'City': city,
                'State': self._get_state(city),
                'Latitude': round(lat, 6),
                'Longitude': round(lng, 6),
                'Station_Type': station_type,
                'Operator': np.random.choice(operators),
                'Power_kW': power_kw,
                'Num_Chargers': num_chargers,
                'Connector_Type': connector,
                'Price_per_kWh': round(price_per_kwh, 2),
                'Operates_24_7': operates_24_7,
                'Has_Amenities': np.random.choice([True, False], p=[0.3, 0.7]),
                'Installation_Year': np.random.choice(range(2018, 2025)),
            })
        
        df = pd.DataFrame(data)
        return df
    
    def _get_state(self, city: str) -> str:
        """Map city to state"""
        state_map = {
            'Mumbai': 'Maharashtra',
            'Delhi': 'Delhi',
            'Bangalore': 'Karnataka',
            'Hyderabad': 'Telangana',
            'Chennai': 'Tamil Nadu',
            'Kolkata': 'West Bengal',
            'Pune': 'Maharashtra',
            'Ahmedabad': 'Gujarat',
            'Jaipur': 'Rajasthan',
            'Lucknow': 'Uttar Pradesh'
        }
        return state_map.get(city, 'Unknown')


if __name__ == '__main__':
    # Generate datasets
    generator = EVDataGenerator(seed=42)
    
    print("Generating EV consumption dataset...")
    consumption_df = generator.generate_consumption_data(n_samples=20000)
    
    os.makedirs('../data/processed', exist_ok=True)
    consumption_df.to_csv('../data/processed/ev_consumption_synthetic.csv', index=False)
    print(f"✓ Generated {len(consumption_df)} consumption records")
    print(f"  Saved to: data/processed/ev_consumption_synthetic.csv")
    
    print("\nGenerating charging station dataset...")
    stations_df = generator.generate_station_data(n_stations=5000)
    stations_df.to_csv('../data/processed/indian_ev_stations_synthetic.csv', index=False)
    print(f"✓ Generated {len(stations_df)} stations")
    print(f"  Saved to: data/processed/indian_ev_stations_synthetic.csv")
    
    # Display sample statistics
    print("\n" + "="*60)
    print("CONSUMPTION DATASET STATISTICS")
    print("="*60)
    print(consumption_df.describe())
    print("\nTerrain Distribution:")
    print(consumption_df['Terrain'].value_counts())
    print("\nEV Model Distribution:")
    print(consumption_df['EV_Model'].value_counts())
    
    print("\n" + "="*60)
    print("STATION DATASET STATISTICS")
    print("="*60)
    print(stations_df.describe())
    print("\nCity Distribution:")
    print(stations_df['City'].value_counts())