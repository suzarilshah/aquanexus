#!/usr/bin/env python3
"""
AquaNexus LSTM Training Pipeline

This script trains LSTM models for predicting:
- Plant height (growth rate forecasting) - PRIMARY TARGET
- Fish environment parameters (temperature, pH, EC, turbidity)
- Plant environment parameters (temperature, humidity)

Usage:
    python main.py --model-type height --horizon short
    python main.py --model-type fish_temp --horizon short
    python main.py --train-all

Data Sources:
    - plant_initial.csv: 3 months of plant training data (Mar-May 2024)
    - plant_validate.csv: 3 months of plant validation data (Jun-Aug 2024)
    - fish_initial.csv: 3 months of fish training data (Mar-May 2024)
    - fish_validate.csv: 3 months of fish validation data (Jun-Aug 2024)
"""

import argparse
import json
import os
import sys
from datetime import datetime
from pathlib import Path
from typing import Dict, Optional, Tuple

import numpy as np
import pandas as pd

# Add parent directory to path for imports
sys.path.insert(0, str(Path(__file__).parent))

from models.lstm_model import (
    LSTMPredictor,
    MODEL_CONFIGS,
    create_lstm_model,
    create_multivariate_lstm_model
)
from models.data_processor import DataProcessor, prepare_training_data
from utils.csv_loader import (
    load_aquanexus_data,
    analyze_data,
    calculate_growth_rate,
    FEATURE_CONFIGS
)


def setup_directories(base_dir: str = '.') -> Dict[str, Path]:
    """
    Create necessary directories for training.

    Args:
        base_dir: Base directory

    Returns:
        Dictionary of directory paths
    """
    base = Path(base_dir)
    dirs = {
        'models': base / 'trained_models',
        'logs': base / 'training_logs',
        'results': base / 'results',
        'checkpoints': base / 'checkpoints'
    }

    for name, path in dirs.items():
        path.mkdir(parents=True, exist_ok=True)
        print(f"Created directory: {path}")

    return dirs


def prepare_lstm_data(
    df: pd.DataFrame,
    features: list,
    target: str,
    sequence_length: int = 24,
    prediction_steps: int = 24
) -> Tuple[np.ndarray, np.ndarray, DataProcessor]:
    """
    Prepare data for LSTM training.

    Args:
        df: Input DataFrame
        features: List of feature columns
        target: Target column name
        sequence_length: Number of input time steps
        prediction_steps: Number of output time steps

    Returns:
        Tuple of (X, y, processor)
    """
    # Create processor
    processor = DataProcessor(
        sequence_length=sequence_length,
        prediction_steps=prediction_steps,
        feature_columns=features,
        target_column=target
    )

    # Select features
    df_features = df[features].copy()

    # Fit and transform
    scaled_data = processor.fit_transform(df_features)

    # Find target index
    target_idx = features.index(target)

    # Create sequences
    X, y = processor.create_sequences(scaled_data, target_idx=target_idx)

    print(f"Prepared data: X shape = {X.shape}, y shape = {y.shape}")

    return X, y, processor


