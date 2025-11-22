"""
ChargePilot AI - Advanced ML Training Pipeline
Trains multiple models and selects the best performing one
Target: >95% accuracy with fast inference
"""

import pandas as pd
import numpy as np
from pathlib import Path
import joblib
import time
import warnings
warnings.filterwarnings('ignore')

# ML Libraries
from sklearn.model_selection import train_test_split, cross_val_score, KFold
from sklearn.preprocessing import StandardScaler, LabelEncoder
from sklearn.metrics import mean_squared_error, r2_score, mean_absolute_error, mean_absolute_percentage_error

# Models
from sklearn.ensemble import RandomForestRegressor, GradientBoostingRegressor, ExtraTreesRegressor
from sklearn.linear_model import Ridge, Lasso
import xgboost as xgb
import lightgbm as lgb
import catboost as cb

# Feature engineering
from sklearn.preprocessing import PolynomialFeatures

print("=" * 80)
print("🚗 ChargePilot AI - Advanced ML Training Pipeline")
print("=" * 80)

# ============================================================================
# CONFIGURATION
# ============================================================================
DATA_DIR = Path('data/raw')
PROCESSED_DIR = Path('data/processed')
MODELS_DIR = Path('models')

PROCESSED_DIR.mkdir(exist_ok=True)
MODELS_DIR.mkdir(exist_ok=True)

EV_CONSUMPTION_PATH = DATA_DIR / 'ev_consumption.csv'
RANDOM_STATE = 42
TEST_SIZE = 0.2

# ============================================================================
# 1. LOAD AND PREPROCESS DATA
# ============================================================================
print("\n📂 Loading dataset...")
df = pd.read_csv(EV_CONSUMPTION_PATH)
print(f"✅ Loaded: {df.shape[0]} rows, {df.shape[1]} columns")

print("\n🔍 Dataset columns:")
print(df.columns.tolist())

# Display first few rows
print("\n📊 First 5 rows:")
print(df.head())

# ============================================================================
# 2. DATA CLEANING AND FEATURE ENGINEERING
# ============================================================================
print("\n🧹 Data cleaning and feature engineering...")

# Make a copy
df_clean = df.copy()

# Handle missing values
print(f"Missing values before: {df_clean.isnull().sum().sum()}")
df_clean = df_clean.dropna()
print(f"Missing values after: {df_clean.isnull().sum().sum()}")

# Identify numeric and categorical columns
numeric_cols = df_clean.select_dtypes(include=[np.number]).columns.tolist()
categorical_cols = df_clean.select_dtypes(include=['object']).columns.tolist()

print(f"\nNumeric columns: {numeric_cols}")
print(f"Categorical columns: {categorical_cols}")

# Encode categorical variables
label_encoders = {}
for col in categorical_cols:
    le = LabelEncoder()
    df_clean[col + '_encoded'] = le.fit_transform(df_clean[col].astype(str))
    label_encoders[col] = le

# ============================================================================
# 3. DEFINE TARGET AND FEATURES
# ============================================================================

# Try to automatically identify target column
possible_target_names = [
    'consumption', 'energy_consumption', 'kwh_per_km', 'efficiency',
    'Energy_Consumption', 'Consumption', 'kWh/km', 'energy', 'kwh'
]

target_col = None
for col in df_clean.columns:
    for possible_name in possible_target_names:
        if possible_name.lower() in col.lower():
            target_col = col
            break
    if target_col:
        break

if target_col is None:
    # If not found, let's use the last numeric column as target
    target_col = numeric_cols[-1]
    print(f"⚠️  Target column not found automatically, using: {target_col}")
else:
    print(f"🎯 Target column identified: {target_col}")

# Separate features and target
y = df_clean[target_col]

# Features: all numeric columns except target + encoded categorical
feature_cols = [col for col in df_clean.columns if col != target_col and 
                (col in numeric_cols or col.endswith('_encoded'))]
X = df_clean[feature_cols]

print(f"\n📊 Feature columns ({len(feature_cols)}):")
print(feature_cols)
print(f"\n🎯 Target: {target_col}")
print(f"   Min: {y.min():.4f}, Max: {y.max():.4f}, Mean: {y.mean():.4f}")

# ============================================================================
# 4. ADVANCED FEATURE ENGINEERING
# ============================================================================
print("\n⚙️  Advanced feature engineering...")

# Create interaction features for key variables
# Assuming common EV features exist
feature_interactions = []

