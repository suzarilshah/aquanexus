import { Client, Databases } from 'node-appwrite';

export default async ({ req, res, log, error }) => {
  try {
    // Parse request body
    const { deviceMac, deviceType, timeRange = '24h' } = JSON.parse(req.body || '{}');

    // Validate required fields
    if (!deviceMac || !deviceType) {
      return res.json({
        success: false,
        error: 'Missing required fields: deviceMac, deviceType'
      }, 400);
    }

    // Initialize Appwrite client
    const client = new Client()
      .setEndpoint(process.env.APPWRITE_FUNCTION_ENDPOINT)
      .setProject(process.env.APPWRITE_FUNCTION_PROJECT_ID)
      .setKey(process.env.APPWRITE_API_KEY);

    const databases = new Databases(client);

    // Calculate time range
    const now = new Date();
    const timeRangeMs = {
      '1h': 60 * 60 * 1000,
      '6h': 6 * 60 * 60 * 1000,
      '24h': 24 * 60 * 60 * 1000,
      '7d': 7 * 24 * 60 * 60 * 1000,
      '30d': 30 * 24 * 60 * 60 * 1000
    }[timeRange] || 24 * 60 * 60 * 1000;

    const startTime = new Date(now.getTime() - timeRangeMs).toISOString();

    // Determine collection based on device type
    const collectionId = deviceType === 'fish' ? 'fish_readings' : 'plant_readings';

    // Fetch recent sensor data
    const readings = await databases.listDocuments(
      'aquanexus-main',
      collectionId,
      [
        `deviceMac=${deviceMac}`,
        `timestamp>=${startTime}`
      ]
    );

    // Fetch recent alerts
    const alerts = await databases.listDocuments(
      'aquanexus-main',
      'alerts',
      [
        `deviceMac=${deviceMac}`,
        `timestamp>=${startTime}`
      ]
    );

    if (readings.documents.length === 0) {
      return res.json({
        success: true,
        insights: {
          summary: 'No recent data available for analysis',
          recommendations: ['Ensure device is connected and sending data'],
          trends: {},
          alerts: alerts.documents.length,
          dataPoints: 0
        }
      });
    }

    // Analyze data based on device type
    let insights;
    if (deviceType === 'fish') {
      insights = analyzeFishData(readings.documents, alerts.documents, timeRange);
    } else {
      insights = analyzePlantData(readings.documents, alerts.documents, timeRange);
    }

    log('AI insights generated for device:', deviceMac);

    return res.json({
      success: true,
      insights
    });

  } catch (err) {
    error('Error generating AI insights:', err.message);
    return res.json({
      success: false,
      error: 'Internal server error'
    }, 500);
  }
};

// Analyze fish environment data
function analyzeFishData(readings, alerts, timeRange) {
  const dataPoints = readings.length;
  const latestReading = readings[readings.length - 1];
  
  // Calculate averages and trends
  const temps = readings.filter(r => r.temperature !== undefined).map(r => r.temperature);
  const phs = readings.filter(r => r.ph !== undefined).map(r => r.ph);
  const dos = readings.filter(r => r.dissolvedOxygen !== undefined).map(r => r.dissolvedOxygen);
  const turbidities = readings.filter(r => r.turbidity !== undefined).map(r => r.turbidity);

  const avgTemp = temps.length > 0 ? temps.reduce((a, b) => a + b, 0) / temps.length : null;
  const avgPh = phs.length > 0 ? phs.reduce((a, b) => a + b, 0) / phs.length : null;
  const avgDo = dos.length > 0 ? dos.reduce((a, b) => a + b, 0) / dos.length : null;
  const avgTurbidity = turbidities.length > 0 ? turbidities.reduce((a, b) => a + b, 0) / turbidities.length : null;

  // Calculate trends (simple slope)
  const tempTrend = calculateTrend(temps);
  const phTrend = calculateTrend(phs);
  const doTrend = calculateTrend(dos);
  const turbidityTrend = calculateTrend(turbidities);

  // Generate recommendations
  const recommendations = [];
  const criticalAlerts = alerts.filter(a => a.severity === 'critical').length;
  const highAlerts = alerts.filter(a => a.severity === 'high').length;

  // Temperature recommendations
  if (avgTemp !== null) {
    if (avgTemp < 20) {
      recommendations.push('Consider increasing water temperature - fish prefer 20-28°C');
    } else if (avgTemp > 28) {
      recommendations.push('Water temperature is high - consider cooling or increasing aeration');
    }
    if (tempTrend > 0.5) {
      recommendations.push('Temperature is rising - monitor closely and ensure adequate cooling');
    } else if (tempTrend < -0.5) {
      recommendations.push('Temperature is dropping - check heater functionality');
    }
  }

  // pH recommendations
  if (avgPh !== null) {
    if (avgPh < 6.5) {
      recommendations.push('pH is acidic - consider adding pH buffer or limestone');
    } else if (avgPh > 8.5) {
      recommendations.push('pH is alkaline - consider water changes or pH reducer');
    }
    if (Math.abs(phTrend) > 0.2) {
      recommendations.push('pH is fluctuating - ensure stable water chemistry');
    }
  }

  // Dissolved oxygen recommendations
  if (avgDo !== null) {
    if (avgDo < 5.0) {
      recommendations.push('Dissolved oxygen is low - increase aeration or reduce fish density');
    }
    if (doTrend < -0.3) {
      recommendations.push('Oxygen levels are declining - check aeration system');
    }
  }

  // Turbidity recommendations
  if (avgTurbidity !== null) {
    if (avgTurbidity > 10) {
      recommendations.push('Water is cloudy - consider filtration upgrade or water change');
    }
    if (turbidityTrend > 2) {
      recommendations.push('Water clarity is worsening - check filter and feeding schedule');
    }
  }

  // General recommendations based on alerts
  if (criticalAlerts > 0) {
    recommendations.push('URGENT: Critical alerts detected - immediate action required');
  } else if (highAlerts > 2) {
    recommendations.push('Multiple high-priority alerts - review system parameters');
  }

  if (recommendations.length === 0) {
    recommendations.push('Fish environment is stable - continue current maintenance routine');
  }

  // Generate summary
  let summary = `Analyzed ${dataPoints} data points over ${timeRange}. `;
  if (criticalAlerts > 0) {
    summary += `CRITICAL: ${criticalAlerts} critical alerts detected. `;
  } else if (highAlerts > 0) {
    summary += `${highAlerts} high-priority alerts detected. `;
  } else {
    summary += 'Environment is within acceptable ranges. ';
  }

  return {
    summary,
    recommendations,
    trends: {
      temperature: { average: avgTemp, trend: tempTrend },
      ph: { average: avgPh, trend: phTrend },
      dissolvedOxygen: { average: avgDo, trend: doTrend },
      turbidity: { average: avgTurbidity, trend: turbidityTrend }
    },
    alerts: alerts.length,
    dataPoints,
    timeRange
  };
}

