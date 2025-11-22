import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
import seaborn as sns
from pathlib import Path

print("=" * 80)
print("🔍 ChargePilot AI - Dataset Exploration")
print("=" * 80)

# Paths
DATA_DIR = Path('data/raw')
EV_CONSUMPTION_PATH = DATA_DIR / 'ev_consumption.csv'
EV_STATIONS_PATH = DATA_DIR / 'indian_ev_stations.csv'

# Load datasets
print("\n📂 Loading datasets...")

try:
    df_consumption = pd.read_csv(EV_CONSUMPTION_PATH)
    print(f"✅ Loaded EV Consumption: {df_consumption.shape[0]} rows, {df_consumption.shape[1]} columns")
except Exception as e:
    print(f"❌ Error loading consumption data: {e}")
    exit(1)

try:
    df_stations = pd.read_csv(EV_STATIONS_PATH)
    print(f"✅ Loaded EV Stations: {df_stations.shape[0]} rows, {df_stations.shape[1]} columns")
except Exception as e:
    print(f"❌ Error loading stations data: {e}")
    exit(1)

# Explore consumption dataset
print("\n" + "=" * 80)
print("📊 EV CONSUMPTION DATASET")
print("=" * 80)

print("\n🔹 Columns:")
print(df_consumption.columns.tolist())

print("\n🔹 Data Types:")
print(df_consumption.dtypes)

print("\n🔹 First 5 rows:")
print(df_consumption.head())

print("\n🔹 Statistical Summary:")
print(df_consumption.describe())

print("\n🔹 Missing Values:")
print(df_consumption.isnull().sum())

print("\n🔹 Unique Values per Column:")
for col in df_consumption.columns:
    unique_count = df_consumption[col].nunique()
    print(f"  {col}: {unique_count} unique values")

# Explore stations dataset
print("\n" + "=" * 80)
print("🗺️  EV STATIONS DATASET")
print("=" * 80)

print("\n🔹 Columns:")
print(df_stations.columns.tolist())

print("\n🔹 Data Types:")
print(df_stations.dtypes)

print("\n🔹 First 5 rows:")
print(df_stations.head())

print("\n🔹 Statistical Summary:")
print(df_stations.describe())

print("\n🔹 Missing Values:")
print(df_stations.isnull().sum())

print("\n🔹 Stations by State:")
if 'State' in df_stations.columns or 'state' in df_stations.columns:
    state_col = 'State' if 'State' in df_stations.columns else 'state'
    print(df_stations[state_col].value_counts().head(10))

# Save exploration results
print("\n💾 Saving exploration results...")
with open('data/exploration_report.txt', 'w', encoding='utf-8') as f:
    f.write("CONSUMPTION DATASET\n")
    f.write("=" * 80 + "\n")
    f.write(df_consumption.info(buf=None).__str__())
    f.write("\n\n")
    f.write(df_consumption.describe().to_string())
    
    f.write("\n\n\nSTATIONS DATASET\n")
    f.write("=" * 80 + "\n")
    f.write(df_stations.info(buf=None).__str__())
    f.write("\n\n")
    f.write(df_stations.describe().to_string())

print("✅ Exploration complete! Check 'data/exploration_report.txt'")