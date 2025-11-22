from flask import Flask, request, jsonify
from flask_cors import CORS
import joblib
import numpy as np
import pandas as pd
import os
from pathlib import Path
from dotenv import load_dotenv
import json

load_dotenv()

app = Flask(__name__)
CORS(app)

# Paths
BASE_DIR = Path(__file__).resolve().parent.parent
MODELS_DIR = BASE_DIR / 'models'

# Load model metadata
with open(MODELS_DIR / 'model_metadata.json', 'r') as f:
    metadata = json.load(f)

# Load model
model_type = metadata['best_model']
if model_type == "Ensemble":
    print("📦 Loading ensemble model...")
    model_data = joblib.load(MODELS_DIR / 'ensemble_model.pkl')
    MODEL_TYPE = 'ensemble'
else:
    print(f"📦 Loading {model_type} model...")
    model = joblib.load(MODELS_DIR / 'battery_model.pkl')
    MODEL_TYPE = 'single'

# Load scaler and feature info
scaler = joblib.load(MODELS_DIR / 'scaler.pkl')
feature_info = joblib.load(MODELS_DIR / 'feature_info.pkl')

print("✅ Model loaded successfully!")
print(f"   Type: {MODEL_TYPE}")
print(f"   Accuracy: {metadata['accuracy']:.2f}%")
print(f"   Features: {metadata['n_features']}")

# Constants
SAFETY_BUFFER = 0.15

def prepare_features(data):
    """Prepare input features for prediction"""
    # This is a simplified version - adjust based on your actual features
    features = {}
    
    # Extract from input
    battery_capacity = float(data.get('battery_capacity_kwh', 50))
    avg_speed = float(data.get('avg_speed_kmh', 60))
    temperature = float(data.get('temperature_celsius', 25))
    ac_usage = 1 if data.get('ac_usage', False) else 0
    
    terrain_map = {'flat': 0, 'mixed': 1, 'hilly': 2}
    terrain = terrain_map.get(data.get('terrain', 'flat'), 0)
    
    mode_map = {'eco': 0, 'normal': 1, 'sport': 2}
    driving_mode = mode_map.get(data.get('driving_mode', 'normal'), 1)
    
    # Build feature dict based on training features
    # Adjust these to match your actual dataset columns
    feature_names = feature_info['feature_names']
    
    # Create feature vector
    feature_vector = []
    for feat in feature_names:
        if 'speed' in feat.lower():
            if 'squared' in feat.lower():
                feature_vector.append(avg_speed ** 2)
            else:
                feature_vector.append(avg_speed)
        elif 'temp' in feat.lower():
            if 'deviation' in feat.lower():
                feature_vector.append(abs(temperature - 25))
            else:
                feature_vector.append(temperature)
        elif 'battery' in feat.lower() or 'capacity' in feat.lower():
            feature_vector.append(battery_capacity)
        elif 'ac' in feat.lower():
            feature_vector.append(ac_usage)
        elif 'terrain' in feat.lower():
            feature_vector.append(terrain)
        elif 'mode' in feat.lower() or 'driving' in feat.lower():
            feature_vector.append(driving_mode)
        else:
            # Default value for unknown features
            feature_vector.append(0)
    
    return np.array([feature_vector])

def predict_consumption(features_scaled):
    """Make prediction using loaded model"""
    if MODEL_TYPE == 'ensemble':
        # Ensemble prediction
        predictions = []
        for model_name, weight in zip(model_data['models'], model_data['weights']):
            model = model_data['trained_models'][model_name]
            pred = model.predict(features_scaled)[0]
            predictions.append(weight * pred)
        return sum(predictions)
    else:
        return model.predict(features_scaled)[0]

@app.route('/health', methods=['GET'])
def health():
    return jsonify({
        "status": "healthy",
        "model_type": MODEL_TYPE,
        "accuracy": metadata['accuracy'],
        "features": metadata['n_features']
    }), 200

