"""
Model training with multiple algorithms
"""

import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestRegressor, GradientBoostingRegressor
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
import tensorflow as tf
from tensorflow import keras
from tensorflow.keras import layers, callbacks
import joblib
import json
import os
import sys
from typing import Dict, Tuple

# Import from same directory
from .preprocessor import EVDataPreprocessor

class EVRangeTrainer:
    def __init__(self, model_type: str = 'neural'):
        """
        Initialize trainer
        
        Args:
            model_type: 'neural', 'random_forest', 'gradient_boost'
        """
        self.model_type = model_type
        self.model = None
        self.preprocessor = EVDataPreprocessor()
        self.metrics = {}
        
    def load_data(self, filepath: str) -> Tuple[np.ndarray, np.ndarray, np.ndarray, np.ndarray]:
        """Load and split data"""
        print(f"Loading data from {filepath}...")
        df = pd.read_csv(filepath)
        print(f"✓ Loaded {len(df)} samples")
        
        # Preprocess
        X, y = self.preprocessor.fit_transform(df)
        
        # Split
        X_train, X_test, y_train, y_test = train_test_split(
            X, y, test_size=0.2, random_state=42
        )
        
        print(f"✓ Training set: {len(X_train)} samples")
        print(f"✓ Test set: {len(X_test)} samples")
        print(f"✓ Number of features: {X.shape[1]}")
        
        return X_train, X_test, y_train, y_test
    
    def build_neural_model(self, input_dim: int) -> keras.Model:
        """Build neural network"""
        
        model = keras.Sequential([
            layers.Input(shape=(input_dim,)),
            
            # First block
            layers.Dense(128, kernel_initializer='he_normal'),
            layers.BatchNormalization(),
            layers.Activation('relu'),
            layers.Dropout(0.3),
            
            # Second block
            layers.Dense(64, kernel_initializer='he_normal'),
            layers.BatchNormalization(),
            layers.Activation('relu'),
            layers.Dropout(0.25),
            
            # Third block
            layers.Dense(32, kernel_initializer='he_normal'),
            layers.BatchNormalization(),
            layers.Activation('relu'),
            layers.Dropout(0.2),
            
            # Output
            layers.Dense(16, activation='relu'),
            layers.Dense(1, activation='linear')
        ])
        
        optimizer = keras.optimizers.Adam(learning_rate=0.001)
        
        model.compile(
            optimizer=optimizer,
            loss='huber',
            metrics=['mae', 'mse']
        )
        
        return model
    
    def train_neural(self, X_train, X_test, y_train, y_test) -> keras.Model:
        """Train neural network"""
        
        print("\n" + "="*60)
        print("TRAINING NEURAL NETWORK")
        print("="*60)
        
        model = self.build_neural_model(X_train.shape[1])
        
        # Callbacks
        early_stop = callbacks.EarlyStopping(
            monitor='val_loss',
            patience=15,
            restore_best_weights=True,
            verbose=1
        )
        
        reduce_lr = callbacks.ReduceLROnPlateau(
            monitor='val_loss',
            factor=0.5,
            patience=5,
            min_lr=1e-6,
            verbose=1
        )
        
        # Train
        history = model.fit(
            X_train, y_train,
            validation_split=0.15,
            epochs=100,
            batch_size=32,
            callbacks=[early_stop, reduce_lr],
            verbose=1
        )
        
        self.model = model
        return model
    
    def train_random_forest(self, X_train, y_train) -> RandomForestRegressor:
        """Train Random Forest"""
        
        print("\n" + "="*60)
        print("TRAINING RANDOM FOREST")
        print("="*60)
        
        model = RandomForestRegressor(
            n_estimators=100,
            max_depth=20,
            min_samples_split=5,
            min_samples_leaf=2,
            random_state=42,
            n_jobs=-1,
            verbose=1
        )
        
        model.fit(X_train, y_train)
        self.model = model
        return model
    
    def train_gradient_boost(self, X_train, y_train) -> GradientBoostingRegressor:
        """Train Gradient Boosting"""
        
        print("\n" + "="*60)
        print("TRAINING GRADIENT BOOSTING")
        print("="*60)
        
        model = GradientBoostingRegressor(
            n_estimators=150,
            learning_rate=0.1,
            max_depth=7,
            min_samples_split=5,
            min_samples_leaf=2,
            subsample=0.8,
            random_state=42,
            verbose=1
        )
        
        model.fit(X_train, y_train)
        self.model = model
        return model
    
    def evaluate(self, X_test, y_test) -> Dict[str, float]:
        """Evaluate model"""
        
        print("\n" + "="*60)
        print("MODEL EVALUATION")
        print("="*60)
        
        predictions = self.model.predict(X_test, verbose=0)
        
        # For neural networks, flatten predictions
        if len(predictions.shape) > 1:
            predictions = predictions.flatten()
        
        mae = mean_absolute_error(y_test, predictions)
        rmse = np.sqrt(mean_squared_error(y_test, predictions))
        r2 = r2_score(y_test, predictions)
        
        # Calculate percentage errors
        mape = np.mean(np.abs((y_test - predictions) / y_test)) * 100
        
        # Accuracy within thresholds
        within_5km = np.mean(np.abs(y_test - predictions) < 5) * 100
        within_10km = np.mean(np.abs(y_test - predictions) < 10) * 100
        
        metrics = {
            'mae': float(mae),
            'rmse': float(rmse),
            'r2': float(r2),
            'mape': float(mape),
            'accuracy_within_5km': float(within_5km),
            'accuracy_within_10km': float(within_10km)
        }
        
        print(f"\n📊 Performance Metrics:")
        print(f"  Mean Absolute Error: {mae:.2f} km")
        print(f"  Root Mean Squared Error: {rmse:.2f} km")
        print(f"  R² Score: {r2:.4f}")
        print(f"  Mean Absolute Percentage Error: {mape:.2f}%")
        print(f"  Predictions within 5 km: {within_5km:.1f}%")
        print(f"  Predictions within 10 km: {within_10km:.1f}%")
        
        self.metrics = metrics
        return metrics
    
    def save_model(self, output_dir: str = '../models'):
        """Save model and artifacts"""
        
        os.makedirs(output_dir, exist_ok=True)
        
        # Save preprocessor
        preprocessor_path = os.path.join(output_dir, 'preprocessor.pkl')
        self.preprocessor.save(preprocessor_path)
        
        # Save model based on type
        if self.model_type == 'neural':
            # Save with .keras extension (new TensorFlow format)
            keras_path = os.path.join(output_dir, 'range_predictor_neural.keras')
            self.model.save(keras_path)
            print(f"✓ Neural model saved to {keras_path}")
            
            # Also export as SavedModel format (for TensorFlow Serving/deployment)
            try:
                export_path = os.path.join(output_dir, 'range_predictor_savedmodel')
                self.model.export(export_path)
                print(f"✓ Exported SavedModel to {export_path}")
            except AttributeError:
                # Fallback for older TensorFlow versions
                try:
                    export_path = os.path.join(output_dir, 'range_predictor_savedmodel')
                    tf.saved_model.save(self.model, export_path)
                    print(f"✓ Exported SavedModel to {export_path}")
                except Exception as e:
                    print(f"⚠️  Could not export SavedModel: {e}")
            except Exception as e:
                print(f"⚠️  Could not export SavedModel: {e}")
            
            # Convert to TensorFlow Lite for mobile/edge deployment
            try:
                converter = tf.lite.TFLiteConverter.from_keras_model(self.model)
                converter.optimizations = [tf.lite.Optimize.DEFAULT]
                tflite_model = converter.convert()
                
                tflite_path = os.path.join(output_dir, 'model.tflite')
                with open(tflite_path, 'wb') as f:
                    f.write(tflite_model)
                print(f"✓ TFLite model saved to {tflite_path} (size: {len(tflite_model)/1024:.1f} KB)")
            except Exception as e:
                print(f"⚠️  Could not create TFLite model: {e}")
            
        else:
            # Save sklearn models
            model_path = os.path.join(output_dir, f'range_predictor_{self.model_type}.pkl')
            joblib.dump(self.model, model_path)
            print(f"✓ {self.model_type} model saved to {model_path}")
        
        # Save metrics
        metrics_path = os.path.join(output_dir, 'metrics.json')
        with open(metrics_path, 'w') as f:
            json.dump(self.metrics, f, indent=2)
        print(f"✓ Metrics saved to {metrics_path}")
        
        # Save metadata
        metadata = {
            'model_type': self.model_type,
            'num_features': len(self.preprocessor.feature_names),
            'feature_names': self.preprocessor.feature_names,
            'metrics': self.metrics
        }
        
        metadata_path = os.path.join(output_dir, 'metadata.json')
        with open(metadata_path, 'w') as f:
            json.dump(metadata, f, indent=2)
        print(f"✓ Metadata saved to {metadata_path}")
        
        print(f"\n✅ All artifacts saved to {output_dir}/")


