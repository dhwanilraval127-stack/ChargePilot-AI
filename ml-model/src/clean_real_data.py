"""
Clean and preprocess your actual CSV datasets
Automatically detects and maps columns
"""

import pandas as pd
import numpy as np
from typing import Dict
import re
import sys
import os

# Add parent directory to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

class RealDataCleaner:
    def __init__(self):
        self.consumption_mapping = {}
        self.stations_mapping = {}
    
    def auto_detect_columns(self, df: pd.DataFrame, dataset_type: str) -> Dict[str, str]:
        """
        Automatically detect and map columns to standard names
        """
        
        columns = df.columns.tolist()
        mapping = {}
        
        if dataset_type == 'consumption':
            # Define patterns for consumption data
            patterns = {
                'Battery_Capacity_kWh': [
                    r'battery.*capacity', r'capacity.*kwh', r'battery.*kwh',
                    r'bat.*cap', r'kwh', r'capacity'
                ],
                'Current_SoC_%': [
                    r'soc', r'state.*charge', r'battery.*level', r'charge.*level',
                    r'battery.*percent', r'soc.*%', r'current.*soc'
                ],
                'Avg_Speed_kmh': [
                    r'speed', r'avg.*speed', r'average.*speed', r'velocity',
                    r'km.*h', r'kmph', r'speed.*kmh'
                ],
                'Temperature_C': [
                    r'temp', r'temperature', r'ambient.*temp', r'temp.*c',
                    r'celsius'
                ],
                'Terrain': [
                    r'terrain', r'road.*type', r'route.*type', r'driving.*condition'
                ],
                'AC_Usage': [
                    r'ac', r'air.*condition', r'hvac', r'ac.*usage', r'climate'
                ],
                'Driving_Style': [
                    r'driving.*style', r'drive.*mode', r'style', r'mode',
                    r'driving.*behavior'
                ],
                'Range_km': [
                    r'range', r'distance', r'range.*km', r'actual.*range',
                    r'achieved.*range', r'km.*range'
                ],
            }
        
        else:  # stations
            patterns = {
                'Station_Name': [
                    r'name', r'station.*name', r'title', r'location.*name'
                ],
                'Latitude': [
                    r'lat', r'latitude', r'^lat$'
                ],
                'Longitude': [
                    r'lon', r'lng', r'longitude', r'^lon$', r'^lng$'
                ],
                'City': [
                    r'city', r'town', r'location', r'area'
                ],
                'State': [
                    r'state', r'province', r'region'
                ],
            }
        
        # Match patterns
        for std_name, pattern_list in patterns.items():
            for col in columns:
                col_lower = col.lower()
                for pattern in pattern_list:
                    if re.search(pattern, col_lower):
                        mapping[std_name] = col
                        break
                if std_name in mapping:
                    break
        
        return mapping
    
    def clean_consumption_data(self, df: pd.DataFrame) -> pd.DataFrame:
        """Clean consumption dataset"""
        
        print("\n" + "="*70)
        print("CLEANING CONSUMPTION DATA")
        print("="*70)
        
        # Auto-detect columns
        mapping = self.auto_detect_columns(df, 'consumption')
        self.consumption_mapping = mapping
        
        print("\n📋 Detected Column Mapping:")
        for std_name, actual_name in mapping.items():
            print(f"  {std_name:25s} -> {actual_name}")
        
        if not mapping:
            print("\n⚠️  Warning: Could not auto-detect columns")
            return df
        
        # Create clean dataframe
        df_clean = pd.DataFrame()
        
        # Map columns
        for std_name, actual_name in mapping.items():
            if actual_name in df.columns:
                df_clean[std_name] = df[actual_name]
        
        # Ensure target column exists
        if 'Range_km' not in df_clean.columns:
            print("\n❌ Error: Target column 'Range_km' not found!")
            print("Available columns:", list(df.columns))
            return None
        
        # Remove duplicates
        before = len(df_clean)
        df_clean = df_clean.drop_duplicates()
        print(f"\n✓ Removed {before - len(df_clean)} duplicate rows")
        
        # Handle missing values
        print(f"\n🔍 Handling Missing Values:")
        
        # Fill numeric columns with median
        numeric_cols = df_clean.select_dtypes(include=[np.number]).columns
        for col in numeric_cols:
            if df_clean[col].isnull().sum() > 0:
                median_val = df_clean[col].median()
                df_clean[col].fillna(median_val, inplace=True)
                print(f"  {col}: filled {df_clean[col].isnull().sum()} nulls with median")
        
        # Fill categorical columns with mode
        categorical_cols = df_clean.select_dtypes(include=['object']).columns
        for col in categorical_cols:
            if df_clean[col].isnull().sum() > 0:
                mode_val = df_clean[col].mode()[0] if len(df_clean[col].mode()) > 0 else 'Unknown'
                df_clean[col].fillna(mode_val, inplace=True)
                print(f"  {col}: filled with mode")
        
        # Standardize categorical values
        if 'Terrain' in df_clean.columns:
            df_clean['Terrain'] = df_clean['Terrain'].astype(str).str.title()
        
        if 'AC_Usage' in df_clean.columns:
            df_clean['AC_Usage'] = df_clean['AC_Usage'].astype(str).str.title()
        
        if 'Driving_Style' in df_clean.columns:
            df_clean['Driving_Style'] = df_clean['Driving_Style'].astype(str).str.title()
        
        # Remove outliers from target column
        if 'Range_km' in df_clean.columns:
            Q1 = df_clean['Range_km'].quantile(0.01)
            Q3 = df_clean['Range_km'].quantile(0.99)
            before_outliers = len(df_clean)
            df_clean = df_clean[(df_clean['Range_km'] >= Q1) & (df_clean['Range_km'] <= Q3)]
            print(f"\n✓ Removed {before_outliers - len(df_clean)} outliers from Range_km")
        
        # Validate ranges
        if 'Current_SoC_%' in df_clean.columns:
            df_clean = df_clean[(df_clean['Current_SoC_%'] >= 0) & (df_clean['Current_SoC_%'] <= 100)]
        
        if 'Temperature_C' in df_clean.columns:
            df_clean = df_clean[(df_clean['Temperature_C'] >= -20) & (df_clean['Temperature_C'] <= 60)]
        
        print(f"\n✅ Final dataset: {len(df_clean)} rows, {len(df_clean.columns)} columns")
        
        return df_clean
    
    def clean_stations_data(self, df: pd.DataFrame) -> pd.DataFrame:
        """Clean stations dataset"""
        
        print("\n" + "="*70)
        print("CLEANING STATIONS DATA")
        print("="*70)
        
        # Auto-detect columns
        mapping = self.auto_detect_columns(df, 'stations')
        self.stations_mapping = mapping
        
        print("\n📋 Detected Column Mapping:")
        for std_name, actual_name in mapping.items():
            print(f"  {std_name:25s} -> {actual_name}")
        
        if not mapping:
            print("\n⚠️  Warning: Could not auto-detect columns")
            return df
        
        # Create clean dataframe
        df_clean = pd.DataFrame()
        
        # Map columns
        for std_name, actual_name in mapping.items():
            if actual_name in df.columns:
                df_clean[std_name] = df[actual_name]
        
        # Validate essential columns
        essential = ['Station_Name', 'Latitude', 'Longitude']
        missing_essential = [col for col in essential if col not in df_clean.columns]
        
        if missing_essential:
            print(f"\n❌ Error: Missing essential columns: {missing_essential}")
            return None
        
        # Remove duplicates based on coordinates
        before = len(df_clean)
        df_clean = df_clean.drop_duplicates(subset=['Latitude', 'Longitude'])
        print(f"\n✓ Removed {before - len(df_clean)} duplicate stations")
        
        # Validate coordinates
        df_clean = df_clean[
            (df_clean['Latitude'].between(-90, 90)) &
            (df_clean['Longitude'].between(-180, 180))
        ]
        
        # Add Firebase fields
        df_clean['health_score'] = 100
        df_clean['is_verified'] = False
        df_clean['source'] = 'dataset'
        
        # Generate station IDs
        df_clean['Station_ID'] = ['ST' + str(i).zfill(6) for i in range(len(df_clean))]
        
        print(f"\n✅ Final dataset: {len(df_clean)} stations, {len(df_clean.columns)} columns")
        
        return df_clean


