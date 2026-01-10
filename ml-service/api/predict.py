"""
Prediction API Handler

This module provides prediction functionality that can be used:
1. As a standalone script
2. As a Vercel serverless function
3. Called from Next.js API routes via subprocess
"""

import json
import sys
import os
from datetime import datetime
from typing import Dict, List, Optional

# Add parent directory to path for imports
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from models.lstm_model import LSTMPredictor
from models.data_processor import DataProcessor
from models.trainer import ModelTrainer


def predict(
    readings: List[Dict],
    model_type: str = 'height',
    prediction_horizon: str = 'short',
    models_dir: str = './trained_models'
) -> Dict:
    """
    Make predictions using a trained model.

    Args:
        readings: Recent sensor readings for creating input sequence
        model_type: Type of model to use
        prediction_horizon: 'short' or 'medium'
        models_dir: Directory containing trained models

    Returns:
        Prediction results with timestamps and confidence
    """
    try:
        # Load trainer and model
        trainer = ModelTrainer(model_type, models_dir, prediction_horizon)
        predictor, processor = trainer.load_latest_model()

        # Get model info
        model_info = trainer.get_model_info()

        # Prepare input data
        df = processor.prepare_dataframe(
            readings,
            resample_freq='1H' if prediction_horizon == 'short' else '1D'
        )

        # Check if we have enough data
        if len(df) < processor.sequence_length:
            return {
                'success': False,
                'error': f'Not enough data. Need {processor.sequence_length} points, got {len(df)}'
            }

        # Create inference sequence
        X = processor.create_inference_sequence(df)

        # Make prediction
        result = predictor.predict(X, return_confidence=True)

        # Inverse transform predictions to original scale
        predictions_scaled = result['predictions']
        predictions_original = processor.inverse_transform_target(
            np.array(predictions_scaled)
        ).flatten().tolist()

        # Generate timestamps
        last_timestamp = df.index[-1]
        if isinstance(last_timestamp, str):
            last_timestamp = datetime.fromisoformat(last_timestamp)

        timestamps = processor.generate_future_timestamps(
            last_timestamp,
            horizon=prediction_horizon,
            freq_minutes=60 if prediction_horizon == 'short' else 1440
        )

        # Format output
        predicted_values = [
            {
                'timestamp': ts,
                'value': round(val, 2),
                'confidence': round(conf, 3)
            }
            for ts, val, conf in zip(timestamps, predictions_original, result['confidence'])
        ]

        return {
            'success': True,
            'model_type': model_type,
            'prediction_horizon': prediction_horizon,
            'model_version': model_info.get('version') if model_info else 'unknown',
            'predicted_values': predicted_values,
            'model_metrics': model_info.get('evaluation') if model_info else None,
            'generated_at': datetime.now().isoformat()
        }

    except FileNotFoundError as e:
        return {
            'success': False,
            'error': f'Model not found: {str(e)}',
            'suggestion': 'Please train the model first using the training endpoint.'
        }
    except Exception as e:
        return {
            'success': False,
            'error': str(e)
        }


# Import numpy here to avoid issues if not installed
try:
    import numpy as np
except ImportError:
    np = None


def handler(request_body: Dict) -> Dict:
    """
    HTTP handler for serverless deployment.

    Expected request body:
    {
        "readings": [...],
        "model_type": "height",
        "prediction_horizon": "short"
    }
    """
    readings = request_body.get('readings', [])
    model_type = request_body.get('model_type', 'height')
    prediction_horizon = request_body.get('prediction_horizon', 'short')
    models_dir = request_body.get('models_dir', './trained_models')

    if not readings:
        return {
            'success': False,
            'error': 'No readings provided'
        }

    return predict(readings, model_type, prediction_horizon, models_dir)


# CLI interface
if __name__ == '__main__':
    import argparse

    parser = argparse.ArgumentParser(description='Make LSTM predictions')
    parser.add_argument('--input', '-i', type=str, required=True,
                        help='JSON file with readings')
    parser.add_argument('--model-type', '-m', type=str, default='height',
                        help='Model type (height, fish_temp, etc.)')
    parser.add_argument('--horizon', type=str, default='short',
                        choices=['short', 'medium'],
                        help='Prediction horizon')
    parser.add_argument('--models-dir', type=str, default='./trained_models',
                        help='Directory containing trained models')
    parser.add_argument('--output', '-o', type=str,
                        help='Output JSON file (default: stdout)')

    args = parser.parse_args()

    # Load input data
    with open(args.input, 'r') as f:
        readings = json.load(f)

    # Make prediction
    result = predict(
        readings=readings,
        model_type=args.model_type,
        prediction_horizon=args.horizon,
        models_dir=args.models_dir
    )

    # Output
    output_json = json.dumps(result, indent=2)
    if args.output:
        with open(args.output, 'w') as f:
            f.write(output_json)
    else:
        print(output_json)