def train_and_compare_models(data_path: str, output_dir: str = '../models'):
    """Train multiple models and compare"""
    
    results = {}
    
    for model_type in ['neural', 'random_forest']:
        print(f"\n{'='*70}")
        print(f"TRAINING: {model_type.upper().replace('_', ' ')}")
        print(f"{'='*70}")
        
        trainer = EVRangeTrainer(model_type=model_type)
        X_train, X_test, y_train, y_test = trainer.load_data(data_path)
        
        if model_type == 'neural':
            trainer.train_neural(X_train, X_test, y_train, y_test)
        elif model_type == 'random_forest':
            trainer.train_random_forest(X_train, y_train)
        else:
            trainer.train_gradient_boost(X_train, y_train)
        
        metrics = trainer.evaluate(X_test, y_test)
        results[model_type] = metrics
        
        model_output_dir = os.path.join(output_dir, model_type)
        trainer.save_model(model_output_dir)
    
    # Print comparison
    print("\n" + "="*70)
    print("MODEL COMPARISON")
    print("="*70)
    print(f"{'Model':<20} {'MAE (km)':<12} {'RMSE (km)':<12} {'R²':<10} {'Acc@10km':<10}")
    print("-"*70)
    for name, metrics in results.items():
        print(f"{name:<20} {metrics['mae']:<12.2f} {metrics['rmse']:<12.2f} "
              f"{metrics['r2']:<10.4f} {metrics['accuracy_within_10km']:<10.1f}%")
    
    # Find best model
    best_model = max(results.items(), key=lambda x: x[1]['r2'])
    print(f"\n🏆 Best Model: {best_model[0]} (R² = {best_model[1]['r2']:.4f})")
    
    return results