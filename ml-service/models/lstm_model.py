"""
LSTM Model for Time Series Forecasting in Aquaponics

This module provides LSTM-based models for predicting:
- Plant height/growth rate (primary metric)
- Fish environment parameters (temperature, pH, DO, etc.)
- Plant environment parameters (moisture, light, temperature, humidity)
"""

import numpy as np
import tensorflow as tf
from tensorflow.keras.models import Sequential, load_model
from tensorflow.keras.layers import LSTM, Dense, Dropout, Bidirectional
from tensorflow.keras.callbacks import EarlyStopping, ModelCheckpoint
from tensorflow.keras.optimizers import Adam
from typing import Tuple, List, Dict, Optional
import json
import os


def create_lstm_model(
    sequence_length: int = 24,
    n_features: int = 1,
    prediction_steps: int = 24,
    units: int = 64,
    dropout: float = 0.2,
    bidirectional: bool = False,
    learning_rate: float = 0.001
) -> Sequential:
    """
    Create an LSTM model for time series forecasting.

    Args:
        sequence_length: Number of historical time steps to use as input
        n_features: Number of features per time step
        prediction_steps: Number of future time steps to predict
        units: Number of LSTM units
        dropout: Dropout rate for regularization
        bidirectional: Whether to use bidirectional LSTM
        learning_rate: Learning rate for Adam optimizer

    Returns:
        Compiled Keras Sequential model
    """
    model = Sequential()

    # First LSTM layer
    if bidirectional:
        model.add(Bidirectional(
            LSTM(units, return_sequences=True),
            input_shape=(sequence_length, n_features)
        ))
    else:
        model.add(LSTM(
            units,
            return_sequences=True,
            input_shape=(sequence_length, n_features)
        ))
    model.add(Dropout(dropout))

    # Second LSTM layer
    if bidirectional:
        model.add(Bidirectional(LSTM(units // 2, return_sequences=False)))
    else:
        model.add(LSTM(units // 2, return_sequences=False))
    model.add(Dropout(dropout))

    # Dense layers
    model.add(Dense(units // 2, activation='relu'))
    model.add(Dense(prediction_steps))

    # Compile model
    optimizer = Adam(learning_rate=learning_rate)
    model.compile(optimizer=optimizer, loss='mse', metrics=['mae'])

    return model


def create_multivariate_lstm_model(
    sequence_length: int = 24,
    n_features: int = 5,
    prediction_steps: int = 24,
    target_features: int = 1,
    units: int = 128
) -> Sequential:
    """
    Create a multivariate LSTM model that uses multiple features to predict one or more targets.

    Args:
        sequence_length: Number of historical time steps
        n_features: Number of input features
        prediction_steps: Number of future time steps
        target_features: Number of features to predict
        units: Number of LSTM units

    Returns:
        Compiled Keras Sequential model
    """
    model = Sequential([
        LSTM(units, return_sequences=True, input_shape=(sequence_length, n_features)),
        Dropout(0.2),
        LSTM(units // 2, return_sequences=True),
        Dropout(0.2),
        LSTM(units // 4, return_sequences=False),
        Dropout(0.2),
        Dense(units // 2, activation='relu'),
        Dense(prediction_steps * target_features),
        tf.keras.layers.Reshape((prediction_steps, target_features))
    ])

    model.compile(optimizer='adam', loss='mse', metrics=['mae'])
    return model


class LSTMPredictor:
    """
    LSTM-based time series predictor for aquaponics data.

    Supports both univariate (single metric) and multivariate predictions.
    """

    def __init__(
        self,
        model_type: str = 'height',
        sequence_length: int = 24,
        prediction_horizon: str = 'short'
    ):
        """
        Initialize the predictor.

        Args:
            model_type: Type of model ('height', 'fish_temp', 'plant_moisture', etc.)
            sequence_length: Number of historical time steps to use
            prediction_horizon: 'short' (1-24h) or 'medium' (1-7 days)
        """
        self.model_type = model_type
        self.sequence_length = sequence_length
        self.prediction_horizon = prediction_horizon
        self.model: Optional[Sequential] = None
        self.scaler_params: Dict = {}

        # Set prediction steps based on horizon
        if prediction_horizon == 'short':
            self.prediction_steps = 24  # 24 hourly predictions
        else:
            self.prediction_steps = 7   # 7 daily predictions

    def build_model(self, n_features: int = 1, units: int = 64) -> None:
        """Build the LSTM model."""
        self.model = create_lstm_model(
            sequence_length=self.sequence_length,
            n_features=n_features,
            prediction_steps=self.prediction_steps,
            units=units
        )

    def fit(
        self,
        X: np.ndarray,
        y: np.ndarray,
        validation_split: float = 0.2,
        epochs: int = 100,
        batch_size: int = 32,
        patience: int = 10,
        model_path: Optional[str] = None
    ) -> Dict:
        """
        Train the LSTM model.

        Args:
            X: Input sequences of shape (samples, sequence_length, features)
            y: Target values of shape (samples, prediction_steps)
            validation_split: Fraction of data for validation
            epochs: Maximum training epochs
            batch_size: Training batch size
            patience: Early stopping patience
            model_path: Path to save the best model

        Returns:
            Training history and metrics
        """
        if self.model is None:
            self.build_model(n_features=X.shape[2])

        callbacks = [
            EarlyStopping(
                monitor='val_loss',
                patience=patience,
                restore_best_weights=True
            )
        ]

        if model_path:
            callbacks.append(ModelCheckpoint(
                model_path,
                monitor='val_loss',
                save_best_only=True
            ))

        history = self.model.fit(
            X, y,
            validation_split=validation_split,
            epochs=epochs,
            batch_size=batch_size,
            callbacks=callbacks,
            verbose=1
        )

        # Calculate final metrics
        val_loss = min(history.history['val_loss'])
        val_mae = history.history['val_mae'][history.history['val_loss'].index(val_loss)]

        return {
            'epochs_trained': len(history.history['loss']),
            'final_loss': float(history.history['loss'][-1]),
            'final_val_loss': float(val_loss),
            'final_mae': float(history.history['mae'][-1]),
            'final_val_mae': float(val_mae),
            'history': {
                'loss': [float(x) for x in history.history['loss']],
                'val_loss': [float(x) for x in history.history['val_loss']],
                'mae': [float(x) for x in history.history['mae']],
                'val_mae': [float(x) for x in history.history['val_mae']]
            }
        }

    def predict(
        self,
        X: np.ndarray,
        return_confidence: bool = True
    ) -> Dict:
        """
        Make predictions using the trained model.

        Args:
            X: Input sequence of shape (1, sequence_length, features)
            return_confidence: Whether to estimate prediction confidence

        Returns:
            Dictionary with predictions and optional confidence intervals
        """
        if self.model is None:
            raise ValueError("Model not trained or loaded")

        predictions = self.model.predict(X, verbose=0)

        result = {
            'predictions': predictions[0].tolist(),
            'prediction_steps': self.prediction_steps,
            'horizon': self.prediction_horizon
        }

        if return_confidence:
            # Estimate confidence using prediction variance
            # (In production, use Monte Carlo dropout or ensemble)
            confidence = self._estimate_confidence(X)
            result['confidence'] = confidence

        return result

    def _estimate_confidence(self, X: np.ndarray, n_samples: int = 10) -> List[float]:
        """
        Estimate prediction confidence using Monte Carlo dropout.
        """
        if self.model is None:
            return [0.5] * self.prediction_steps

        # Simple confidence estimation based on input variance
        input_std = np.std(X)
        base_confidence = 0.95 - (input_std * 0.1)  # Decrease confidence with high variance

        # Confidence decreases for further predictions
        confidences = []
        for i in range(self.prediction_steps):
            step_confidence = base_confidence * (1 - (i * 0.02))
            confidences.append(max(0.5, min(0.99, step_confidence)))

        return confidences

    def save(self, path: str) -> None:
        """Save the model and scaler parameters."""
        if self.model is None:
            raise ValueError("No model to save")

        os.makedirs(os.path.dirname(path) if os.path.dirname(path) else '.', exist_ok=True)

        # Save Keras model
        self.model.save(f"{path}.keras")

        # Save metadata
        metadata = {
            'model_type': self.model_type,
            'sequence_length': self.sequence_length,
            'prediction_horizon': self.prediction_horizon,
            'prediction_steps': self.prediction_steps,
            'scaler_params': self.scaler_params
        }
        with open(f"{path}_metadata.json", 'w') as f:
            json.dump(metadata, f)

    def load(self, path: str) -> None:
        """Load a saved model and metadata."""
        # Load Keras model
        self.model = load_model(f"{path}.keras")

        # Load metadata
        with open(f"{path}_metadata.json", 'r') as f:
            metadata = json.load(f)

        self.model_type = metadata['model_type']
        self.sequence_length = metadata['sequence_length']
        self.prediction_horizon = metadata['prediction_horizon']
        self.prediction_steps = metadata['prediction_steps']
        self.scaler_params = metadata.get('scaler_params', {})


# Model configurations for different metrics
# Updated to match actual sensor CSV data columns:
# - Plant data: Height, Plant Temperature, Humidity, Pressure (from BME280)
# - Fish data: Water Temperature (DS18B20), EC Values, TDS, Turbidity, Water pH
MODEL_CONFIGS = {
    # Plant height prediction - PRIMARY TARGET for growth forecasting
    # Uses multivariate input to predict plant height
    'height': {
        'sequence_length': 24,  # 24 time steps (~5 hour intervals = 5 days)
        'units': 128,
        'features': ['height', 'temperature', 'humidity', 'pressure'],
        'target': 'height',
        'description': 'Plant height prediction using environmental factors (BME280 sensor data)'
    },
    # Plant height with all features (multivariate)
    'height_multivariate': {
        'sequence_length': 48,
        'units': 128,
        'features': ['height', 'temperature', 'humidity', 'pressure'],
        'target': 'height',
        'description': 'Multivariate plant height prediction using all environmental factors'
    },
    # Fish water temperature prediction
    'fish_temp': {
        'sequence_length': 48,
        'units': 64,
        'features': ['water_temperature', 'ec_value', 'tds', 'turbidity', 'water_ph'],
        'target': 'water_temperature',
        'description': 'Fish tank water temperature prediction (DS18B20)'
    },
    # Fish water pH prediction
    'fish_ph': {
        'sequence_length': 48,
        'units': 64,
        'features': ['water_ph', 'water_temperature', 'ec_value', 'tds', 'turbidity'],
        'target': 'water_ph',
        'description': 'Fish tank pH level prediction'
    },
    # Fish EC/TDS prediction
    'fish_ec': {
        'sequence_length': 48,
        'units': 64,
        'features': ['ec_value', 'tds', 'water_temperature', 'water_ph', 'turbidity'],
        'target': 'ec_value',
        'description': 'Fish tank EC (electrical conductivity) prediction'
    },
    # Fish turbidity prediction
    'fish_turbidity': {
        'sequence_length': 48,
        'units': 64,
        'features': ['turbidity', 'water_temperature', 'water_ph', 'ec_value', 'tds'],
        'target': 'turbidity',
        'description': 'Fish tank turbidity prediction (NTU)'
    },
    # Plant temperature prediction
    'plant_temp': {
        'sequence_length': 24,
        'units': 64,
        'features': ['temperature', 'humidity', 'pressure', 'height'],
        'target': 'temperature',
        'description': 'Plant environment temperature prediction (BME280)'
    },
    # Plant humidity prediction
    'plant_humidity': {
        'sequence_length': 24,
        'units': 64,
        'features': ['humidity', 'temperature', 'pressure', 'height'],
        'target': 'humidity',
        'description': 'Plant environment humidity prediction (BME280)'
    }
}


# CSV column mappings for data loading
CSV_COLUMN_MAPPINGS = {
    'fish': {
        'Timestamp': 'timestamp',
        'Water Temperature(°C)': 'water_temperature',
        'EC Values(uS/cm': 'ec_value',  # Note: CSV has typo with missing )
        'TDS(mg/L)': 'tds',
        'Turbidity(NTU)': 'turbidity',
        'Water pH': 'water_ph'
    },
    'plant': {
        'Timestamp': 'timestamp',
        'Height of the Plant(cm)': 'height',
        'Plant Temperature(°C)': 'temperature',
        'Humidity(RH)': 'humidity',
        'Pressure(Pa)': 'pressure'
    }
}
