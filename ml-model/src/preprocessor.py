"""
Data preprocessing and feature engineering
"""

import pandas as pd
import numpy as np
from sklearn.preprocessing import StandardScaler
from sklearn.model_selection import train_test_split
import joblib
from typing import Tuple, Dict

class EVDataPreprocessor:
    def __init__(self):
        self.scaler = StandardScaler()
        self.feature_names = []
        self.target_name = 'Range_km'
        
    def prepare_features(self, df: pd.DataFrame, fit: bool = True) -> Tuple[pd.DataFrame, pd.Series]:
        """
        Prepare features from raw dataframe
        """
        
        df_processed = df.copy()
        
        # Extract target
        y = df_processed[self.target_name] if self.target_name in df_processed.columns else None
        
        features = pd.DataFrame()
        
        # ===== Numerical Features =====
        if 'Battery_Capacity_kWh' in df_processed.columns:
            features['battery_capacity_kwh'] = df_processed['Battery_Capacity_kWh']
        
        if 'Current_SoC_%' in df_processed.columns:
            features['current_soc_pct'] = df_processed['Current_SoC_%']
            features['current_soc_normalized'] = df_processed['Current_SoC_%'] / 100.0
        
        if 'Avg_Speed_kmh' in df_processed.columns:
            features['avg_speed_kmh'] = df_processed['Avg_Speed_kmh']
        
        if 'Temperature_C' in df_processed.columns:
            features['temperature_c'] = df_processed['Temperature_C']
        
        # Available energy (most important feature)
        if 'Battery_Capacity_kWh' in df_processed.columns and 'Current_SoC_%' in df_processed.columns:
            features['available_energy_kwh'] = (
                df_processed['Battery_Capacity_kWh'] * 
                df_processed['Current_SoC_%'] / 100.0
            )
        
        # ===== Categorical Features (One-Hot Encoding) =====
        
        # Terrain
        if 'Terrain' in df_processed.columns:
            terrain_dummies = pd.get_dummies(df_processed['Terrain'], prefix='terrain')
            features = pd.concat([features, terrain_dummies], axis=1)
        
        # AC Usage
        if 'AC_Usage' in df_processed.columns:
            features['ac_on'] = (df_processed['AC_Usage'].astype(str).str.lower().isin(['on', 'yes', '1', 'true'])).astype(int)
        
        # Driving Style
        if 'Driving_Style' in df_processed.columns:
            driving_dummies = pd.get_dummies(df_processed['Driving_Style'], prefix='driving')
            features = pd.concat([features, driving_dummies], axis=1)
        
        # ===== Interaction Features =====
        if 'avg_speed_kmh' in features.columns and 'terrain_Highway' in features.columns:
            features['speed_terrain_highway'] = (
                features['avg_speed_kmh'] * 
                features.get('terrain_Highway', 0)
            )
        
        if 'temperature_c' in features.columns and 'ac_on' in features.columns:
            features['temp_ac_interaction'] = (
                features['temperature_c'] * 
                features['ac_on']
            )
        
        # Speed deviation from optimal (60 km/h)
        if 'avg_speed_kmh' in features.columns:
            features['speed_deviation_from_optimal'] = np.abs(features['avg_speed_kmh'] - 60)
        
        # Temperature deviation from optimal (22.5°C)
        if 'temperature_c' in features.columns:
            features['temp_deviation_from_optimal'] = np.abs(features['temperature_c'] - 22.5)
        
        # Store feature names
        if fit:
            self.feature_names = features.columns.tolist()
        
        # Ensure all expected features exist
        for col in self.feature_names:
            if col not in features.columns:
                features[col] = 0
        
        # Reorder columns to match training order
        features = features[self.feature_names]
        
        return features, y
    
    def fit_transform(self, df: pd.DataFrame) -> Tuple[np.ndarray, np.ndarray]:
        """Fit preprocessor and transform data"""
        X, y = self.prepare_features(df, fit=True)
        X_scaled = self.scaler.fit_transform(X)
        return X_scaled, y.values
    
    def transform(self, df: pd.DataFrame) -> np.ndarray:
        """Transform data using fitted preprocessor"""
        X, _ = self.prepare_features(df, fit=False)
        X_scaled = self.scaler.transform(X)
        return X_scaled
    
    def save(self, filepath: str):
        """Save preprocessor"""
        joblib.dump({
            'scaler': self.scaler,
            'feature_names': self.feature_names
        }, filepath)
        print(f"✓ Preprocessor saved to {filepath}")
    
    def load(self, filepath: str):
        """Load preprocessor"""
        data = joblib.load(filepath)
        self.scaler = data['scaler']
        self.feature_names = data['feature_names']
        print(f"✓ Preprocessor loaded from {filepath}")