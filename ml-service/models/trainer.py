"""
Model Trainer for Aquaponics LSTM Models

Handles training, evaluation, and model versioning.
"""

import os
import json
from datetime import datetime
from typing import Dict, List, Optional, Tuple
import numpy as np

from .lstm_model import LSTMPredictor, MODEL_CONFIGS
from .data_processor import DataProcessor, prepare_training_data


class ModelTrainer:
    """
    Manages training and versioning of LSTM models.
    """

    def __init__(
        self,
        model_type: str = 'height',
        models_dir: str = './trained_models',
        prediction_horizon: str = 'short'
    ):
        """
        Initialize the trainer.

        Args:
            model_type: Type of model to train
            models_dir: Directory to save trained models
            prediction_horizon: 'short' or 'medium'
        """
        self.model_type = model_type
        self.models_dir = models_dir
        self.prediction_horizon = prediction_horizon

        # Get config for model type
        self.config = MODEL_CONFIGS.get(model_type, MODEL_CONFIGS['height'])

        # Create models directory
        os.makedirs(models_dir, exist_ok=True)

    def train(
        self,
        readings: List[Dict],
        epochs: int = 100,
        batch_size: int = 32,
        validation_split: float = 0.2,
        patience: int = 10
    ) -> Dict:
        """
        Train a new model on the provided data.

        Args:
            readings: List of reading dictionaries
            epochs: Maximum training epochs
            batch_size: Training batch size
            validation_split: Fraction for validation
            patience: Early stopping patience

        Returns:
            Training results and model info
        """
        # Determine parameters based on horizon
        if self.prediction_horizon == 'short':
            sequence_length = self.config['sequence_length']
            prediction_steps = 24
            resample_freq = '1H'  # Hourly
        else:
            sequence_length = 7  # 7 days of data
            prediction_steps = 7  # Predict 7 days
            resample_freq = '1D'  # Daily

        # Get feature columns
        feature_columns = self.config['features']
        target_column = feature_columns[0]  # Primary feature is target

        # Prepare data
        X_train, X_test, y_train, y_test, processor = prepare_training_data(
            readings=readings,
            feature_columns=feature_columns,
            target_column=target_column,
            sequence_length=sequence_length,
            prediction_steps=prediction_steps,
            test_split=0.2,
            resample_freq=resample_freq
        )

        print(f"Training data shape: X={X_train.shape}, y={y_train.shape}")
        print(f"Test data shape: X={X_test.shape}, y={y_test.shape}")

        if len(X_train) < 10:
            raise ValueError(f"Not enough training data. Got {len(X_train)} samples, need at least 10.")

        # Create and train model
        predictor = LSTMPredictor(
            model_type=self.model_type,
            sequence_length=sequence_length,
            prediction_horizon=self.prediction_horizon
        )

        predictor.build_model(
            n_features=len(feature_columns),
            units=self.config['units']
        )

        # Generate version
        version = datetime.now().strftime('%Y%m%d_%H%M%S')
        model_path = os.path.join(
            self.models_dir,
            f"{self.model_type}_{self.prediction_horizon}_{version}"
        )

        # Train
        training_results = predictor.fit(
            X_train, y_train,
            validation_split=validation_split,
            epochs=epochs,
            batch_size=batch_size,
            patience=patience,
            model_path=f"{model_path}.keras"
        )

        # Evaluate on test set
        test_loss, test_mae = predictor.model.evaluate(X_test, y_test, verbose=0)

        # Save model and processor
        predictor.save(model_path)
        processor.save_params(f"{model_path}_processor.json")

        # Calculate additional metrics
        y_pred = predictor.model.predict(X_test, verbose=0)
        mape = np.mean(np.abs((y_test - y_pred) / (y_test + 1e-8))) * 100
        r2 = 1 - np.sum((y_test - y_pred) ** 2) / np.sum((y_test - np.mean(y_test)) ** 2)

        results = {
            'model_type': self.model_type,
            'version': version,
            'prediction_horizon': self.prediction_horizon,
            'model_path': model_path,
            'training': training_results,
            'evaluation': {
                'test_loss': float(test_loss),
                'test_mae': float(test_mae),
                'mape': float(mape),
                'r2': float(r2)
            },
            'hyperparameters': {
                'sequence_length': sequence_length,
                'prediction_steps': prediction_steps,
                'units': self.config['units'],
                'features': feature_columns,
                'epochs': training_results['epochs_trained'],
                'batch_size': batch_size
            },
            'data_info': {
                'total_samples': len(X_train) + len(X_test),
                'train_samples': len(X_train),
                'test_samples': len(X_test),
                'resample_freq': resample_freq
            },
            'trained_at': datetime.now().isoformat()
        }

        # Save results
        with open(f"{model_path}_results.json", 'w') as f:
            json.dump(results, f, indent=2)

        return results

    def load_latest_model(self) -> Tuple[LSTMPredictor, DataProcessor]:
        """
        Load the most recently trained model.

        Returns:
            Tuple of (predictor, processor)
        """
        # Find latest model
        pattern = f"{self.model_type}_{self.prediction_horizon}_"
        model_files = [
            f for f in os.listdir(self.models_dir)
            if f.startswith(pattern) and f.endswith('.keras')
        ]

        if not model_files:
            raise FileNotFoundError(f"No trained model found for {self.model_type}")

        # Sort by version (timestamp in filename)
        model_files.sort(reverse=True)
        latest = model_files[0].replace('.keras', '')
        model_path = os.path.join(self.models_dir, latest)

        # Load predictor
        predictor = LSTMPredictor(
            model_type=self.model_type,
            prediction_horizon=self.prediction_horizon
        )
        predictor.load(model_path)

        # Load processor
        processor = DataProcessor()
        processor.load_params(f"{model_path}_processor.json")

        return predictor, processor

    def get_model_info(self) -> Optional[Dict]:
        """Get info about the latest trained model."""
        try:
            pattern = f"{self.model_type}_{self.prediction_horizon}_"
            result_files = [
                f for f in os.listdir(self.models_dir)
                if f.startswith(pattern) and f.endswith('_results.json')
            ]

            if not result_files:
                return None

            result_files.sort(reverse=True)
            with open(os.path.join(self.models_dir, result_files[0]), 'r') as f:
                return json.load(f)
        except Exception:
            return None


