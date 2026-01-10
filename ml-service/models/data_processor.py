"""
Data Processor for LSTM Time Series Forecasting

Handles data preprocessing, sequence creation, and normalization
for aquaponics telemetry data.
"""

import numpy as np
import pandas as pd
from sklearn.preprocessing import MinMaxScaler
from typing import Tuple, List, Dict, Optional, Union
from datetime import datetime, timedelta
import json


class DataProcessor:
    """
    Processes raw telemetry data for LSTM model training and inference.
    """

    def __init__(
        self,
        sequence_length: int = 24,
        prediction_steps: int = 24,
        feature_columns: Optional[List[str]] = None,
        target_column: str = 'height'
    ):
        """
        Initialize the data processor.

        Args:
            sequence_length: Number of historical time steps for input sequences
            prediction_steps: Number of future time steps to predict
            feature_columns: List of feature column names to use
            target_column: Name of the target column to predict
        """
        self.sequence_length = sequence_length
        self.prediction_steps = prediction_steps
        self.feature_columns = feature_columns or [target_column]
        self.target_column = target_column
        self.scaler = MinMaxScaler(feature_range=(0, 1))
        self.target_scaler = MinMaxScaler(feature_range=(0, 1))
        self.is_fitted = False

    def prepare_dataframe(
        self,
        data: Union[List[Dict], pd.DataFrame],
        timestamp_column: str = 'timestamp',
        resample_freq: Optional[str] = None
    ) -> pd.DataFrame:
        """
        Prepare raw data into a clean DataFrame.

        Args:
            data: Raw data as list of dicts or DataFrame
            timestamp_column: Name of timestamp column
            resample_freq: Frequency for resampling (e.g., '1H' for hourly)

        Returns:
            Cleaned and prepared DataFrame
        """
        if isinstance(data, list):
            df = pd.DataFrame(data)
        else:
            df = data.copy()

        # Convert timestamp to datetime
        if timestamp_column in df.columns:
            df[timestamp_column] = pd.to_datetime(df[timestamp_column])
            df = df.set_index(timestamp_column)
            df = df.sort_index()

        # Convert numeric columns
        for col in self.feature_columns:
            if col in df.columns:
                df[col] = pd.to_numeric(df[col], errors='coerce')

        # Resample if needed
        if resample_freq:
            df = df.resample(resample_freq).mean()

        # Handle missing values with forward/backward fill
        df = df.ffill().bfill()

        return df

    def fit(self, df: pd.DataFrame) -> 'DataProcessor':
        """
        Fit the scalers on the training data.

        Args:
            df: Training DataFrame

        Returns:
            Self for method chaining
        """
        # Fit feature scaler
        feature_data = df[self.feature_columns].values
        self.scaler.fit(feature_data)

        # Fit target scaler separately for inverse transform
        if self.target_column in df.columns:
            target_data = df[[self.target_column]].values
            self.target_scaler.fit(target_data)

        self.is_fitted = True
        return self

    def transform(self, df: pd.DataFrame) -> np.ndarray:
        """
        Transform data using fitted scalers.

        Args:
            df: DataFrame to transform

        Returns:
            Scaled numpy array
        """
        if not self.is_fitted:
            raise ValueError("Scaler not fitted. Call fit() first.")

        feature_data = df[self.feature_columns].values
        return self.scaler.transform(feature_data)

    def fit_transform(self, df: pd.DataFrame) -> np.ndarray:
        """Fit and transform in one step."""
        self.fit(df)
        return self.transform(df)

    def inverse_transform_target(self, predictions: np.ndarray) -> np.ndarray:
        """
        Inverse transform predictions back to original scale.

        Args:
            predictions: Scaled predictions

        Returns:
            Predictions in original scale
        """
        # Reshape for scaler if needed
        if predictions.ndim == 1:
            predictions = predictions.reshape(-1, 1)
        return self.target_scaler.inverse_transform(predictions)

    def create_sequences(
        self,
        data: np.ndarray,
        target_idx: int = 0
    ) -> Tuple[np.ndarray, np.ndarray]:
        """
        Create input/output sequences for LSTM training.

        Args:
            data: Scaled data array of shape (samples, features)
            target_idx: Index of target feature in the data

        Returns:
            Tuple of (X, y) arrays for training
        """
        X, y = [], []

        for i in range(len(data) - self.sequence_length - self.prediction_steps + 1):
            # Input sequence: all features
            X.append(data[i:(i + self.sequence_length)])
            # Target: future values of target feature
            y.append(data[
                (i + self.sequence_length):(i + self.sequence_length + self.prediction_steps),
                target_idx
            ])

        return np.array(X), np.array(y)

    def create_inference_sequence(
        self,
        df: pd.DataFrame,
        last_n: Optional[int] = None
    ) -> np.ndarray:
        """
        Create a single sequence for inference.

        Args:
            df: DataFrame with recent data
            last_n: Use last N rows (defaults to sequence_length)

        Returns:
            Input sequence of shape (1, sequence_length, features)
        """
        n = last_n or self.sequence_length

        # Get last n rows
        recent_data = df.tail(n)

        # Transform
        scaled_data = self.transform(recent_data)

        # Reshape for model input
        return scaled_data.reshape(1, n, -1)

    def generate_future_timestamps(
        self,
        last_timestamp: datetime,
        horizon: str = 'short',
        freq_minutes: int = 60
    ) -> List[str]:
        """
        Generate future timestamps for predictions.

        Args:
            last_timestamp: Last known timestamp
            horizon: 'short' or 'medium'
            freq_minutes: Minutes between predictions

        Returns:
            List of ISO format timestamp strings
        """
        if horizon == 'short':
            steps = 24
            delta = timedelta(minutes=freq_minutes)
        else:  # medium
            steps = 7
            delta = timedelta(days=1)

        timestamps = []
        current = last_timestamp
        for _ in range(steps):
            current = current + delta
            timestamps.append(current.isoformat())

        return timestamps

    def save_params(self, path: str) -> None:
        """Save scaler parameters and config."""
        params = {
            'sequence_length': self.sequence_length,
            'prediction_steps': self.prediction_steps,
            'feature_columns': self.feature_columns,
            'target_column': self.target_column,
            'scaler_min': self.scaler.data_min_.tolist() if self.is_fitted else None,
            'scaler_max': self.scaler.data_max_.tolist() if self.is_fitted else None,
            'target_scaler_min': self.target_scaler.data_min_.tolist() if self.is_fitted else None,
            'target_scaler_max': self.target_scaler.data_max_.tolist() if self.is_fitted else None,
        }
        with open(path, 'w') as f:
            json.dump(params, f)

    def load_params(self, path: str) -> None:
        """Load scaler parameters and config."""
        with open(path, 'r') as f:
            params = json.load(f)

        self.sequence_length = params['sequence_length']
        self.prediction_steps = params['prediction_steps']
        self.feature_columns = params['feature_columns']
        self.target_column = params['target_column']

        if params.get('scaler_min') is not None:
            self.scaler.data_min_ = np.array(params['scaler_min'])
            self.scaler.data_max_ = np.array(params['scaler_max'])
            self.scaler.scale_ = 1 / (self.scaler.data_max_ - self.scaler.data_min_)
            self.scaler.min_ = -self.scaler.data_min_ * self.scaler.scale_

            self.target_scaler.data_min_ = np.array(params['target_scaler_min'])
            self.target_scaler.data_max_ = np.array(params['target_scaler_max'])
            self.target_scaler.scale_ = 1 / (self.target_scaler.data_max_ - self.target_scaler.data_min_)
            self.target_scaler.min_ = -self.target_scaler.data_min_ * self.target_scaler.scale_

            self.is_fitted = True