# Speed-related features
speed_cols = [col for col in X.columns if 'speed' in col.lower() or 'velocity' in col.lower()]
if speed_cols:
    for col in speed_cols:
        X[f'{col}_squared'] = X[col] ** 2
        feature_interactions.append(f'{col}_squared')

# Temperature-related features
temp_cols = [col for col in X.columns if 'temp' in col.lower() or 'temperature' in col.lower()]
if temp_cols:
    for col in temp_cols:
        # Temperature deviation from optimal (25°C)
        X[f'{col}_deviation'] = abs(X[col] - 25)
        feature_interactions.append(f'{col}_deviation')

# Battery-related features
battery_cols = [col for col in X.columns if 'battery' in col.lower() or 'capacity' in col.lower()]

print(f"✅ Added {len(feature_interactions)} interaction features")

# ============================================================================
# 5. TRAIN-TEST SPLIT
# ============================================================================
X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=TEST_SIZE, random_state=RANDOM_STATE, shuffle=True
)

print(f"\n📊 Data split:")
print(f"   Training: {X_train.shape[0]} samples")
print(f"   Testing:  {X_test.shape[0]} samples")
print(f"   Features: {X_train.shape[1]}")

# ============================================================================
# 6. FEATURE SCALING
# ============================================================================
print("\n⚙️  Scaling features...")
scaler = StandardScaler()
X_train_scaled = scaler.fit_transform(X_train)
X_test_scaled = scaler.transform(X_test)

# ============================================================================
# 7. MODEL TRAINING
# ============================================================================
print("\n" + "=" * 80)
print("🤖 TRAINING MODELS")
print("=" * 80)

models = {
    'XGBoost': xgb.XGBRegressor(
        n_estimators=500,
        max_depth=7,
        learning_rate=0.05,
        subsample=0.8,
        colsample_bytree=0.8,
        min_child_weight=3,
        gamma=0.1,
        reg_alpha=0.1,
        reg_lambda=1.0,
        random_state=RANDOM_STATE,
        n_jobs=-1,
        tree_method='hist'  # Faster training
    ),
    
    'LightGBM': lgb.LGBMRegressor(
        n_estimators=500,
        max_depth=7,
        learning_rate=0.05,
        num_leaves=31,
        subsample=0.8,
        colsample_bytree=0.8,
        min_child_samples=20,
        reg_alpha=0.1,
        reg_lambda=1.0,
        random_state=RANDOM_STATE,
        n_jobs=-1,
        verbose=-1
    ),
    
    'CatBoost': cb.CatBoostRegressor(
        iterations=500,
        depth=7,
        learning_rate=0.05,
        l2_leaf_reg=3,
        random_state=RANDOM_STATE,
        verbose=False,
        thread_count=-1
    ),
    
    'Random Forest': RandomForestRegressor(
        n_estimators=300,
        max_depth=15,
        min_samples_split=5,
        min_samples_leaf=2,
        max_features='sqrt',
        random_state=RANDOM_STATE,
        n_jobs=-1
    ),
    
    'Extra Trees': ExtraTreesRegressor(
        n_estimators=300,
        max_depth=15,
        min_samples_split=5,
        min_samples_leaf=2,
        random_state=RANDOM_STATE,
        n_jobs=-1
    ),
    
    'Gradient Boosting': GradientBoostingRegressor(
        n_estimators=300,
        max_depth=5,
        learning_rate=0.05,
        subsample=0.8,
        min_samples_split=5,
        random_state=RANDOM_STATE
    )
}

# Store results
results = []
trained_models = {}

