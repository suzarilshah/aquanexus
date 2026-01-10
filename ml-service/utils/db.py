"""
Database Utilities for ML Service

Provides functions to fetch training data and save model metadata.
"""

import os
import json
from datetime import datetime, timedelta
from typing import Dict, List, Optional
from dotenv import load_dotenv

# Load environment variables
load_dotenv()


def get_db_connection():
    """
    Get database connection using psycopg2.

    Returns:
        Database connection object
    """
    import psycopg2

    database_url = os.environ.get('DATABASE_URL')
    if not database_url:
        raise ValueError("DATABASE_URL environment variable not set")

    return psycopg2.connect(database_url)


def fetch_readings(
    device_id: str,
    reading_type: str = 'plant',
    days: int = 180,
    include_height: bool = True
) -> List[Dict]:
    """
    Fetch sensor readings from the database.

    Args:
        device_id: Device ID to fetch readings for
        reading_type: 'plant' or 'fish'
        days: Number of days of historical data to fetch
        include_height: Whether to include height data (plant only)

    Returns:
        List of reading dictionaries
    """
    conn = get_db_connection()
    cursor = conn.cursor()

    start_date = datetime.now() - timedelta(days=days)

    if reading_type == 'plant':
        if include_height:
            query = """
                SELECT timestamp, soil_moisture, light_level, temperature, humidity, height
                FROM plant_readings
                WHERE device_id = %s AND timestamp >= %s
                ORDER BY timestamp ASC
            """
        else:
            query = """
                SELECT timestamp, soil_moisture, light_level, temperature, humidity
                FROM plant_readings
                WHERE device_id = %s AND timestamp >= %s
                ORDER BY timestamp ASC
            """
    else:  # fish
        query = """
            SELECT timestamp, temperature, ph, dissolved_oxygen, turbidity, tds
            FROM fish_readings
            WHERE device_id = %s AND timestamp >= %s
            ORDER BY timestamp ASC
        """

    cursor.execute(query, (device_id, start_date))
    columns = [desc[0] for desc in cursor.description]
    rows = cursor.fetchall()

    cursor.close()
    conn.close()

    # Convert to list of dicts
    readings = []
    for row in rows:
        reading = {}
        for i, col in enumerate(columns):
            value = row[i]
            if isinstance(value, datetime):
                reading[col] = value.isoformat()
            elif value is not None:
                reading[col] = float(value) if col != 'timestamp' else value
            else:
                reading[col] = None
        readings.append(reading)

    return readings


def fetch_growth_data(device_id: str, days: int = 180) -> List[Dict]:
    """
    Fetch plant growth data from the database.

    Args:
        device_id: Device ID
        days: Number of days of data

    Returns:
        List of growth record dictionaries
    """
    conn = get_db_connection()
    cursor = conn.cursor()

    start_date = datetime.now() - timedelta(days=days)

    query = """
        SELECT measured_at, height, growth_rate, growth_stage, days_from_planting
        FROM plant_growth
        WHERE device_id = %s AND measured_at >= %s
        ORDER BY measured_at ASC
    """

    cursor.execute(query, (device_id, start_date))
    columns = [desc[0] for desc in cursor.description]
    rows = cursor.fetchall()

    cursor.close()
    conn.close()

    readings = []
    for row in rows:
        reading = {}
        for i, col in enumerate(columns):
            value = row[i]
            if isinstance(value, datetime):
                reading[col] = value.isoformat()
            elif value is not None:
                # Map column names
                if col == 'measured_at':
                    reading['timestamp'] = value.isoformat() if isinstance(value, datetime) else value
                else:
                    reading[col] = float(value) if isinstance(value, (int, float)) else value
            else:
                reading[col] = None
        readings.append(reading)

    return readings


def save_model_metadata(
    model_type: str,
    model_version: str,
    metrics: Dict,
    hyperparameters: Dict,
    model_path: str
) -> str:
    """
    Save model metadata to the database.

    Args:
        model_type: Type of model
        model_version: Version string
        metrics: Training metrics
        hyperparameters: Model hyperparameters
        model_path: Path to saved model

    Returns:
        ID of the created record
    """
    conn = get_db_connection()
    cursor = conn.cursor()

    query = """
        INSERT INTO ml_models (model_type, model_version, trained_at, metrics, hyperparameters, model_path, is_active)
        VALUES (%s, %s, %s, %s, %s, %s, false)
        RETURNING id
    """

    cursor.execute(query, (
        model_type,
        model_version,
        datetime.now(),
        json.dumps(metrics),
        json.dumps(hyperparameters),
        model_path
    ))

    model_id = cursor.fetchone()[0]
    conn.commit()

    cursor.close()
    conn.close()

    return str(model_id)


def set_active_model(model_id: str, model_type: str) -> None:
    """
    Set a model as the active model for its type.

    Args:
        model_id: ID of model to activate
        model_type: Type of model
    """
    conn = get_db_connection()
    cursor = conn.cursor()

    # Deactivate all models of this type
    cursor.execute(
        "UPDATE ml_models SET is_active = false WHERE model_type = %s",
        (model_type,)
    )

    # Activate the specified model
    cursor.execute(
        "UPDATE ml_models SET is_active = true WHERE id = %s",
        (model_id,)
    )

    conn.commit()
    cursor.close()
    conn.close()


def get_active_model(model_type: str) -> Optional[Dict]:
    """
    Get the currently active model for a type.

    Args:
        model_type: Type of model

    Returns:
        Model metadata dict or None
    """
    conn = get_db_connection()
    cursor = conn.cursor()

    query = """
        SELECT id, model_type, model_version, trained_at, metrics, hyperparameters, model_path
        FROM ml_models
        WHERE model_type = %s AND is_active = true
        LIMIT 1
    """

    cursor.execute(query, (model_type,))
    row = cursor.fetchone()

    cursor.close()
    conn.close()

    if not row:
        return None

    return {
        'id': str(row[0]),
        'model_type': row[1],
        'model_version': row[2],
        'trained_at': row[3].isoformat() if row[3] else None,
        'metrics': row[4],
        'hyperparameters': row[5],
        'model_path': row[6]
    }


def save_prediction(
    device_id: str,
    metric_type: str,
    prediction_horizon: str,
    predicted_values: List[Dict],
    model_version: str
) -> str:
    """
    Save a prediction to the database.

    Args:
        device_id: Device ID
        metric_type: Type of metric predicted
        prediction_horizon: 'short' or 'medium'
        predicted_values: List of prediction dicts
        model_version: Version of model used

    Returns:
        ID of the created prediction
    """
    conn = get_db_connection()
    cursor = conn.cursor()

    query = """
        INSERT INTO predictions (device_id, metric_type, prediction_horizon, predicted_values, model_version)
        VALUES (%s, %s, %s, %s, %s)
        RETURNING id
    """

    cursor.execute(query, (
        device_id,
        metric_type,
        prediction_horizon,
        json.dumps(predicted_values),
        model_version
    ))

    prediction_id = cursor.fetchone()[0]
    conn.commit()

    cursor.close()
    conn.close()

    return str(prediction_id)
