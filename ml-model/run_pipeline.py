"""
Simple one-click pipeline runner
"""

import sys
import os
from pathlib import Path

# Add current directory to path
sys.path.append(str(Path(__file__).parent))

from config import (
    CONSUMPTION_RAW_CSV,
    STATIONS_RAW_CSV,
    CONSUMPTION_CLEAN_CSV,
    STATIONS_CLEAN_CSV,
    MODEL_OUTPUT_DIR,
    REPORTS_DIR,
    print_config
)

def check_files():
    """Check if input files exist"""
    print("\n🔍 Checking files...")
    
    if not CONSUMPTION_RAW_CSV.exists():
        print(f"\n❌ ERROR: Consumption CSV not found!")
        print(f"   Expected location: {CONSUMPTION_RAW_CSV}")
        print(f"\n📝 Please place your ev_consumption.csv file in:")
        print(f"   {CONSUMPTION_RAW_CSV.parent}/")
        return False
    
    if not STATIONS_RAW_CSV.exists():
        print(f"\n❌ ERROR: Stations CSV not found!")
        print(f"   Expected location: {STATIONS_RAW_CSV}")
        print(f"\n📝 Please place your indian_ev_stations.csv file in:")
        print(f"   {STATIONS_RAW_CSV.parent}/")
        return False
    
    print("✓ Both CSV files found!")
    return True

def run_inspection():
    """Run data inspection"""
    print("\n" + "="*70)
    print("STEP 1: DATA INSPECTION")
    print("="*70)
    
    from src.data_inspector import DatasetInspector
    
    inspector = DatasetInspector()
    inspector.load_datasets(str(CONSUMPTION_RAW_CSV), str(STATIONS_RAW_CSV))
    inspector.inspect_consumption_data()
    inspector.inspect_stations_data()
    inspector.create_column_mapping()
    inspector.visualize_consumption_data(str(REPORTS_DIR))
    inspector.generate_report(str(REPORTS_DIR))
    
    print(f"\n✓ Inspection complete. Reports saved to: {REPORTS_DIR}")
    
    input("\n⏸  Press ENTER to continue to data cleaning...")

def run_cleaning():
    """Run data cleaning"""
    print("\n" + "="*70)
    print("STEP 2: DATA CLEANING")
    print("="*70)
    
    import pandas as pd
    from src.clean_real_data import RealDataCleaner
    
    cleaner = RealDataCleaner()
    
    # Load and clean
    consumption_raw = pd.read_csv(CONSUMPTION_RAW_CSV)
    stations_raw = pd.read_csv(STATIONS_RAW_CSV)
    
    consumption_clean = cleaner.clean_consumption_data(consumption_raw)
    stations_clean = cleaner.clean_stations_data(stations_raw)
    
    if consumption_clean is not None:
        consumption_clean.to_csv(CONSUMPTION_CLEAN_CSV, index=False)
        print(f"✓ Cleaned consumption saved to: {CONSUMPTION_CLEAN_CSV}")
    else:
        print("❌ Consumption cleaning failed!")
        return False
    
    if stations_clean is not None:
        stations_clean.to_csv(STATIONS_CLEAN_CSV, index=False)
        print(f"✓ Cleaned stations saved to: {STATIONS_CLEAN_CSV}")
    else:
        print("❌ Stations cleaning failed!")
        return False
    
    input("\n⏸  Press ENTER to continue to model training...")
    return True

def run_training():
    """Run model training"""
    print("\n" + "="*70)
    print("STEP 3: MODEL TRAINING")
    print("="*70)
    
    from src.trainer import EVRangeTrainer
    
    trainer = EVRangeTrainer(model_type='neural')
    X_train, X_test, y_train, y_test = trainer.load_data(str(CONSUMPTION_CLEAN_CSV))
    
    trainer.train_neural(X_train, X_test, y_train, y_test)
    metrics = trainer.evaluate(X_test, y_test)
    trainer.save_model(str(MODEL_OUTPUT_DIR))
    
    print(f"\n✓ Model saved to: {MODEL_OUTPUT_DIR}")
    return metrics

def run_testing():
    """Test the trained model"""
    print("\n" + "="*70)
    print("STEP 4: MODEL TESTING")
    print("="*70)
    
    from src.predictor import EVRangePredictor
    
    predictor = EVRangePredictor(str(MODEL_OUTPUT_DIR))
    
    # Test case
    test_input = {
        'battery_capacity_kwh': 50,
        'current_soc': 80,
        'avg_speed_kmh': 60,
        'temperature_c': 25,
        'terrain': 'Highway',
        'ac_usage': 'On',
        'driving_style': 'Moderate'
    }
    
    print("\n🧪 Test Prediction:")
    print(f"Input: {test_input}")
    
    result = predictor.predict(**test_input)
    
    print(f"\n✅ Predicted Range: {result['predicted_range_km']} km")
    print(f"   Safe Range: {result['safe_range_km']} km")
    print(f"   Confidence: {result['confidence']}")

def main():
    """Run complete pipeline"""
    
    print("="*70)
    print("🚀 CHARGEPILOT AI - COMPLETE TRAINING PIPELINE")
    print("="*70)
    
    # Show configuration
    print_config()
    
    # Check files
    if not check_files():
        return
    
    # Ask user what to run
    print("\n" + "="*70)
    print("SELECT WHAT TO RUN:")
    print("="*70)
    print("1. Complete pipeline (inspection → cleaning → training → testing)")
    print("2. Inspection only")
    print("3. Cleaning only")
    print("4. Training only")
    print("5. Testing only")
    
    choice = input("\nEnter choice (1-5): ").strip()
    
    if choice == '1':
        run_inspection()
        if run_cleaning():
            run_training()
            run_testing()
    elif choice == '2':
        run_inspection()
    elif choice == '3':
        run_cleaning()
    elif choice == '4':
        if not CONSUMPTION_CLEAN_CSV.exists():
            print("\n❌ Cleaned data not found. Run cleaning first!")
            return
        run_training()
    elif choice == '5':
        run_testing()
    else:
        print("Invalid choice!")
        return
    
    print("\n" + "="*70)
    print("✅ PIPELINE COMPLETE!")
    print("="*70)
    print(f"\n📁 Output Locations:")
    print(f"   Cleaned Data: {CONSUMPTION_CLEAN_CSV.parent}/")
    print(f"   Trained Model: {MODEL_OUTPUT_DIR}/")
    print(f"   Reports: {REPORTS_DIR}/")

if __name__ == '__main__':
    main()