#!/usr/bin/env python3
"""
AquaNexus LSTM Model Validation Script

This script validates trained LSTM models by:
1. Loading the trained model
2. Making predictions on validation data
3. Comparing predictions with actual values
4. Computing accuracy metrics (MAPE, RMSE, R²)
5. Generating validation reports

Usage:
    python validate.py --model-type height
    python validate.py --model-type height --visualize
    python validate.py --validate-all
"""

import argparse
import json
import os
import sys
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Optional, Tuple

import numpy as np
import pandas as pd

# Add parent directory to path for imports
sys.path.insert(0, str(Path(__file__).parent))

from models.lstm_model import LSTMPredictor, MODEL_CONFIGS
from models.data_processor import DataProcessor
from utils.csv_loader import (
    load_aquanexus_data,
    analyze_data,
    calculate_growth_rate,
    FEATURE_CONFIGS
)


def find_latest_model(
    model_type: str,
    horizon: str = 'short',
    models_dir: str = './trained_models'
) -> Optional[str]:
    """
    Find the latest trained model for a given type.

    Args:
        model_type: Type of model
        horizon: Prediction horizon
        models_dir: Directory containing trained models

    Returns:
        Path to the latest model (without extension) or None
    """
    models_path = Path(models_dir)

    if not models_path.exists():
        return None

    # Find matching model files
    pattern = f"{model_type}_{horizon}_"
    keras_files = list(models_path.glob(f"{pattern}*.keras"))

    if not keras_files:
        return None

    # Sort by modification time (newest first)
    keras_files.sort(key=lambda x: x.stat().st_mtime, reverse=True)

    # Return path without extension
    return str(keras_files[0]).replace('.keras', '')


def load_model_and_processor(
    model_path: str
) -> Tuple[LSTMPredictor, DataProcessor]:
    """
    Load a trained model and its processor.

    Args:
        model_path: Path to model (without extension)

    Returns:
        Tuple of (predictor, processor)
    """
    # Load predictor
    predictor = LSTMPredictor()
    predictor.load(model_path)

    # Load processor
    processor = DataProcessor()
    processor.load_params(f"{model_path}_processor.json")

    return predictor, processor