// Analyze plant environment data
function analyzePlantData(readings, alerts, timeRange) {
  const dataPoints = readings.length;
  const latestReading = readings[readings.length - 1];
  
  // Calculate averages and trends
  const moistures = readings.filter(r => r.soilMoisture !== undefined).map(r => r.soilMoisture);
  const lights = readings.filter(r => r.lightLevel !== undefined).map(r => r.lightLevel);
  const temps = readings.filter(r => r.temperature !== undefined).map(r => r.temperature);
  const humidities = readings.filter(r => r.humidity !== undefined).map(r => r.humidity);

  const avgMoisture = moistures.length > 0 ? moistures.reduce((a, b) => a + b, 0) / moistures.length : null;
  const avgLight = lights.length > 0 ? lights.reduce((a, b) => a + b, 0) / lights.length : null;
  const avgTemp = temps.length > 0 ? temps.reduce((a, b) => a + b, 0) / temps.length : null;
  const avgHumidity = humidities.length > 0 ? humidities.reduce((a, b) => a + b, 0) / humidities.length : null;

  // Calculate trends
  const moistureTrend = calculateTrend(moistures);
  const lightTrend = calculateTrend(lights);
  const tempTrend = calculateTrend(temps);
  const humidityTrend = calculateTrend(humidities);

  // Generate recommendations
  const recommendations = [];
  const criticalAlerts = alerts.filter(a => a.severity === 'critical').length;
  const highAlerts = alerts.filter(a => a.severity === 'high').length;

  // Soil moisture recommendations
  if (avgMoisture !== null) {
    if (avgMoisture < 30) {
      recommendations.push('Soil moisture is low - increase watering frequency');
    } else if (avgMoisture > 80) {
      recommendations.push('Soil is very wet - reduce watering to prevent root rot');
    }
    if (moistureTrend < -5) {
      recommendations.push('Soil is drying quickly - check irrigation system');
    }
  }

  // Light level recommendations
  if (avgLight !== null) {
    if (avgLight < 200) {
      recommendations.push('Light levels are low - consider supplemental lighting');
    } else if (avgLight > 2000) {
      recommendations.push('Light levels are very high - provide shade during peak hours');
    }
  }

  // Temperature recommendations
  if (avgTemp !== null) {
    if (avgTemp < 18) {
      recommendations.push('Temperature is low for optimal plant growth');
    } else if (avgTemp > 30) {
      recommendations.push('Temperature is high - ensure adequate ventilation');
    }
  }

  // Humidity recommendations
  if (avgHumidity !== null) {
    if (avgHumidity < 40) {
      recommendations.push('Humidity is low - consider misting or humidifier');
    } else if (avgHumidity > 80) {
      recommendations.push('Humidity is high - improve air circulation');
    }
  }

  // General recommendations based on alerts
  if (criticalAlerts > 0) {
    recommendations.push('URGENT: Critical alerts detected - immediate action required');
  } else if (highAlerts > 2) {
    recommendations.push('Multiple alerts detected - review growing conditions');
  }

  if (recommendations.length === 0) {
    recommendations.push('Plant environment is optimal - continue current care routine');
  }

  // Generate summary
  let summary = `Analyzed ${dataPoints} data points over ${timeRange}. `;
  if (criticalAlerts > 0) {
    summary += `CRITICAL: ${criticalAlerts} critical alerts detected. `;
  } else if (highAlerts > 0) {
    summary += `${highAlerts} alerts detected. `;
  } else {
    summary += 'Growing conditions are favorable. ';
  }

  return {
    summary,
    recommendations,
    trends: {
      soilMoisture: { average: avgMoisture, trend: moistureTrend },
      lightLevel: { average: avgLight, trend: lightTrend },
      temperature: { average: avgTemp, trend: tempTrend },
      humidity: { average: avgHumidity, trend: humidityTrend }
    },
    alerts: alerts.length,
    dataPoints,
    timeRange
  };
}

// Calculate simple linear trend (slope)
function calculateTrend(values) {
  if (values.length < 2) return 0;
  
  const n = values.length;
  const x = Array.from({ length: n }, (_, i) => i);
  const y = values;
  
  const sumX = x.reduce((a, b) => a + b, 0);
  const sumY = y.reduce((a, b) => a + b, 0);
  const sumXY = x.reduce((sum, xi, i) => sum + xi * y[i], 0);
  const sumXX = x.reduce((sum, xi) => sum + xi * xi, 0);
  
  const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
  return isNaN(slope) ? 0 : slope;
}