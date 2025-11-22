"""
Model inference wrapper for production use
"""

import numpy as np
import pandas as pd
import joblib
import tensorflow as tf
from typing import Dict, Any
import os
import sys

# Import from same directory
from .preprocessor import EVDataPreprocessor

class EVRangePredictor:
    def __init__(self, model_dir: str = '../models/production'):
        """Load trained model and preprocessor"""
        
        self.model_dir = model_dir
        
        # Load preprocessor
        preprocessor_path = os.path.join(model_dir, 'preprocessor.pkl')
        
        if not os.path.exists(preprocessor_path):
            raise FileNotFoundError(f"Preprocessor not found at {preprocessor_path}")
        
        self.preprocessor = EVDataPreprocessor()
        self.preprocessor.load(preprocessor_path)
        
        # Load model - try multiple formats
        model_loaded = False
        
        # 1. Try .keras format first (new TensorFlow format)
        keras_path = os.path.join(model_dir, 'range_predictor_neural.keras')
        if os.path.exists(keras_path):
            try:
                self.model = tf.keras.models.load_model(keras_path)
                self.model_type = 'neural'
                model_loaded = True
                print(f"✓ Loaded Keras model from {keras_path}")
            except Exception as e:
                print(f"⚠️  Failed to load .keras model: {e}")
        
        # 2. Try SavedModel format
        if not model_loaded:
            saved_model_path = os.path.join(model_dir, 'range_predictor_savedmodel')
            if os.path.exists(saved_model_path):
                try:
                    self.model = tf.keras.models.load_model(saved_model_path)
                    self.model_type = 'neural'
                    model_loaded = True
                    print(f"✓ Loaded SavedModel from {saved_model_path}")
                except Exception as e:
                    print(f"⚠️  Failed to load SavedModel: {e}")
        
        # 3. Try legacy .h5 format
        if not model_loaded:
            h5_path = os.path.join(model_dir, 'range_predictor_neural.h5')
            if os.path.exists(h5_path):
                try:
                    self.model = tf.keras.models.load_model(h5_path)
                    self.model_type = 'neural'
                    model_loaded = True
                    print(f"✓ Loaded H5 model from {h5_path}")
                except Exception as e:
                    print(f"⚠️  Failed to load .h5 model: {e}")
        
        # 4. Try sklearn models
        if not model_loaded:
            for model_type in ['random_forest', 'gradient_boost']:
                model_path = os.path.join(model_dir, f'range_predictor_{model_type}.pkl')
                if os.path.exists(model_path):
                    try:
                        self.model = joblib.load(model_path)
                        self.model_type = model_type
                        model_loaded = True
                        print(f"✓ Loaded {model_type} model from {model_path}")
                        break
                    except Exception as e:
                        print(f"⚠️  Failed to load {model_type} model: {e}")
        
        if not model_loaded:
            # List available files for debugging
            available_files = os.listdir(model_dir) if os.path.exists(model_dir) else []
            raise FileNotFoundError(
                f"No compatible model found in {model_dir}\n"
                f"Available files: {available_files}\n"
                f"Expected one of:\n"
                f"  - range_predictor_neural.keras\n"
                f"  - range_predictor_savedmodel/\n"
                f"  - range_predictor_random_forest.pkl\n"
                f"  - range_predictor_gradient_boost.pkl"
            )
    
    def predict(self, 
                battery_capacity_kwh: float,
                current_soc: float,
                avg_speed_kmh: float = 60,
                temperature_c: float = 25,
                terrain: str = 'Mixed',
                ac_usage: str = 'Off',
                driving_style: str = 'Moderate',
                **kwargs) -> Dict[str, Any]:
        """
        Predict EV range
        
        Args:
            battery_capacity_kwh: Battery capacity in kWh
            current_soc: Current state of charge (0-100)
            avg_speed_kmh: Average speed in km/h
            temperature_c: Ambient temperature in Celsius
            terrain: 'Highway', 'City', or 'Mixed'
            ac_usage: 'On' or 'Off'
            driving_style: 'Eco', 'Moderate', or 'Aggressive'
            **kwargs: Additional optional parameters
            
        Returns:
            Dictionary with prediction results
        """
        
        # Create input dataframe
        input_data = pd.DataFrame([{
            'Battery_Capacity_kWh': battery_capacity_kwh,
            'Current_SoC_%': current_soc,
            'Avg_Speed_kmh': avg_speed_kmh,
            'Temperature_C': temperature_c,
            'Terrain': terrain,
            'AC_Usage': ac_usage,
            'Driving_Style': driving_style,
            'Range_km': 0  # Dummy value, will be predicted
        }])
        
        # Preprocess
        X = self.preprocessor.transform(input_data)
        
        # Predict
        prediction = self.model.predict(X, verbose=0)
        
        # Handle different output shapes
        if len(prediction.shape) > 1:
            prediction = prediction.flatten()
        
        predicted_range = float(prediction[0])
        
        # Apply safety buffer (15%)
        safe_range = predicted_range * 0.85
        
        # Determine confidence
        if predicted_range > 150:
            confidence = 'high'
        elif predicted_range > 50:
            confidence = 'medium'
        else:
            confidence = 'low'
        
        # Calculate additional metrics
        available_energy = battery_capacity_kwh * (current_soc / 100)
        soc_per_km = current_soc / predicted_range if predicted_range > 0 else 0
        
        return {
            'predicted_range_km': round(predicted_range, 2),
            'safe_range_km': round(safe_range, 2),
            'confidence': confidence,
            'battery_capacity_kwh': battery_capacity_kwh,
            'current_soc': current_soc,
            'available_energy_kwh': round(available_energy, 2),
            'soc_consumption_per_km': round(soc_per_km, 3),
            'conditions': {
                'temperature_c': temperature_c,
                'terrain': terrain,
                'avg_speed_kmh': avg_speed_kmh,
                'ac_usage': ac_usage,
                'driving_style': driving_style
            }
        }
    
    def predict_batch(self, input_list: list) -> list:
        """
        Predict for multiple inputs at once
        
        Args:
            input_list: List of dictionaries with prediction parameters
            
        Returns:
            List of prediction dictionaries
        """
        results = []
        for input_params in input_list:
            result = self.predict(**input_params)
            results.append(result)
        return results