def validate_model(
    model_type: str = 'height',
    horizon: str = 'short',
    data_dir: str = '..',
    models_dir: str = './trained_models',
    visualize: bool = False
) -> Dict:
    """
    Validate a trained model against validation data.

    Args:
        model_type: Type of model to validate
        horizon: Prediction horizon
        data_dir: Directory containing CSV files
        models_dir: Directory containing trained models
        visualize: Whether to generate plots

    Returns:
        Validation results dictionary
    """
    print("\n" + "="*70)
    print(f"Validating Model: {model_type} ({horizon} term)")
    print("="*70)

    # Find latest model
    model_path = find_latest_model(model_type, horizon, models_dir)
    if model_path is None:
        raise FileNotFoundError(f"No trained model found for {model_type} ({horizon})")

    print(f"Using model: {model_path}")

    # Load model and processor
    predictor, processor = load_model_and_processor(model_path)
    print(f"Model loaded. Sequence length: {processor.sequence_length}, Prediction steps: {processor.prediction_steps}")

    # Get configuration
    config = FEATURE_CONFIGS.get(model_type)
    if config is None:
        raise ValueError(f"Unknown model type: {model_type}")

    features = config['features']
    target = config['target']

    # Load validation data
    print(f"\nLoading validation data from {data_dir}...")
    _, val_df, _ = load_aquanexus_data(data_dir, model_type)

    # Analyze validation data
    analyze_data(val_df, "Validation Data")

    # Calculate growth rate for plant models
    if config['data_type'] == 'plant' and 'height' in features:
        val_df = calculate_growth_rate(val_df)

    # Prepare validation sequences
    print("\nPreparing validation sequences...")
    val_features = val_df[features].copy()
    scaled_val = processor.transform(val_features)
    target_idx = features.index(target)

    # Create sequences
    X_val, y_val = processor.create_sequences(scaled_val, target_idx=target_idx)
    print(f"Validation sequences: X shape = {X_val.shape}, y shape = {y_val.shape}")

    if len(X_val) == 0:
        raise ValueError("Not enough validation data to create sequences")

    # Make predictions
    print("\nMaking predictions...")
    y_pred = predictor.model.predict(X_val, verbose=0)

    # Calculate metrics (scaled)
    mse = np.mean((y_val - y_pred) ** 2)
    rmse = np.sqrt(mse)
    mae = np.mean(np.abs(y_val - y_pred))

    # Calculate MAPE (avoiding division by zero)
    mask = np.abs(y_val) > 1e-8
    mape = np.mean(np.abs((y_val[mask] - y_pred[mask]) / y_val[mask])) * 100

    # Calculate R²
    ss_res = np.sum((y_val - y_pred) ** 2)
    ss_tot = np.sum((y_val - np.mean(y_val)) ** 2)
    r2 = 1 - (ss_res / ss_tot) if ss_tot > 0 else 0

    print(f"\nValidation Metrics (Scaled):")
    print(f"  MSE: {mse:.6f}")
    print(f"  RMSE: {rmse:.6f}")
    print(f"  MAE: {mae:.6f}")
    print(f"  MAPE: {mape:.2f}%")
    print(f"  R²: {r2:.4f}")

    # Inverse transform to get actual values
    y_val_flat = y_val.flatten()
    y_pred_flat = y_pred.flatten()

    y_val_actual = processor.inverse_transform_target(y_val_flat.reshape(-1, 1)).flatten()
    y_pred_actual = processor.inverse_transform_target(y_pred_flat.reshape(-1, 1)).flatten()

    # Calculate metrics on actual scale
    actual_mse = np.mean((y_val_actual - y_pred_actual) ** 2)
    actual_rmse = np.sqrt(actual_mse)
    actual_mae = np.mean(np.abs(y_val_actual - y_pred_actual))

    mask_actual = np.abs(y_val_actual) > 1e-8
    actual_mape = np.mean(np.abs((y_val_actual[mask_actual] - y_pred_actual[mask_actual]) / y_val_actual[mask_actual])) * 100

    print(f"\nValidation Metrics (Actual Scale):")
    print(f"  MSE: {actual_mse:.4f}")
    print(f"  RMSE: {actual_rmse:.4f}")
    print(f"  MAE: {actual_mae:.4f}")
    print(f"  MAPE: {actual_mape:.2f}%")
    print(f"\n  Actual Value Range: {y_val_actual.min():.2f} - {y_val_actual.max():.2f}")
    print(f"  Predicted Value Range: {y_pred_actual.min():.2f} - {y_pred_actual.max():.2f}")

    # Per-step accuracy
    print(f"\nPer-Step Accuracy (first 6 steps):")
    for step in range(min(6, y_val.shape[1])):
        step_mae = np.mean(np.abs(y_val[:, step] - y_pred[:, step]))
        step_actual = processor.inverse_transform_target(y_val[:, step].reshape(-1, 1)).flatten()
        step_pred = processor.inverse_transform_target(y_pred[:, step].reshape(-1, 1)).flatten()
        step_mae_actual = np.mean(np.abs(step_actual - step_pred))
        print(f"  Step {step + 1}: MAE = {step_mae_actual:.4f}")

    # Growth rate analysis for height predictions
    growth_analysis = None
    if model_type == 'height':
        # Compare predicted growth with actual growth
        actual_growth = y_val_actual[-1] - y_val_actual[0]
        predicted_growth = y_pred_actual[-1] - y_pred_actual[0]

        growth_analysis = {
            'actual_start': float(y_val_actual[0]),
            'actual_end': float(y_val_actual[-1]),
            'actual_growth': float(actual_growth),
            'predicted_growth': float(predicted_growth),
            'growth_error': float(np.abs(actual_growth - predicted_growth))
        }

        print(f"\nGrowth Analysis:")
        print(f"  Actual Start: {growth_analysis['actual_start']:.2f} cm")
        print(f"  Actual End: {growth_analysis['actual_end']:.2f} cm")
        print(f"  Actual Total Growth: {growth_analysis['actual_growth']:.2f} cm")
        print(f"  Predicted Total Growth: {growth_analysis['predicted_growth']:.2f} cm")
        print(f"  Growth Prediction Error: {growth_analysis['growth_error']:.2f} cm")

    # Visualization
    if visualize:
        try:
            import matplotlib.pyplot as plt

            fig, axes = plt.subplots(2, 2, figsize=(14, 10))

            # Plot 1: Actual vs Predicted (sample)
            sample_size = min(100, len(y_val_actual))
            axes[0, 0].plot(y_val_actual[:sample_size], label='Actual', alpha=0.7)
            axes[0, 0].plot(y_pred_actual[:sample_size], label='Predicted', alpha=0.7)
            axes[0, 0].set_title(f'Actual vs Predicted ({target})')
            axes[0, 0].set_xlabel('Sample')
            axes[0, 0].set_ylabel(f'{target}')
            axes[0, 0].legend()
            axes[0, 0].grid(True, alpha=0.3)

            # Plot 2: Scatter plot
            axes[0, 1].scatter(y_val_actual, y_pred_actual, alpha=0.5, s=10)
            min_val = min(y_val_actual.min(), y_pred_actual.min())
            max_val = max(y_val_actual.max(), y_pred_actual.max())
            axes[0, 1].plot([min_val, max_val], [min_val, max_val], 'r--', label='Perfect Prediction')
            axes[0, 1].set_title(f'Prediction Scatter Plot (R² = {r2:.4f})')
            axes[0, 1].set_xlabel('Actual')
            axes[0, 1].set_ylabel('Predicted')
            axes[0, 1].legend()
            axes[0, 1].grid(True, alpha=0.3)

            # Plot 3: Error distribution
            errors = y_val_actual - y_pred_actual
            axes[1, 0].hist(errors, bins=50, edgecolor='black', alpha=0.7)
            axes[1, 0].axvline(x=0, color='r', linestyle='--')
            axes[1, 0].set_title(f'Prediction Error Distribution (MAE = {actual_mae:.4f})')
            axes[1, 0].set_xlabel('Error')
            axes[1, 0].set_ylabel('Frequency')
            axes[1, 0].grid(True, alpha=0.3)

            # Plot 4: Per-step MAE
            step_maes = []
            for step in range(y_val.shape[1]):
                step_actual = processor.inverse_transform_target(y_val[:, step].reshape(-1, 1)).flatten()
                step_pred = processor.inverse_transform_target(y_pred[:, step].reshape(-1, 1)).flatten()
                step_maes.append(np.mean(np.abs(step_actual - step_pred)))

            axes[1, 1].bar(range(1, len(step_maes) + 1), step_maes, alpha=0.7)
            axes[1, 1].set_title('Per-Step MAE')
            axes[1, 1].set_xlabel('Prediction Step')
            axes[1, 1].set_ylabel('MAE')
            axes[1, 1].grid(True, alpha=0.3)

            plt.tight_layout()

            # Save plot
            plot_path = f"{model_path}_validation.png"
            plt.savefig(plot_path, dpi=150)
            print(f"\nValidation plot saved to: {plot_path}")

            plt.show()

        except ImportError:
            print("\nMatplotlib not available for visualization")

    # Compile results
    results = {
        'model_type': model_type,
        'horizon': horizon,
        'model_path': model_path,
        'validation_date': datetime.now().isoformat(),
        'metrics': {
            'scaled': {
                'mse': float(mse),
                'rmse': float(rmse),
                'mae': float(mae),
                'mape': float(mape),
                'r2': float(r2)
            },
            'actual_scale': {
                'mse': float(actual_mse),
                'rmse': float(actual_rmse),
                'mae': float(actual_mae),
                'mape': float(actual_mape)
            }
        },
        'value_ranges': {
            'actual': {
                'min': float(y_val_actual.min()),
                'max': float(y_val_actual.max()),
                'mean': float(y_val_actual.mean())
            },
            'predicted': {
                'min': float(y_pred_actual.min()),
                'max': float(y_pred_actual.max()),
                'mean': float(y_pred_actual.mean())
            }
        },
        'samples': int(len(y_val)),
        'growth_analysis': growth_analysis
    }

    # Save results
    results_path = f"{model_path}_validation.json"
    with open(results_path, 'w') as f:
        json.dump(results, f, indent=2)
    print(f"\nValidation results saved to: {results_path}")

    # Quality assessment
    print("\n" + "="*70)
    print("Model Quality Assessment")
    print("="*70)

    if r2 >= 0.9:
        quality = "EXCELLENT"
    elif r2 >= 0.8:
        quality = "GOOD"
    elif r2 >= 0.7:
        quality = "ACCEPTABLE"
    elif r2 >= 0.5:
        quality = "POOR"
    else:
        quality = "VERY POOR"

    print(f"  Overall Quality: {quality}")
    print(f"  R² Score: {r2:.4f}")
    print(f"  MAPE: {actual_mape:.2f}%")

    if actual_mape < 5:
        print("  Prediction Accuracy: Highly Accurate (<5% error)")
    elif actual_mape < 10:
        print("  Prediction Accuracy: Accurate (5-10% error)")
    elif actual_mape < 20:
        print("  Prediction Accuracy: Moderately Accurate (10-20% error)")
    else:
        print("  Prediction Accuracy: Needs Improvement (>20% error)")

    return results


