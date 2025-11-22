# At the very bottom of train.py:

def main():
    import sys
    sys.path.append('.')
    from config import CONSUMPTION_CLEAN_CSV, MODEL_OUTPUT_DIR
    
    parser = argparse.ArgumentParser(description='Train EV Range Prediction Model')
    parser.add_argument('--data-path', type=str, 
                       default=str(CONSUMPTION_CLEAN_CSV),
                       help='Path to training data CSV')
    parser.add_argument('--model-type', type=str, default='neural',
                       choices=['neural', 'random_forest', 'gradient_boost', 'all'],
                       help='Model type to train')
    parser.add_argument('--output-dir', type=str, default=str(MODEL_OUTPUT_DIR),
                       help='Output directory for trained models')
    
    args = parser.parse_args()
    
    # Check if data exists
    if not os.path.exists(args.data_path):
        print(f"\n❌ Error: Data file not found: {args.data_path}")
        print("\nRun data cleaning first:")
        print("  python src/clean_real_data.py")
        sys.exit(1)
    
    # Train model(s)
    print("\n" + "="*70)
    print("STARTING MODEL TRAINING")
    print("="*70)
    
    if args.model_type == 'all':
        train_and_compare_models(args.data_path, args.output_dir)
    else:
        trainer = EVRangeTrainer(model_type=args.model_type)
        X_train, X_test, y_train, y_test = trainer.load_data(args.data_path)
        
        if args.model_type == 'neural':
            trainer.train_neural(X_train, X_test, y_train, y_test)
        elif args.model_type == 'random_forest':
            trainer.train_random_forest(X_train, y_train)
        else:
            trainer.train_gradient_boost(X_train, y_train)
        
        trainer.evaluate(X_test, y_test)
        trainer.save_model(args.output_dir)
    
    print("\n" + "="*70)
    print("✅ TRAINING COMPLETE!")
    print("="*70)