def train_model(
    model_type: str = 'height',
    horizon: str = 'short',
    data_dir: str = '..',
    output_dir: str = './trained_models',
    epochs: int = 100,
    batch_size: int = 32,
    patience: int = 15,
    validation_split: float = 0.2
) -> Dict:
    """
    Train an LSTM model.

    Args:
        model_type: Type of model to train
        horizon: Prediction horizon ('short' = 24h, 'medium' = 7d)
        data_dir: Directory containing CSV files
        output_dir: Directory to save models
        epochs: Maximum training epochs
        batch_size: Training batch size
        patience: Early stopping patience
        validation_split: Fraction for validation

    Returns:
        Training results dictionary
    """
    print("\n" + "="*70)
    print(f"Training LSTM Model: {model_type} ({horizon} term)")
    print("="*70)

    # Get configuration
    if model_type not in FEATURE_CONFIGS:
        raise ValueError(f"Unknown model type: {model_type}. Available: {list(FEATURE_CONFIGS.keys())}")

    config = FEATURE_CONFIGS[model_type]
    features = config['features']
    target = config['target']
    data_type = config['data_type']

    # Determine sequence length based on horizon
    if horizon == 'short':
        sequence_length = 24  # ~5 days at 5h intervals
        prediction_steps = 12  # ~2.5 days
    else:  # medium
        sequence_length = 48  # ~10 days
        prediction_steps = 24  # ~5 days

    print(f"\nConfiguration:")
    print(f"  Features: {features}")
    print(f"  Target: {target}")
    print(f"  Sequence Length: {sequence_length}")
    print(f"  Prediction Steps: {prediction_steps}")

    # Load data
    print(f"\nLoading data from {data_dir}...")
    train_df, val_df, _ = load_aquanexus_data(data_dir, model_type)

    # Analyze training data
    analyze_data(train_df, "Training Data")

    # Add growth rate for plant models
    if data_type == 'plant' and 'height' in features:
        train_df = calculate_growth_rate(train_df)
        val_df = calculate_growth_rate(val_df)
        print(f"\nGrowth Statistics (Training):")
        print(f"  Initial Height: {train_df['height'].iloc[0]:.2f} cm")
        print(f"  Final Height: {train_df['height'].iloc[-1]:.2f} cm")
        print(f"  Total Growth: {train_df['height'].iloc[-1] - train_df['height'].iloc[0]:.2f} cm")
        print(f"  Avg Growth Rate: {train_df['growth_rate'].mean():.4f} cm/day")

    # Prepare training data
    print("\nPreparing training data...")
    X_train, y_train, processor = prepare_lstm_data(
        train_df, features, target, sequence_length, prediction_steps
    )

    # Prepare validation data using same processor
    print("Preparing validation data...")
    val_features = val_df[features].copy()
    scaled_val = processor.transform(val_features)
    target_idx = features.index(target)
    X_val, y_val = processor.create_sequences(scaled_val, target_idx=target_idx)
    print(f"Validation data: X shape = {X_val.shape}, y shape = {y_val.shape}")

    # Check for sufficient data
    if len(X_train) < 20:
        raise ValueError(f"Not enough training samples: {len(X_train)}. Need at least 20.")

    # Create model
    print("\nBuilding LSTM model...")
    predictor = LSTMPredictor(
        model_type=model_type,
        sequence_length=sequence_length,
        prediction_horizon=horizon
    )
    predictor.prediction_steps = prediction_steps

    # Get units from MODEL_CONFIGS if available
    units = MODEL_CONFIGS.get(model_type, {}).get('units', 64)

    predictor.build_model(
        n_features=len(features),
        units=units
    )

    print(f"Model built with {units} units")
    predictor.model.summary()

    # Generate version
    version = datetime.now().strftime('%Y%m%d_%H%M%S')
    model_path = os.path.join(output_dir, f"{model_type}_{horizon}_{version}")

    # Train
    print(f"\nTraining for up to {epochs} epochs with patience {patience}...")
    training_results = predictor.fit(
        X_train, y_train,
        validation_split=validation_split,
        epochs=epochs,
        batch_size=batch_size,
        patience=patience,
        model_path=f"{model_path}.keras"
    )

    # Evaluate on validation set
    print("\nEvaluating on validation set...")
    val_loss, val_mae = predictor.model.evaluate(X_val, y_val, verbose=0)

    # Make predictions on validation set
    y_pred = predictor.model.predict(X_val, verbose=0)

    # Calculate metrics
    mse = np.mean((y_val - y_pred) ** 2)
    rmse = np.sqrt(mse)
    mae = np.mean(np.abs(y_val - y_pred))
    mape = np.mean(np.abs((y_val - y_pred) / (y_val + 1e-8))) * 100
    r2 = 1 - np.sum((y_val - y_pred) ** 2) / np.sum((y_val - np.mean(y_val)) ** 2)

    print(f"\nValidation Metrics:")
    print(f"  MSE: {mse:.6f}")
    print(f"  RMSE: {rmse:.4f}")
    print(f"  MAE: {mae:.4f}")
    print(f"  MAPE: {mape:.2f}%")
    print(f"  R²: {r2:.4f}")

    # Inverse transform to get actual values
    y_val_actual = processor.inverse_transform_target(y_val.reshape(-1, 1)).flatten()
    y_pred_actual = processor.inverse_transform_target(y_pred.reshape(-1, 1)).flatten()

    print(f"\nPrediction Examples (actual scale):")
    print(f"  Actual range: {y_val_actual.min():.2f} - {y_val_actual.max():.2f}")
    print(f"  Predicted range: {y_pred_actual.min():.2f} - {y_pred_actual.max():.2f}")

    # Save model and processor
    print(f"\nSaving model to {model_path}...")
    predictor.save(model_path)
    processor.save_params(f"{model_path}_processor.json")

    # Prepare results
    results = {
        'model_type': model_type,
        'version': version,
        'prediction_horizon': horizon,
        'model_path': model_path,
        'data_type': data_type,
        'training': {
            'epochs_trained': training_results['epochs_trained'],
            'final_loss': training_results['final_loss'],
            'final_val_loss': training_results['final_val_loss'],
            'final_mae': training_results['final_mae'],
            'final_val_mae': training_results['final_val_mae'],
        },
        'evaluation': {
            'val_loss': float(val_loss),
            'val_mae': float(val_mae),
            'mse': float(mse),
            'rmse': float(rmse),
            'mape': float(mape),
            'r2': float(r2)
        },
        'hyperparameters': {
            'sequence_length': sequence_length,
            'prediction_steps': prediction_steps,
            'units': units,
            'features': features,
            'target': target,
            'epochs': training_results['epochs_trained'],
            'batch_size': batch_size,
            'patience': patience
        },
        'data_info': {
            'train_samples': len(X_train),
            'val_samples': len(X_val),
            'train_date_range': [
                str(train_df.index.min()),
                str(train_df.index.max())
            ],
            'val_date_range': [
                str(val_df.index.min()),
                str(val_df.index.max())
            ]
        },
        'trained_at': datetime.now().isoformat()
    }

    # Save results
    results_path = f"{model_path}_results.json"
    with open(results_path, 'w') as f:
        json.dump(results, f, indent=2)
    print(f"Results saved to {results_path}")

    print("\n" + "="*70)
    print(f"Training Complete! Model saved to: {model_path}")
    print("="*70)

    return results