def validate_all_models(
    data_dir: str = '..',
    models_dir: str = './trained_models',
    horizons: list = ['short']
) -> Dict[str, Dict]:
    """
    Validate all trained models.

    Args:
        data_dir: Directory containing CSV files
        models_dir: Directory containing trained models
        horizons: List of horizons to validate

    Returns:
        Dictionary of all validation results
    """
    all_results = {}

    model_types = ['height', 'fish_temp', 'fish_ph', 'fish_ec', 'fish_turbidity',
                   'plant_temp', 'plant_humidity']

    for horizon in horizons:
        for model_type in model_types:
            key = f"{model_type}_{horizon}"
            try:
                results = validate_model(
                    model_type=model_type,
                    horizon=horizon,
                    data_dir=data_dir,
                    models_dir=models_dir
                )
                all_results[key] = results
            except FileNotFoundError as e:
                print(f"\n{key}: No model found - {e}")
                all_results[key] = {'error': str(e)}
            except Exception as e:
                print(f"\n{key}: Validation failed - {e}")
                all_results[key] = {'error': str(e)}

    # Print summary
    print("\n" + "="*70)
    print("Validation Summary")
    print("="*70)

    for key, result in all_results.items():
        if 'error' in result:
            print(f"  {key}: FAILED - {result['error'][:50]}...")
        else:
            r2 = result['metrics']['scaled']['r2']
            mape = result['metrics']['actual_scale']['mape']
            print(f"  {key}: R²={r2:.4f}, MAPE={mape:.2f}%")

    return all_results