for name, model in models.items():
    print(f"\n{'='*80}")
    print(f"Training: {name}")
    print(f"{'='*80}")
    
    # Training time
    start_time = time.time()
    
    # Train model
    model.fit(X_train_scaled, y_train)
    
    training_time = time.time() - start_time
    
    # Predictions
    y_pred_train = model.predict(X_train_scaled)
    y_pred_test = model.predict(X_test_scaled)
    
    # Metrics
    train_r2 = r2_score(y_train, y_pred_train)
    test_r2 = r2_score(y_test, y_pred_test)
    test_rmse = np.sqrt(mean_squared_error(y_test, y_pred_test))
    test_mae = mean_absolute_error(y_test, y_pred_test)
    test_mape = mean_absolute_percentage_error(y_test, y_pred_test) * 100
    
    # Cross-validation (5-fold)
    cv_scores = cross_val_score(
        model, X_train_scaled, y_train, 
        cv=5, scoring='r2', n_jobs=-1
    )
    cv_mean = cv_scores.mean()
    cv_std = cv_scores.std()
    
    # Inference time (average per prediction)
    inference_start = time.time()
    _ = model.predict(X_test_scaled[:100])
    inference_time = (time.time() - inference_start) / 100 * 1000  # ms per prediction
    
    # Store results
    result = {
        'Model': name,
        'Train R²': train_r2,
        'Test R²': test_r2,
        'CV R² Mean': cv_mean,
        'CV R² Std': cv_std,
        'RMSE': test_rmse,
        'MAE': test_mae,
        'MAPE (%)': test_mape,
        'Training Time (s)': training_time,
        'Inference (ms)': inference_time,
        'Accuracy (%)': test_r2 * 100
    }
    results.append(result)
    trained_models[name] = model
    
    # Print results
    print(f"\n📊 Results:")
    print(f"   Train R²:     {train_r2:.6f}")
    print(f"   Test R²:      {test_r2:.6f}")
    print(f"   Accuracy:     {test_r2*100:.2f}%")
    print(f"   CV R² Mean:   {cv_mean:.6f} (±{cv_std:.6f})")
    print(f"   RMSE:         {test_rmse:.6f}")
    print(f"   MAE:          {test_mae:.6f}")
    print(f"   MAPE:         {test_mape:.2f}%")
    print(f"   Training:     {training_time:.2f}s")
    print(f"   Inference:    {inference_time:.4f}ms/prediction")

# ============================================================================
# 8. RESULTS COMPARISON
# ============================================================================
print("\n" + "=" * 80)
print("📊 MODEL COMPARISON")
print("=" * 80)

results_df = pd.DataFrame(results)
results_df = results_df.sort_values('Test R²', ascending=False)

print("\n" + results_df.to_string(index=False))

# Save results
results_df.to_csv(PROCESSED_DIR / 'model_comparison.csv', index=False)
print(f"\n💾 Saved: {PROCESSED_DIR / 'model_comparison.csv'}")

# ============================================================================
# 9. SELECT BEST MODEL
# ============================================================================
best_model_name = results_df.iloc[0]['Model']
best_model = trained_models[best_model_name]
best_score = results_df.iloc[0]['Test R²']
best_accuracy = results_df.iloc[0]['Accuracy (%)']

print("\n" + "=" * 80)
print("🏆 BEST MODEL")
print("=" * 80)
print(f"\nModel: {best_model_name}")
print(f"Test R²: {best_score:.6f}")
print(f"Accuracy: {best_accuracy:.2f}%")

# ============================================================================
# 10. ENSEMBLE MODEL (if accuracy < 98%)
# ============================================================================
if best_accuracy < 98:
    print("\n" + "=" * 80)
    print("🔧 CREATING ENSEMBLE MODEL")
    print("=" * 80)
    
    # Take top 3 models
    top_models = results_df.head(3)['Model'].tolist()
    print(f"\nEnsembling: {top_models}")
    
    # Weighted average predictions
    weights = results_df.head(3)['Test R²'].values
    weights = weights / weights.sum()  # Normalize
    
    ensemble_pred_train = np.zeros(len(y_train))
    ensemble_pred_test = np.zeros(len(y_test))
    
    for i, model_name in enumerate(top_models):
        model = trained_models[model_name]
        ensemble_pred_train += weights[i] * model.predict(X_train_scaled)
        ensemble_pred_test += weights[i] * model.predict(X_test_scaled)
    
    # Ensemble metrics
    ensemble_train_r2 = r2_score(y_train, ensemble_pred_train)
    ensemble_test_r2 = r2_score(y_test, ensemble_pred_test)
    ensemble_rmse = np.sqrt(mean_squared_error(y_test, ensemble_pred_test))
    ensemble_mae = mean_absolute_error(y_test, ensemble_pred_test)
    
    print(f"\n📊 Ensemble Results:")
    print(f"   Train R²:  {ensemble_train_r2:.6f}")
    print(f"   Test R²:   {ensemble_test_r2:.6f}")
    print(f"   Accuracy:  {ensemble_test_r2*100:.2f}%")
    print(f"   RMSE:      {ensemble_rmse:.6f}")
    print(f"   MAE:       {ensemble_mae:.6f}")
    
    if ensemble_test_r2 > best_score:
        print("\n✅ Ensemble model performs better!")
        best_model_name = "Ensemble"
        best_score = ensemble_test_r2
        best_accuracy = ensemble_test_r2 * 100
        
        # Save ensemble info
        ensemble_info = {
            'models': top_models,
            'weights': weights.tolist(),
            'trained_models': {name: trained_models[name] for name in top_models}
        }
        joblib.dump(ensemble_info, MODELS_DIR / 'ensemble_model.pkl')

