# AquaNexus ML Service

LSTM-based machine learning service for predicting plant growth and aquaponics environment parameters.

## Overview

This ML service provides:
- **Plant Height Prediction**: Primary target for forecasting plant growth rate using LSTM
- **Fish Environment Prediction**: Water temperature, pH, EC, turbidity forecasting
- **Plant Environment Prediction**: Temperature, humidity forecasting

## Data Sources

The training data comes from real sensor measurements:

### Plant Data (BME280 + Ultrasonic Sensor)
- **Height** (cm) - Ultrasonic sensor measuring plant height (PRIMARY TARGET)
- **Temperature** (°C) - Plant environment temperature
- **Humidity** (RH%) - Relative humidity
- **Pressure** (Pa) - Atmospheric pressure

### Fish Data (DS18B20 + TDS + pH + Turbidity Sensors)
- **Water Temperature** (°C) - DS18B20 waterproof sensor
- **EC Value** (µS/cm) - Electrical Conductivity
- **TDS** (mg/L) - Total Dissolved Solids
- **Turbidity** (NTU) - Water clarity
- **Water pH** - Acidity/alkalinity

## Training Data

Located in the project root directory:

| File | Description | Date Range | Records |
|------|-------------|------------|---------|
| `plant_initial.csv` | Plant training data | Mar-May 2024 | ~441 |
| `plant_validate.csv` | Plant validation data | Jun-Aug 2024 | ~444 |
| `fish_initial.csv` | Fish training data | Mar-May 2024 | ~440 |
| `fish_validate.csv` | Fish validation data | Jun-Aug 2024 | ~444 |

## Quick Start

### 1. Install Dependencies

```bash
cd ml-service
pip install -r requirements.txt
```

### 2. Train Plant Height Model (Primary)

```bash
python main.py --model-type height --horizon short
```

### 3. Validate the Model

```bash
python validate.py --model-type height --visualize
```

### 4. Train All Models

```bash
python main.py --train-all
```

## Available Model Types

| Model Type | Target | Features | Description |
|------------|--------|----------|-------------|
| `height` | Plant Height | height, temp, humidity, pressure | **Primary** growth prediction |
| `plant_temp` | Temperature | temp, humidity, pressure, height | Plant environment |
| `plant_humidity` | Humidity | humidity, temp, pressure, height | Plant environment |
| `fish_temp` | Water Temperature | water_temp, ec, tds, turbidity, ph | Fish tank |
| `fish_ph` | Water pH | ph, water_temp, ec, tds, turbidity | Fish tank |
| `fish_ec` | EC Value | ec, tds, water_temp, ph, turbidity | Fish tank |
| `fish_turbidity` | Turbidity | turbidity, water_temp, ph, ec, tds | Fish tank |

## Command Line Options

### Training (`main.py`)

```bash
python main.py [OPTIONS]

Options:
  --model-type TYPE    Model type to train (default: height)
  --horizon HORIZON    Prediction horizon: short (24h) or medium (7d)
  --data-dir DIR       Directory containing CSV files (default: ..)
  --output-dir DIR     Directory to save models (default: ./trained_models)
  --epochs N           Maximum training epochs (default: 100)
  --batch-size N       Training batch size (default: 32)
  --patience N         Early stopping patience (default: 15)
  --train-all          Train all model types
```

### Validation (`validate.py`)

```bash
python validate.py [OPTIONS]

Options:
  --model-type TYPE    Model type to validate (default: height)
  --horizon HORIZON    Prediction horizon
  --data-dir DIR       Directory containing CSV files
  --models-dir DIR     Directory containing trained models
  --visualize          Generate validation plots
  --validate-all       Validate all trained models
```

## Model Architecture

The LSTM models use a stacked architecture:

```
Input (sequence_length, n_features)
    ↓
LSTM Layer 1 (128 units, return_sequences=True)
    ↓
Dropout (0.2)
    ↓
LSTM Layer 2 (64 units, return_sequences=False)
    ↓
Dropout (0.2)
    ↓
Dense (64 units, ReLU)
    ↓
Dense (prediction_steps)
    ↓
Output (prediction_steps values)
```

## Prediction Horizons

- **Short-term**: 24 time steps (~5 days at 5h intervals)
- **Medium-term**: 48 time steps (~10 days)

## Output Files

After training, the following files are generated in `trained_models/`:

- `{model_type}_{horizon}_{timestamp}.keras` - Keras model file
- `{model_type}_{horizon}_{timestamp}_metadata.json` - Model metadata
- `{model_type}_{horizon}_{timestamp}_processor.json` - Data processor parameters
- `{model_type}_{horizon}_{timestamp}_results.json` - Training results

## Metrics

The models are evaluated using:

- **MSE**: Mean Squared Error
- **RMSE**: Root Mean Squared Error
- **MAE**: Mean Absolute Error
- **MAPE**: Mean Absolute Percentage Error
- **R²**: Coefficient of Determination

## API Integration

The trained models can be loaded and used for predictions via the Next.js API routes:

- `POST /api/ml/train` - Trigger model training
- `POST /api/ml/predict` - Make predictions
- `GET /api/ml/data` - Get training data

## Directory Structure

```
ml-service/
├── api/
│   ├── __init__.py
│   ├── predict.py      # Prediction API
│   └── train.py        # Training API
├── models/
│   ├── __init__.py
│   ├── lstm_model.py   # LSTM model definitions
│   ├── data_processor.py # Data preprocessing
│   └── trainer.py      # Training utilities
├── utils/
│   ├── __init__.py
│   ├── csv_loader.py   # CSV data loading
│   └── db.py           # Database utilities
├── trained_models/     # Saved models (gitignored)
├── main.py             # Main training script
├── validate.py         # Validation script
├── requirements.txt    # Python dependencies
└── README.md           # This file
```

## Research References

The LSTM architecture and training approach is based on established time-series forecasting research:

1. **LSTM for Time Series**: Hochreiter, S., & Schmidhuber, J. (1997). Long short-term memory. Neural computation, 9(8), 1735-1780.

2. **Plant Growth Modeling**: Multiple studies have shown environmental factors (temperature, humidity) correlate with plant growth rates.

3. **Aquaponics Monitoring**: Water quality parameters (pH, EC, temperature) are critical indicators for fish health and plant nutrient availability.

## License

MIT License - Part of the AquaNexus project.
