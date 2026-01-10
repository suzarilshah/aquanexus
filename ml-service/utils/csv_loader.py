"""
CSV Data Loader for Aquaponics Training Data

Loads and preprocesses CSV files containing:
- Fish environment data: Water Temperature, EC Values, TDS, Turbidity, Water pH
- Plant environment data: Height of the Plant, Plant Temperature, Humidity, Pressure

The data is sampled at approximately 5-hour intervals.
"""

import pandas as pd
import numpy as np
from pathlib import Path
from typing import Tuple, Dict, Optional, List
from datetime import datetime


# CSV column mappings for standardization
CSV_COLUMN_MAPPINGS = {
    'fish': {
        'Timestamp': 'timestamp',
        'Water Temperature(°C)': 'water_temperature',
        'EC Values(uS/cm': 'ec_value',  # Note: CSV header has typo with missing )
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

# Feature configurations for different model types
FEATURE_CONFIGS = {
    'height': {
        'features': ['height', 'temperature', 'humidity', 'pressure'],
        'target': 'height',
        'data_type': 'plant'
    },
    'plant_temp': {
        'features': ['temperature', 'humidity', 'pressure', 'height'],
        'target': 'temperature',
        'data_type': 'plant'
    },
    'plant_humidity': {
        'features': ['humidity', 'temperature', 'pressure', 'height'],
        'target': 'humidity',
        'data_type': 'plant'
    },
    'fish_temp': {
        'features': ['water_temperature', 'ec_value', 'tds', 'turbidity', 'water_ph'],
        'target': 'water_temperature',
        'data_type': 'fish'
    },
    'fish_ph': {
        'features': ['water_ph', 'water_temperature', 'ec_value', 'tds', 'turbidity'],
        'target': 'water_ph',
        'data_type': 'fish'
    },
    'fish_ec': {
        'features': ['ec_value', 'tds', 'water_temperature', 'water_ph', 'turbidity'],
        'target': 'ec_value',
        'data_type': 'fish'
    },
    'fish_turbidity': {
        'features': ['turbidity', 'water_temperature', 'water_ph', 'ec_value', 'tds'],
        'target': 'turbidity',
        'data_type': 'fish'
    }
}


def load_csv(file_path: str, data_type: str) -> pd.DataFrame:
    """
    Load a CSV file and standardize column names.

    Args:
        file_path: Path to the CSV file
        data_type: Type of data ('fish' or 'plant')

    Returns:
        DataFrame with standardized column names
    """
    # Read CSV with BOM handling
    df = pd.read_csv(file_path, encoding='utf-8-sig')

    # Get column mapping
    column_mapping = CSV_COLUMN_MAPPINGS.get(data_type, {})

    # Clean column names and apply mapping
    cleaned_mapping = {}
    for orig_col in df.columns:
        # Clean the column name
        clean_col = orig_col.strip()
        # Find matching mapping
        for csv_col, standard_col in column_mapping.items():
            if csv_col in clean_col or clean_col.startswith(csv_col):
                cleaned_mapping[orig_col] = standard_col
                break

    # Rename columns
    df = df.rename(columns=cleaned_mapping)

    # Parse timestamp
    if 'timestamp' in df.columns:
        df['timestamp'] = pd.to_datetime(df['timestamp'])
        df = df.set_index('timestamp')
        df = df.sort_index()

    # Convert numeric columns
    for col in df.columns:
        df[col] = pd.to_numeric(df[col], errors='coerce')

    # Handle missing values
    df = df.ffill().bfill()

    return df


def load_training_data(
    train_path: str,
    data_type: str
) -> pd.DataFrame:
    """
    Load training data from a CSV file.

    Args:
        train_path: Path to training CSV file
        data_type: Type of data ('fish' or 'plant')

    Returns:
        Training DataFrame
    """
    df = load_csv(train_path, data_type)
    print(f"Loaded training data: {len(df)} records from {train_path}")
    print(f"Columns: {list(df.columns)}")
    print(f"Date range: {df.index.min()} to {df.index.max()}")
    return df


def load_validation_data(
    val_path: str,
    data_type: str
) -> pd.DataFrame:
    """
    Load validation data from a CSV file.

    Args:
        val_path: Path to validation CSV file
        data_type: Type of data ('fish' or 'plant')

    Returns:
        Validation DataFrame
    """
    df = load_csv(val_path, data_type)
    print(f"Loaded validation data: {len(df)} records from {val_path}")
    print(f"Columns: {list(df.columns)}")
    print(f"Date range: {df.index.min()} to {df.index.max()}")
    return df


def load_aquanexus_data(
    base_path: str = '..',
    model_type: str = 'height'
) -> Tuple[pd.DataFrame, pd.DataFrame, Dict]:
    """
    Load AquaNexus training and validation data for a specific model type.

    The CSV files are expected at:
    - {base_path}/fish_initial.csv (fish training)
    - {base_path}/fish_validate.csv (fish validation)
    - {base_path}/plant_initial.csv (plant training)
    - {base_path}/plant_validate.csv (plant validation)

    Args:
        base_path: Base path to the CSV files
        model_type: Type of model to train

    Returns:
        Tuple of (train_df, val_df, config)
    """
    base = Path(base_path)

    # Get configuration
    config = FEATURE_CONFIGS.get(model_type)
    if config is None:
        raise ValueError(f"Unknown model type: {model_type}. Available: {list(FEATURE_CONFIGS.keys())}")

    data_type = config['data_type']

    # Determine file paths
    if data_type == 'fish':
        train_file = base / 'fish_initial.csv'
        val_file = base / 'fish_validate.csv'
    else:
        train_file = base / 'plant_initial.csv'
        val_file = base / 'plant_validate.csv'

    # Load data
    train_df = load_training_data(str(train_file), data_type)
    val_df = load_validation_data(str(val_file), data_type)

    # Verify required columns exist
    required_cols = config['features']
    for col in required_cols:
        if col not in train_df.columns:
            raise ValueError(f"Required column '{col}' not found in training data. Available: {list(train_df.columns)}")
        if col not in val_df.columns:
            raise ValueError(f"Required column '{col}' not found in validation data. Available: {list(val_df.columns)}")

    return train_df, val_df, config


def analyze_data(df: pd.DataFrame, name: str = "Data") -> Dict:
    """
    Perform basic analysis on the data.

    Args:
        df: DataFrame to analyze
        name: Name for display

    Returns:
        Dictionary with statistics
    """
    print(f"\n{'='*60}")
    print(f"{name} Analysis")
    print(f"{'='*60}")

    stats = {
        'records': len(df),
        'date_range': (df.index.min(), df.index.max()),
        'columns': list(df.columns),
        'statistics': {}
    }

    print(f"Records: {len(df)}")
    print(f"Date Range: {df.index.min()} to {df.index.max()}")
    print(f"\nColumn Statistics:")

    for col in df.columns:
        col_stats = {
            'min': float(df[col].min()),
            'max': float(df[col].max()),
            'mean': float(df[col].mean()),
            'std': float(df[col].std()),
            'nulls': int(df[col].isna().sum())
        }
        stats['statistics'][col] = col_stats
        print(f"\n  {col}:")
        print(f"    Range: {col_stats['min']:.2f} - {col_stats['max']:.2f}")
        print(f"    Mean: {col_stats['mean']:.2f} (±{col_stats['std']:.2f})")
        print(f"    Nulls: {col_stats['nulls']}")

    return stats


def calculate_growth_rate(df: pd.DataFrame, height_col: str = 'height') -> pd.DataFrame:
    """
    Calculate growth rate from height measurements.

    Args:
        df: DataFrame with height column
        height_col: Name of height column

    Returns:
        DataFrame with added growth_rate column
    """
    if height_col not in df.columns:
        return df

    df = df.copy()

    # Calculate time difference in days
    time_diff = df.index.to_series().diff().dt.total_seconds() / (24 * 3600)

    # Calculate height difference
    height_diff = df[height_col].diff()

    # Growth rate in cm/day
    df['growth_rate'] = height_diff / time_diff

    # Fill NaN for first row
    df['growth_rate'] = df['growth_rate'].fillna(0)

    return df


def resample_data(
    df: pd.DataFrame,
    freq: str = '5H',
    method: str = 'mean'
) -> pd.DataFrame:
    """
    Resample data to a regular frequency.

    Args:
        df: DataFrame to resample
        freq: Target frequency (e.g., '5H' for 5 hours, '1H' for 1 hour)
        method: Aggregation method ('mean', 'first', 'last')

    Returns:
        Resampled DataFrame
    """
    if method == 'mean':
        resampled = df.resample(freq).mean()
    elif method == 'first':
        resampled = df.resample(freq).first()
    elif method == 'last':
        resampled = df.resample(freq).last()
    else:
        raise ValueError(f"Unknown method: {method}")

    # Handle missing values from resampling
    resampled = resampled.ffill().bfill()

    return resampled


if __name__ == '__main__':
    import sys

    # Test loading data
    base_path = '..'  # From ml-service directory

    print("\n" + "="*60)
    print("Testing CSV Data Loader")
    print("="*60)

    # Test plant data loading
    print("\n--- Plant Data ---")
    try:
        train_df, val_df, config = load_aquanexus_data(base_path, 'height')
        print(f"\nConfig: {config}")

        # Analyze data
        analyze_data(train_df, "Plant Training Data")
        analyze_data(val_df, "Plant Validation Data")

        # Calculate growth rate
        train_df = calculate_growth_rate(train_df)
        print(f"\nGrowth rate statistics:")
        print(f"  Mean: {train_df['growth_rate'].mean():.4f} cm/day")
        print(f"  Max: {train_df['growth_rate'].max():.4f} cm/day")

    except Exception as e:
        print(f"Error loading plant data: {e}")

    # Test fish data loading
    print("\n--- Fish Data ---")
    try:
        train_df, val_df, config = load_aquanexus_data(base_path, 'fish_temp')
        print(f"\nConfig: {config}")

        # Analyze data
        analyze_data(train_df, "Fish Training Data")
        analyze_data(val_df, "Fish Validation Data")

    except Exception as e:
        print(f"Error loading fish data: {e}")

    print("\n" + "="*60)
    print("CSV Loader Test Complete")
    print("="*60)