if __name__ == '__main__':
    from config import (
        CONSUMPTION_RAW_CSV, 
        STATIONS_RAW_CSV,
        CONSUMPTION_CLEAN_CSV,
        STATIONS_CLEAN_CSV,
        COLUMN_MAPPING_JSON
    )
    import json
    
    # Initialize cleaner
    cleaner = RealDataCleaner()
    
    # Load raw data
    print(f"Loading from: {CONSUMPTION_RAW_CSV}")
    consumption_raw = pd.read_csv(CONSUMPTION_RAW_CSV)
    
    print(f"Loading from: {STATIONS_RAW_CSV}")
    stations_raw = pd.read_csv(STATIONS_RAW_CSV)
    
    # Clean consumption data
    consumption_clean = cleaner.clean_consumption_data(consumption_raw)
    if consumption_clean is not None:
        consumption_clean.to_csv(CONSUMPTION_CLEAN_CSV, index=False)
        print(f"\n✓ Saved to: {CONSUMPTION_CLEAN_CSV}")
    
    # Clean stations data
    stations_clean = cleaner.clean_stations_data(stations_raw)
    if stations_clean is not None:
        stations_clean.to_csv(STATIONS_CLEAN_CSV, index=False)
        print(f"✓ Saved to: {STATIONS_CLEAN_CSV}")
    
    # Save column mappings
    with open(COLUMN_MAPPING_JSON, 'w') as f:
        json.dump({
            'consumption': cleaner.consumption_mapping,
            'stations': cleaner.stations_mapping
        }, f, indent=2)
    print(f"✓ Saved mappings to: {COLUMN_MAPPING_JSON}")
    
    print("\n" + "="*70)
    print("✅ DATA CLEANING COMPLETE")
    print("="*70)