#!/bin/bash

# Complete training pipeline for real datasets

echo "======================================================================"
echo "ChargePilot AI - Model Training Pipeline"
echo "======================================================================"

# Configuration
CONSUMPTION_CSV="data/raw/ev_consumption.csv"
STATIONS_CSV="data/raw/indian_ev_stations.csv"
OUTPUT_DIR="models/production"

# Step 1: Inspect data
echo ""
echo "Step 1: Inspecting datasets..."
python src/data_inspector.py \
    --consumption "$CONSUMPTION_CSV" \
    --stations "$STATIONS_CSV" \
    --output reports

# Step 2: Clean data
echo ""
echo "Step 2: Cleaning datasets..."
python src/clean_real_data.py \
    --consumption "$CONSUMPTION_CSV" \
    --stations "$STATIONS_CSV" \
    --output-dir data/processed

# Step 3: Train model
echo ""
echo "Step 3: Training neural network model..."
python train.py \
    --data-path data/processed/ev_consumption_clean.csv \
    --model-type neural \
    --output-dir "$OUTPUT_DIR"

# Step 4: Test model
echo ""
echo "Step 4: Testing model..."
python tests/test_model.py

echo ""
echo "======================================================================"
echo "✅ TRAINING PIPELINE COMPLETE"
echo "======================================================================"
echo ""
echo "Outputs:"
echo "  - Cleaned data: data/processed/"
echo "  - Trained model: $OUTPUT_DIR/"
echo "  - Reports: reports/"