def main():
    """Main entry point."""
    parser = argparse.ArgumentParser(
        description='AquaNexus LSTM Model Validation',
        formatter_class=argparse.RawDescriptionHelpFormatter
    )

    parser.add_argument(
        '--model-type',
        type=str,
        default='height',
        choices=list(FEATURE_CONFIGS.keys()),
        help='Type of model to validate'
    )
    parser.add_argument(
        '--horizon',
        type=str,
        default='short',
        choices=['short', 'medium'],
        help='Prediction horizon'
    )
    parser.add_argument(
        '--data-dir',
        type=str,
        default='..',
        help='Directory containing CSV files'
    )
    parser.add_argument(
        '--models-dir',
        type=str,
        default='./trained_models',
        help='Directory containing trained models'
    )
    parser.add_argument(
        '--visualize',
        action='store_true',
        help='Generate validation plots'
    )
    parser.add_argument(
        '--validate-all',
        action='store_true',
        help='Validate all trained models'
    )

    args = parser.parse_args()

    print("\n" + "="*70)
    print("AquaNexus LSTM Model Validation")
    print("="*70)

    try:
        if args.validate_all:
            results = validate_all_models(
                data_dir=args.data_dir,
                models_dir=args.models_dir
            )
        else:
            results = validate_model(
                model_type=args.model_type,
                horizon=args.horizon,
                data_dir=args.data_dir,
                models_dir=args.models_dir,
                visualize=args.visualize
            )

    except Exception as e:
        print(f"\nError: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)


if __name__ == '__main__':
    main()
