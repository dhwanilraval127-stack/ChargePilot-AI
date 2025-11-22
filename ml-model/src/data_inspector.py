"""
Inspect and validate your CSV datasets
"""

import pandas as pd
import numpy as np
import sys
import os

# Add parent directory to path for imports
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

try:
    import matplotlib
    matplotlib.use('Agg')  # Use non-interactive backend
    import matplotlib.pyplot as plt
    import seaborn as sns
    HAS_PLOTTING = True
except ImportError:
    HAS_PLOTTING = False
    print("⚠️  matplotlib/seaborn not installed. Skipping visualizations.")

class DatasetInspector:
    def __init__(self):
        self.consumption_df = None
        self.stations_df = None
    
    def load_datasets(self, consumption_path: str, stations_path: str):
        """Load both datasets"""
        
        print("="*70)
        print("LOADING DATASETS")
        print("="*70)
        
        # Load consumption data
        print(f"\n📁 Loading: {consumption_path}")
        self.consumption_df = pd.read_csv(consumption_path)
        print(f"✓ Loaded {len(self.consumption_df)} rows, {len(self.consumption_df.columns)} columns")
        
        # Load stations data
        print(f"\n📁 Loading: {stations_path}")
        self.stations_df = pd.read_csv(stations_path)
        print(f"✓ Loaded {len(self.stations_df)} rows, {len(self.stations_df.columns)} columns")
    
    def inspect_consumption_data(self):
        """Detailed inspection of consumption dataset"""
        
        print("\n" + "="*70)
        print("EV CONSUMPTION DATASET ANALYSIS")
        print("="*70)
        
        df = self.consumption_df
        
        # Basic info
        print(f"\n📋 Dataset Shape: {df.shape}")
        print(f"\n📋 Column Names:")
        for i, col in enumerate(df.columns, 1):
            dtype = df[col].dtype
            null_count = df[col].isnull().sum()
            null_pct = (null_count / len(df)) * 100
            print(f"  {i}. {col:30s} | Type: {str(dtype):10s} | Nulls: {null_count:5d} ({null_pct:5.2f}%)")
        
        # Statistical summary
        print(f"\n📊 Statistical Summary:")
        print(df.describe())
        
        # Missing values
        print(f"\n⚠️  Missing Values:")
        missing = df.isnull().sum()
        if missing.sum() > 0:
            print(missing[missing > 0])
        else:
            print("  No missing values ✓")
        
        # Sample rows
        print(f"\n📄 First 5 Rows:")
        print(df.head())
        
        return df
    
    def inspect_stations_data(self):
        """Detailed inspection of stations dataset"""
        
        print("\n" + "="*70)
        print("INDIAN EV STATIONS DATASET ANALYSIS")
        print("="*70)
        
        df = self.stations_df
        
        # Basic info
        print(f"\n📋 Dataset Shape: {df.shape}")
        print(f"\n📋 Column Names:")
        for i, col in enumerate(df.columns, 1):
            dtype = df[col].dtype
            null_count = df[col].isnull().sum()
            null_pct = (null_count / len(df)) * 100
            unique_count = df[col].nunique()
            print(f"  {i}. {col:30s} | Type: {str(dtype):10s} | Nulls: {null_count:5d} ({null_pct:5.2f}%) | Unique: {unique_count}")
        
        # Statistical summary
        print(f"\n📊 Statistical Summary:")
        print(df.describe())
        
        # Sample rows
        print(f"\n📄 First 5 Rows:")
        print(df.head())
        
        return df
    
    def create_column_mapping(self):
        """Display expected column mappings"""
        
        print("\n" + "="*70)
        print("COLUMN MAPPING REFERENCE")
        print("="*70)
        
        print("\n🔧 Expected columns for Consumption Dataset:")
        print("  - Battery_Capacity_kWh (or similar)")
        print("  - Current_SoC_% (State of Charge)")
        print("  - Avg_Speed_kmh")
        print("  - Temperature_C")
        print("  - Terrain (Highway/City/Mixed)")
        print("  - AC_Usage (On/Off)")
        print("  - Driving_Style (Eco/Moderate/Aggressive)")
        print("  - Range_km (TARGET - actual range achieved)")
        
        print("\n🔧 Expected columns for Stations Dataset:")
        print("  - Station_Name")
        print("  - Latitude")
        print("  - Longitude")
        print("  - City")
        print("  - State")
    
    def visualize_consumption_data(self, output_dir='../reports'):
        """Create visualizations of consumption data"""
        
        if not HAS_PLOTTING:
            print("\n⚠️  Skipping visualizations (matplotlib not available)")
            return
        
        os.makedirs(output_dir, exist_ok=True)
        
        df = self.consumption_df
        numeric_cols = df.select_dtypes(include=[np.number]).columns.tolist()
        
        if len(numeric_cols) > 0:
            try:
                fig, axes = plt.subplots(2, 2, figsize=(15, 12))
                fig.suptitle('EV Consumption Data Overview', fontsize=16)
                
                # Distribution of first numeric column
                axes[0, 0].hist(df[numeric_cols[0]].dropna(), bins=50, edgecolor='black')
                axes[0, 0].set_title(f'Distribution of {numeric_cols[0]}')
                axes[0, 0].set_xlabel(numeric_cols[0])
                axes[0, 0].set_ylabel('Frequency')
                
                # Correlation heatmap
                if len(numeric_cols) > 1:
                    corr = df[numeric_cols[:10]].corr()  # Limit to 10 columns
                    sns.heatmap(corr, annot=True, fmt='.2f', ax=axes[0, 1], cmap='coolwarm')
                    axes[0, 1].set_title('Correlation Matrix')
                
                # Box plot
                if len(numeric_cols) <= 6:
                    df[numeric_cols].boxplot(ax=axes[1, 0], rot=45)
                    axes[1, 0].set_title('Box Plots of Numeric Features')
                
                # Missing values
                missing = df.isnull().sum()
                if missing.sum() > 0:
                    missing[missing > 0].plot(kind='bar', ax=axes[1, 1])
                    axes[1, 1].set_title('Missing Values by Column')
                    axes[1, 1].set_ylabel('Count')
                
                plt.tight_layout()
                output_path = os.path.join(output_dir, 'consumption_overview.png')
                plt.savefig(output_path, dpi=300, bbox_inches='tight')
                print(f"\n✓ Visualization saved to {output_path}")
                plt.close()
            except Exception as e:
                print(f"\n⚠️  Could not create visualizations: {e}")
    
    def generate_report(self, output_dir='../reports'):
        """Generate comprehensive data quality report"""
        
        os.makedirs(output_dir, exist_ok=True)
        
        report = []
        report.append("="*70)
        report.append("DATA QUALITY REPORT - ChargePilot AI")
        report.append("="*70)
        report.append("")
        
        # Consumption data report
        report.append("1. EV CONSUMPTION DATASET")
        report.append("-"*70)
        df = self.consumption_df
        report.append(f"Total Rows: {len(df)}")
        report.append(f"Total Columns: {len(df.columns)}")
        report.append(f"Memory Usage: {df.memory_usage(deep=True).sum() / 1024**2:.2f} MB")
        report.append("")
        report.append("Columns:")
        for col in df.columns:
            report.append(f"  - {col} ({df[col].dtype})")
        report.append("")
        
        # Stations data report
        report.append("2. INDIAN EV STATIONS DATASET")
        report.append("-"*70)
        df = self.stations_df
        report.append(f"Total Rows: {len(df)}")
        report.append(f"Total Columns: {len(df.columns)}")
        report.append(f"Memory Usage: {df.memory_usage(deep=True).sum() / 1024**2:.2f} MB")
        report.append("")
        report.append("Columns:")
        for col in df.columns:
            report.append(f"  - {col} ({df[col].dtype})")
        
        report_text = "\n".join(report)
        
        # Save report
        report_path = os.path.join(output_dir, 'data_quality_report.txt')
        with open(report_path, 'w') as f:
            f.write(report_text)
        
        print(f"\n✓ Report saved to {report_path}")
        
        return report_text


if __name__ == '__main__':
    from config import CONSUMPTION_RAW_CSV, STATIONS_RAW_CSV, REPORTS_DIR
    
    inspector = DatasetInspector()
    inspector.load_datasets(
        str(CONSUMPTION_RAW_CSV), 
        str(STATIONS_RAW_CSV)
    )
    
    # Inspect both datasets
    inspector.inspect_consumption_data()
    inspector.inspect_stations_data()
    
    # Create mapping helper
    inspector.create_column_mapping()
    
    # Generate visualizations
    inspector.visualize_consumption_data(str(REPORTS_DIR))
    
    # Generate report
    inspector.generate_report(str(REPORTS_DIR))
    
    print("\n" + "="*70)
    print("✅ INSPECTION COMPLETE")
    print("="*70)