@app.route('/api/predict-range', methods=['POST'])
def predict_range():
    try:
        data = request.get_json()
        
        battery_pct = float(data.get('battery_percentage', 100))
        battery_capacity = float(data.get('battery_capacity_kwh', 50))
        
        # Prepare features
        features = prepare_features(data)
        features_scaled = scaler.transform(features)
        
        # Predict consumption
        predicted_consumption = predict_consumption(features_scaled)
        
        # Calculate range
        available_energy_kwh = (battery_pct / 100) * battery_capacity
        predicted_range_km = (available_energy_kwh / predicted_consumption)
        safe_range_km = predicted_range_km * (1 - SAFETY_BUFFER)
        
        return jsonify({
            "success": True,
            "predicted_range_km": round(safe_range_km, 2),
            "max_range_km": round(predicted_range_km, 2),
            "consumption_kwh_per_100km": round(predicted_consumption * 100, 2),
            "available_energy_kwh": round(available_energy_kwh, 2),
            "safety_buffer_percent": SAFETY_BUFFER * 100,
            "model_accuracy": metadata['accuracy']
        }), 200
        
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 400

@app.route('/api/recommend-charge', methods=['POST'])
def recommend_charge():
    try:
        data = request.get_json()
        
        distance_needed = float(data.get('distance_to_destination_km', 0))
        battery_capacity = float(data.get('battery_capacity_kwh', 50))
        current_pct = float(data.get('current_battery_pct', 100))
        
        # Prepare features
        features = prepare_features(data)
        features_scaled = scaler.transform(features)
        
        # Predict consumption
        predicted_consumption = predict_consumption(features_scaled)
        
        # Energy needed
        energy_needed_kwh = (distance_needed * predicted_consumption) / (1 - SAFETY_BUFFER)
        required_battery_pct = min((energy_needed_kwh / battery_capacity) * 100, 100)
        charge_needed_pct = max(0, required_battery_pct - current_pct)
        
        # Charging time (50kW charger)
        charger_power_kw = 50
        energy_to_add = (charge_needed_pct / 100) * battery_capacity
        charging_time_minutes = (energy_to_add / charger_power_kw) * 60
        
        # Cost (₹20/kWh)
        estimated_cost = energy_to_add * 20
        
        return jsonify({
            "success": True,
            "is_reachable": current_pct >= required_battery_pct,
            "current_battery_pct": current_pct,
            "required_battery_pct": round(required_battery_pct, 1),
            "charge_needed_pct": round(charge_needed_pct, 1),
            "estimated_charging_time_minutes": round(charging_time_minutes, 1),
            "energy_needed_kwh": round(energy_needed_kwh, 2),
            "estimated_cost_inr": round(estimated_cost, 2),
            "model_accuracy": metadata['accuracy']
        }), 200
        
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 400

@app.route('/api/model-info', methods=['GET'])
def model_info():
    return jsonify({
        "model_type": MODEL_TYPE,
        "best_model": metadata['best_model'],
        "accuracy_percent": metadata['accuracy'],
        "r2_score": metadata['test_r2'],
        "n_features": metadata['n_features'],
        "trained_at": metadata['timestamp']
    }), 200


# Add backward compatibility endpoints
@app.route('/predict', methods=['POST'])
def predict():
    """Backward compatibility with /predict endpoint"""
    try:
        data = request.get_json()
        
        # Map old parameters to new structure
        mapped_data = {
            'battery_percentage': data.get('battery_percent', 100),
            'battery_capacity_kwh': data.get('battery_capacity', 50),
            'avg_speed_kmh': data.get('speed', 60),
            'temperature_celsius': data.get('temperature', 25),
            'ac_usage': data.get('temperature', 25) > 30,  # Enable AC if hot
            'terrain': 'flat',
            'driving_mode': 'normal'
        }
        
        # Use the predict-range endpoint
        return predict_range_internal(mapped_data)
        
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 400