# ============================================================================
# 11. SAVE FINAL MODEL
# ============================================================================
print("\n" + "=" * 80)
print("💾 SAVING MODEL")
print("=" * 80)

if best_model_name != "Ensemble":
    joblib.dump(best_model, MODELS_DIR / 'battery_model.pkl')
    print(f"✅ Saved: {MODELS_DIR / 'battery_model.pkl'}")
else:
    print(f"✅ Saved: {MODELS_DIR / 'ensemble_model.pkl'}")

# Save scaler
joblib.dump(scaler, MODELS_DIR / 'scaler.pkl')
print(f"✅ Saved: {MODELS_DIR / 'scaler.pkl'}")

# Save feature names
feature_info = {
    'feature_columns': feature_cols,
    'target_column': target_col,
    'label_encoders': label_encoders,
    'feature_names': X_train.columns.tolist()
}
joblib.dump(feature_info, MODELS_DIR / 'feature_info.pkl')
print(f"✅ Saved: {MODELS_DIR / 'feature_info.pkl'}")

# Save metadata
metadata = {
    'best_model': best_model_name,
    'test_r2': float(best_score),
    'accuracy': float(best_accuracy),
    'n_features': X_train.shape[1],
    'n_samples': len(df_clean),
    'timestamp': pd.Timestamp.now().isoformat()
}
import json
with open(MODELS_DIR / 'model_metadata.json', 'w') as f:
    json.dump(metadata, f, indent=2)
print(f"✅ Saved: {MODELS_DIR / 'model_metadata.json'}")

# ============================================================================
# 12. FEATURE IMPORTANCE (for tree-based models)
# ============================================================================
if hasattr(best_model, 'feature_importances_'):
    print("\n" + "=" * 80)
    print("📊 FEATURE IMPORTANCE")
    print("=" * 80)
    
    feature_importance = pd.DataFrame({
        'Feature': X_train.columns,
        'Importance': best_model.feature_importances_
    }).sort_values('Importance', ascending=False)
    
    print("\nTop 10 Most Important Features:")
    print(feature_importance.head(10).to_string(index=False))
    
    feature_importance.to_csv(PROCESSED_DIR / 'feature_importance.csv', index=False)
    print(f"\n💾 Saved: {PROCESSED_DIR / 'feature_importance.csv'}")

# ============================================================================
# 13. TEST PREDICTIONS
# ============================================================================
print("\n" + "=" * 80)
print("🧪 SAMPLE PREDICTIONS")
print("=" * 80)

# Test with a few samples
n_samples = 5
test_indices = np.random.choice(len(X_test), n_samples, replace=False)

print(f"\nShowing {n_samples} random predictions:\n")
for i, idx in enumerate(test_indices, 1):
    actual = y_test.iloc[idx]
    if best_model_name != "Ensemble":
        predicted = best_model.predict(X_test_scaled[idx:idx+1])[0]
    else:
        ensemble_info = joblib.load(MODELS_DIR / 'ensemble_model.pkl')
        pred = 0
        for model_name, weight in zip(ensemble_info['models'], ensemble_info['weights']):
            pred += weight * ensemble_info['trained_models'][model_name].predict(X_test_scaled[idx:idx+1])[0]
        predicted = pred
    
    error = abs(actual - predicted)
    error_pct = (error / actual) * 100
    
    print(f"Sample {i}:")
    print(f"  Actual:    {actual:.4f}")
    print(f"  Predicted: {predicted:.4f}")
    print(f"  Error:     {error:.4f} ({error_pct:.2f}%)")
    print()

# ============================================================================
# SUMMARY
# ============================================================================
print("=" * 80)
print("✅ TRAINING COMPLETE")
print("=" * 80)
print(f"\n🏆 Best Model: {best_model_name}")
print(f"📊 Accuracy: {best_accuracy:.2f}%")
print(f"📊 R² Score: {best_score:.6f}")
print(f"\n📁 Saved files:")
print(f"   - models/battery_model.pkl (or ensemble_model.pkl)")
print(f"   - models/scaler.pkl")
print(f"   - models/feature_info.pkl")
print(f"   - models/model_metadata.json")
print(f"   - data/processed/model_comparison.csv")
print(f"\n🚀 Next step: Run the API server")
print(f"   cd api")
print(f"   python app.py")
print("=" * 80)