# Quick test function
def test_predictor(model_dir: str = '../models/production'):
    """Test the predictor with sample inputs"""
    
    print("="*70)
    print("TESTING EV RANGE PREDICTOR")
    print("="*70)
    
    try:
        predictor = EVRangePredictor(model_dir)
        
        test_cases = [
            {
                'name': 'Highway - Optimal Conditions',
                'params': {
                    'battery_capacity_kwh': 50,
                    'current_soc': 80,
                    'avg_speed_kmh': 60,
                    'temperature_c': 25,
                    'terrain': 'Highway',
                    'ac_usage': 'Off',
                    'driving_style': 'Moderate'
                }
            },
            {
                'name': 'City - Hot Weather with AC',
                'params': {
                    'battery_capacity_kwh': 40,
                    'current_soc': 60,
                    'avg_speed_kmh': 35,
                    'temperature_c': 38,
                    'terrain': 'City',
                    'ac_usage': 'On',
                    'driving_style': 'Moderate'
                }
            },
            {
                'name': 'Low Battery Emergency',
                'params': {
                    'battery_capacity_kwh': 50,
                    'current_soc': 15,
                    'avg_speed_kmh': 50,
                    'temperature_c': 20,
                    'terrain': 'Mixed',
                    'ac_usage': 'Off',
                    'driving_style': 'Eco'
                }
            }
        ]
        
        for i, test in enumerate(test_cases, 1):
            print(f"\nTest Case {i}: {test['name']}")
            print("-" * 70)
            result = predictor.predict(**test['params'])
            print(f"  Predicted Range: {result['predicted_range_km']} km")
            print(f"  Safe Range: {result['safe_range_km']} km")
            print(f"  Confidence: {result['confidence']}")
            print(f"  Available Energy: {result['available_energy_kwh']} kWh")
        
        print("\n" + "="*70)
        print("✅ ALL TESTS PASSED")
        print("="*70)
        
    except Exception as e:
        print(f"\n❌ Error during testing: {e}")
        import traceback
        traceback.print_exc()


if __name__ == '__main__':
    # Run tests
    test_predictor('models/production')