def predict_range_internal(data):
    """Internal function for range prediction"""
    try:
        battery_pct = float(data.get('battery_percentage', 100))
        battery_capacity = float(data.get('battery_capacity_kwh', 50))
        
        # Prepare features
        features = prepare_features(data)
        features_scaled = scaler.transform(features)
        
        # Predict consumption
        predicted_consumption = predict_consumption(features_scaled)
        
        # Calculate range
        available_energy_kwh = (battery_pct / 100) * battery_capacity
        predicted_range_km = (available_energy_kwh / predicted_consumption)
        safe_range_km = predicted_range_km * (1 - SAFETY_BUFFER)
        
        return jsonify({
            "success": True,
            "predicted_range": round(safe_range_km, 2),
            "max_range_km": round(predicted_range_km, 2),
            "battery_percent": battery_pct,
            "method": "trained_model",
            "conditions": {
                "temperature": data.get('temperature_celsius', 25),
                "speed": data.get('avg_speed_kmh', 60)
            }
        }), 200
        
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 400

@app.route('/recommend-charging', methods=['POST'])
def recommend_charging():
    """Backward compatibility endpoint"""
    try:
        data = request.get_json()
        
        # Map parameters
        mapped_data = {
            'distance_to_destination_km': data.get('distance_remaining', 0),
            'battery_capacity_kwh': data.get('battery_capacity', 50),
            'current_battery_pct': data.get('current_soc', 100),
            'avg_speed_kmh': 60,
            'temperature_celsius': data.get('temperature', 25),
            'ac_usage': False,
            'terrain': 'flat',
            'driving_mode': 'normal'
        }
        
        distance_needed = float(mapped_data.get('distance_to_destination_km', 0))
        battery_capacity = float(mapped_data.get('battery_capacity_kwh', 50))
        current_pct = float(mapped_data.get('current_battery_pct', 100))
        charger_power = float(data.get('charger_power', 50))
        
        # Prepare features
        features = prepare_features(mapped_data)
        features_scaled = scaler.transform(features)
        
        # Predict consumption
        predicted_consumption = predict_consumption(features_scaled)
        
        # Energy needed
        energy_needed_kwh = (distance_needed * predicted_consumption) / (1 - SAFETY_BUFFER)
        required_battery_pct = min((energy_needed_kwh / battery_capacity) * 100, 100)
        charge_needed_pct = max(0, required_battery_pct - current_pct)
        
        # Charging time
        energy_to_add = (charge_needed_pct / 100) * battery_capacity
        
        # Adjust for charging curve
        if required_battery_pct > 80:
            avg_charging_speed = charger_power * 0.6
        else:
            avg_charging_speed = charger_power * 0.85
            
        charging_time_minutes = (energy_to_add / avg_charging_speed) * 60
        
        # Cost (₹15/kWh average)
        estimated_cost = energy_to_add * 15
        
        return jsonify({
            "success": True,
            "current_soc": current_pct,
            "recommended_target_soc": round(required_battery_pct, 1),
            "kwh_to_charge": round(energy_to_add, 2),
            "estimated_time_minutes": round(charging_time_minutes, 0),
            "estimated_cost": round(estimated_cost, 0),
            "distance_remaining": distance_needed,
            "safety_buffer_included": True
        }), 200
        
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 400
if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5001))  # Changed from 5000 to 5001
    print("\n" + "=" * 80)
    print("🚀 ChargePilot AI - ML Service")
    print("=" * 80)
    print(f"\n📊 Model: {metadata['best_model']}")
    print(f"📊 Accuracy: {metadata['accuracy']:.2f}%")
    print(f"\n📍 Endpoints:")
    print("   GET  /health")
    print("   GET  /api/model-info")
    print("   POST /api/predict-range")
    print("   POST /api/recommend-charge")
    print("   POST /predict (backward compatibility)")
    print("   POST /recommend-charging (backward compatibility)")
    print(f"\n✅ Server running on http://localhost:{port}")
    print("=" * 80 + "\n")
    app.run(host='0.0.0.0', port=port, debug=True)