def train_all_models(
    data_dir: str = '..',
    output_dir: str = './trained_models',
    horizons: list = ['short']
) -> Dict[str, Dict]:
    """
    Train all configured model types.

    Args:
        data_dir: Directory containing CSV files
        output_dir: Directory to save models
        horizons: List of horizons to train

    Returns:
        Dictionary of all training results
    """
    all_results = {}

    # Models to train
    model_types = ['height', 'fish_temp', 'fish_ph', 'fish_ec', 'fish_turbidity',
                   'plant_temp', 'plant_humidity']

    for horizon in horizons:
        for model_type in model_types:
            try:
                results = train_model(
                    model_type=model_type,
                    horizon=horizon,
                    data_dir=data_dir,
                    output_dir=output_dir
                )
                all_results[f"{model_type}_{horizon}"] = results
            except Exception as e:
                print(f"\nError training {model_type} ({horizon}): {e}")
                all_results[f"{model_type}_{horizon}"] = {'error': str(e)}

    # Save summary
    summary_path = os.path.join(output_dir, f"training_summary_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json")
    with open(summary_path, 'w') as f:
        json.dump(all_results, f, indent=2)
    print(f"\nTraining summary saved to {summary_path}")

    return all_results


def main():
    """Main entry point."""
    parser = argparse.ArgumentParser(
        description='AquaNexus LSTM Training Pipeline',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
    # Train plant height model (primary)
    python main.py --model-type height --horizon short

    # Train fish temperature model
    python main.py --model-type fish_temp --horizon short

    # Train all models
    python main.py --train-all

    # Train with custom parameters
    python main.py --model-type height --epochs 200 --batch-size 16

Available model types:
    - height: Plant height prediction (PRIMARY)
    - plant_temp: Plant temperature prediction
    - plant_humidity: Plant humidity prediction
    - fish_temp: Fish water temperature prediction
    - fish_ph: Fish water pH prediction
    - fish_ec: Fish EC (electrical conductivity) prediction
    - fish_turbidity: Fish water turbidity prediction
        """
    )

    parser.add_argument(
        '--model-type',
        type=str,
        default='height',
        choices=list(FEATURE_CONFIGS.keys()),
        help='Type of model to train'
    )
    parser.add_argument(
        '--horizon',
        type=str,
        default='short',
        choices=['short', 'medium'],
        help='Prediction horizon (short=24h, medium=7d)'
    )
    parser.add_argument(
        '--data-dir',
        type=str,
        default='..',
        help='Directory containing CSV files'
    )
    parser.add_argument(
        '--output-dir',
        type=str,
        default='./trained_models',
        help='Directory to save trained models'
    )
    parser.add_argument(
        '--epochs',
        type=int,
        default=100,
        help='Maximum training epochs'
    )
    parser.add_argument(
        '--batch-size',
        type=int,
        default=32,
        help='Training batch size'
    )
    parser.add_argument(
        '--patience',
        type=int,
        default=15,
        help='Early stopping patience'
    )
    parser.add_argument(
        '--train-all',
        action='store_true',
        help='Train all model types'
    )

    args = parser.parse_args()

    # Setup directories
    dirs = setup_directories()

    # Print header
    print("\n" + "="*70)
    print("AquaNexus LSTM Training Pipeline")
    print("="*70)
    print(f"Python: {sys.version}")
    print(f"Working Directory: {os.getcwd()}")
    print(f"Data Directory: {args.data_dir}")
    print(f"Output Directory: {args.output_dir}")

    try:
        if args.train_all:
            # Train all models
            results = train_all_models(
                data_dir=args.data_dir,
                output_dir=args.output_dir
            )
            print("\n" + "="*70)
            print("All Models Training Complete!")
            print("="*70)
            for name, result in results.items():
                if 'error' in result:
                    print(f"  {name}: FAILED - {result['error']}")
                else:
                    print(f"  {name}: R²={result['evaluation']['r2']:.4f}, MAPE={result['evaluation']['mape']:.2f}%")
        else:
            # Train single model
            results = train_model(
                model_type=args.model_type,
                horizon=args.horizon,
                data_dir=args.data_dir,
                output_dir=args.output_dir,
                epochs=args.epochs,
                batch_size=args.batch_size,
                patience=args.patience
            )

    except Exception as e:
        print(f"\nError: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)


if __name__ == '__main__':
    main()
