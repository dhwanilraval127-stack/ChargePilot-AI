"""
Central configuration for all file paths
"""

import os
from pathlib import Path

# Base directories
BASE_DIR = Path(__file__).parent  # ml-model folder
PROJECT_ROOT = BASE_DIR.parent     # ChargePilot AI folder

# Data directories - USING YOUR ACTUAL LOCATION
DATA_DIR = PROJECT_ROOT / 'data'   # D:\ChargePilot AI\data
RAW_DATA_DIR = DATA_DIR / 'raw'    # D:\ChargePilot AI\data\raw
PROCESSED_DATA_DIR = DATA_DIR / 'processed'

# Model and reports stay in ml-model folder
MODELS_DIR = BASE_DIR / 'models'
REPORTS_DIR = BASE_DIR / 'reports'

# Create directories if they don't exist
for dir_path in [RAW_DATA_DIR, PROCESSED_DATA_DIR, MODELS_DIR, REPORTS_DIR]:
    dir_path.mkdir(parents=True, exist_ok=True)

# ========================================
# CSV FILES - NOW POINTING TO YOUR LOCATION
# ========================================

# Raw data files (INPUT - your original CSV files)
CONSUMPTION_RAW_CSV = RAW_DATA_DIR / 'ev_consumption.csv'
STATIONS_RAW_CSV = RAW_DATA_DIR / 'indian_ev_stations.csv'

# Processed data files (OUTPUT - will be created automatically)
CONSUMPTION_CLEAN_CSV = PROCESSED_DATA_DIR / 'ev_consumption_clean.csv'
STATIONS_CLEAN_CSV = PROCESSED_DATA_DIR / 'indian_ev_stations_clean.csv'

# Model output paths
MODEL_OUTPUT_DIR = MODELS_DIR / 'production'
MODEL_NEURAL_DIR = MODEL_OUTPUT_DIR / 'neural'
MODEL_RF_DIR = MODEL_OUTPUT_DIR / 'random_forest'

# Reports
DATA_QUALITY_REPORT = REPORTS_DIR / 'data_quality_report.txt'
COLUMN_MAPPING_JSON = PROCESSED_DATA_DIR / 'column_mappings.json'
VISUALIZATION_PNG = REPORTS_DIR / 'consumption_overview.png'

# Model artifacts
PREPROCESSOR_FILE = MODEL_OUTPUT_DIR / 'preprocessor.pkl'
METRICS_FILE = MODEL_OUTPUT_DIR / 'metrics.json'
METADATA_FILE = MODEL_OUTPUT_DIR / 'metadata.json'


def print_config():
    """Print current configuration"""
    print("="*70)
    print("CHARGEPILOT AI - FILE PATHS CONFIGURATION")
    print("="*70)
    print(f"\n📂 Project Root:    {PROJECT_ROOT}")
    print(f"📂 ML Model Dir:    {BASE_DIR}")
    print(f"📂 Data Directory:  {DATA_DIR}")
    
    print(f"\n📥 INPUT FILES (Your Location):")
    print(f"  Consumption CSV: {CONSUMPTION_RAW_CSV}")
    print(f"  Stations CSV:    {STATIONS_RAW_CSV}")
    
    print(f"\n📤 OUTPUT FILES:")
    print(f"  Cleaned Consumption: {CONSUMPTION_CLEAN_CSV}")
    print(f"  Cleaned Stations:    {STATIONS_CLEAN_CSV}")
    print(f"  Model Directory:     {MODEL_OUTPUT_DIR}")
    print(f"  Reports Directory:   {REPORTS_DIR}")
    
    # Check if files exist
    print(f"\n✅ FILE STATUS:")
    
    consumption_exists = CONSUMPTION_RAW_CSV.exists()
    stations_exists = STATIONS_RAW_CSV.exists()
    
    print(f"  Consumption CSV exists: {'✓ YES' if consumption_exists else '✗ NO - PLEASE ADD FILE'}")
    if consumption_exists:
        size_mb = CONSUMPTION_RAW_CSV.stat().st_size / (1024 * 1024)
        print(f"    Size: {size_mb:.2f} MB")
    
    print(f"  Stations CSV exists:    {'✓ YES' if stations_exists else '✗ NO - PLEASE ADD FILE'}")
    if stations_exists:
        size_mb = STATIONS_RAW_CSV.stat().st_size / (1024 * 1024)
        print(f"    Size: {size_mb:.2f} MB")
    
    print("="*70)
    
    return consumption_exists and stations_exists


if __name__ == '__main__':
    all_good = print_config()
    
    if not all_good:
        print("\n⚠️  FILES NOT FOUND!")
        print("\nPlease check:")
        print(f"  1. Files are in: {RAW_DATA_DIR}")
        print(f"  2. Files are named:")
        print(f"     - ev_consumption.csv")
        print(f"     - indian_ev_stations.csv")
        
        # Show what files actually exist
        if RAW_DATA_DIR.exists():
            files = list(RAW_DATA_DIR.glob('*.csv'))
            if files:
                print(f"\n📁 Files found in {RAW_DATA_DIR}:")
                for f in files:
                    print(f"     - {f.name}")
                print("\n💡 Rename them to match the expected names above")
            else:
                print(f"\n❌ No CSV files found in {RAW_DATA_DIR}")
    else:
        print("\n✅ All files found! Ready to run pipeline.")