def train_all_models(
    fish_readings: List[Dict],
    plant_readings: List[Dict],
    height_readings: List[Dict],
    models_dir: str = './trained_models'
) -> Dict[str, Dict]:
    """
    Train all configured models.

    Args:
        fish_readings: Fish sensor readings
        plant_readings: Plant sensor readings
        height_readings: Plant height readings
        models_dir: Directory to save models

    Returns:
        Dictionary of training results for each model
    """
    results = {}

    # Train height model (primary)
    if height_readings:
        print("Training height prediction model (short-term)...")
        trainer = ModelTrainer('height', models_dir, 'short')
        results['height_short'] = trainer.train(height_readings)

        print("Training height prediction model (medium-term)...")
        trainer = ModelTrainer('height', models_dir, 'medium')
        results['height_medium'] = trainer.train(height_readings)

    # Train fish models
    if fish_readings:
        for model_type in ['fish_temp', 'fish_ph', 'fish_do']:
            print(f"Training {model_type} model...")
            trainer = ModelTrainer(model_type, models_dir, 'short')
            try:
                results[model_type] = trainer.train(fish_readings)
            except Exception as e:
                print(f"Error training {model_type}: {e}")
                results[model_type] = {'error': str(e)}

    # Train plant models
    if plant_readings:
        for model_type in ['plant_moisture', 'plant_temp']:
            print(f"Training {model_type} model...")
            trainer = ModelTrainer(model_type, models_dir, 'short')
            try:
                results[model_type] = trainer.train(plant_readings)
            except Exception as e:
                print(f"Error training {model_type}: {e}")
                results[model_type] = {'error': str(e)}

    return results