def prepare_training_data(
    readings: List[Dict],
    feature_columns: List[str],
    target_column: str,
    sequence_length: int = 24,
    prediction_steps: int = 24,
    test_split: float = 0.2,
    resample_freq: str = '1H'
) -> Tuple[np.ndarray, np.ndarray, np.ndarray, np.ndarray, DataProcessor]:
    """
    Convenience function to prepare training and test data.

    Args:
        readings: List of reading dictionaries
        feature_columns: Columns to use as features
        target_column: Column to predict
        sequence_length: Input sequence length
        prediction_steps: Output prediction steps
        test_split: Fraction for test set
        resample_freq: Resampling frequency

    Returns:
        X_train, X_test, y_train, y_test, processor
    """
    processor = DataProcessor(
        sequence_length=sequence_length,
        prediction_steps=prediction_steps,
        feature_columns=feature_columns,
        target_column=target_column
    )

    # Prepare and process data
    df = processor.prepare_dataframe(readings, resample_freq=resample_freq)
    scaled_data = processor.fit_transform(df)

    # Find target index
    target_idx = feature_columns.index(target_column) if target_column in feature_columns else 0

    # Create sequences
    X, y = processor.create_sequences(scaled_data, target_idx=target_idx)

    # Split data
    split_idx = int(len(X) * (1 - test_split))
    X_train, X_test = X[:split_idx], X[split_idx:]
    y_train, y_test = y[:split_idx], y[split_idx:]

    return X_train, X_test, y_train, y_test, processor
