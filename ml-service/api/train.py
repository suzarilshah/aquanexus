"""
Training API Handler

This module provides model training functionality that can be:
1. Run as a standalone script
2. Triggered via API
3. Run as a scheduled job (cron)
"""

import json
import sys
import os
from datetime import datetime, timedelta
from typing import Dict, List, Optional

# Add parent directory to path for imports
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from models.trainer import ModelTrainer, train_all_models


def train_model(
    readings: List[Dict],
    model_type: str = 'height',
    prediction_horizon: str = 'short',
    models_dir: str = './trained_models',
    epochs: int = 100,
    batch_size: int = 32
) -> Dict:
    """
    Train a single model.

    Args:
        readings: Training data
        model_type: Type of model to train
        prediction_horizon: 'short' or 'medium'
        models_dir: Directory to save trained models
        epochs: Maximum training epochs
        batch_size: Training batch size

    Returns:
        Training results
    """
    try:
        trainer = ModelTrainer(model_type, models_dir, prediction_horizon)
        results = trainer.train(
            readings=readings,
            epochs=epochs,
            batch_size=batch_size
        )

        return {
            'success': True,
            'results': results
        }

    except Exception as e:
        return {
            'success': False,
            'error': str(e)
        }


def handler(request_body: Dict) -> Dict:
    """
    HTTP handler for serverless deployment.

    Expected request body:
    {
        "readings": [...],
        "model_type": "height",
        "prediction_horizon": "short",
        "epochs": 100,
        "batch_size": 32
    }
    """
    readings = request_body.get('readings', [])
    model_type = request_body.get('model_type', 'height')
    prediction_horizon = request_body.get('prediction_horizon', 'short')
    models_dir = request_body.get('models_dir', './trained_models')
    epochs = request_body.get('epochs', 100)
    batch_size = request_body.get('batch_size', 32)

    if not readings:
        return {
            'success': False,
            'error': 'No readings provided for training'
        }

    if len(readings) < 100:
        return {
            'success': False,
            'error': f'Not enough training data. Got {len(readings)} readings, need at least 100.'
        }

    return train_model(
        readings=readings,
        model_type=model_type,
        prediction_horizon=prediction_horizon,
        models_dir=models_dir,
        epochs=epochs,
        batch_size=batch_size
    )


# CLI interface
if __name__ == '__main__':
    import argparse

    parser = argparse.ArgumentParser(description='Train LSTM model')
    parser.add_argument('--input', '-i', type=str, required=True,
                        help='JSON file with training readings')
    parser.add_argument('--model-type', '-m', type=str, default='height',
                        help='Model type (height, fish_temp, etc.)')
    parser.add_argument('--horizon', type=str, default='short',
                        choices=['short', 'medium'],
                        help='Prediction horizon')
    parser.add_argument('--models-dir', type=str, default='./trained_models',
                        help='Directory to save trained models')
    parser.add_argument('--epochs', type=int, default=100,
                        help='Maximum training epochs')
    parser.add_argument('--batch-size', type=int, default=32,
                        help='Training batch size')
    parser.add_argument('--output', '-o', type=str,
                        help='Output JSON file for results (default: stdout)')

    args = parser.parse_args()

    # Load input data
    with open(args.input, 'r') as f:
        readings = json.load(f)

    print(f"Loaded {len(readings)} readings for training")

    # Train model
    result = train_model(
        readings=readings,
        model_type=args.model_type,
        prediction_horizon=args.horizon,
        models_dir=args.models_dir,
        epochs=args.epochs,
        batch_size=args.batch_size
    )

    # Output
    output_json = json.dumps(result, indent=2)
    if args.output:
        with open(args.output, 'w') as f:
            f.write(output_json)
        print(f"Results saved to {args.output}")
    else:
        print(output_json)
