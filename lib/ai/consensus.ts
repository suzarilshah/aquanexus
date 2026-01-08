import { AIAnalysisResult, AIModelConfig, callAIModel } from './client';

export interface ConsensusResult {
  model1: AIAnalysisResult;
  model2: AIAnalysisResult;
  consensus: {
    verdict: string;
    confidence: number;
    reasoning: string;
    recommendations: string[];
    metrics: {
      healthScore: number;
      riskLevel: 'low' | 'medium' | 'high' | 'critical';
    };
  };
  agreementScore: number;
  errorMargin: number;
  calibrationScore: number;
}

function calculateAgreementScore(
  result1: AIAnalysisResult,
  result2: AIAnalysisResult
): number {
  let agreementPoints = 0;
  let totalPoints = 0;

  // Compare verdicts (simple text similarity)
  totalPoints += 1;
  if (result1.verdict.toLowerCase().includes(result2.verdict.toLowerCase().substring(0, 10)) ||
      result2.verdict.toLowerCase().includes(result1.verdict.toLowerCase().substring(0, 10))) {
    agreementPoints += 1;
  }

  // Compare confidence levels (within 20% is agreement)
  totalPoints += 1;
  const confidenceDiff = Math.abs(result1.confidence - result2.confidence);
  if (confidenceDiff <= 0.2) {
    agreementPoints += 1;
  }

  // Compare health scores (within 15 points is agreement)
  totalPoints += 1;
  const healthScoreDiff = Math.abs(result1.metrics.healthScore - result2.metrics.healthScore);
  if (healthScoreDiff <= 15) {
    agreementPoints += 1;
  }

  // Compare risk levels
  totalPoints += 1;
  if (result1.metrics.riskLevel === result2.metrics.riskLevel) {
    agreementPoints += 1;
  }

  // Compare number of recommendations (similar count suggests similar analysis)
  totalPoints += 1;
  const recCountDiff = Math.abs(result1.recommendations.length - result2.recommendations.length);
  if (recCountDiff <= 2) {
    agreementPoints += 1;
  }

  return agreementPoints / totalPoints;
}

function calculateErrorMargin(
  result1: AIAnalysisResult,
  result2: AIAnalysisResult
): number {
  // Calculate standard deviation of key metrics
  const metrics = [
    { v1: result1.confidence, v2: result2.confidence },
    { v1: result1.metrics.healthScore / 100, v2: result2.metrics.healthScore / 100 },
  ];

  let totalVariance = 0;
  metrics.forEach(({ v1, v2 }) => {
    const mean = (v1 + v2) / 2;
    const variance = Math.pow(v1 - mean, 2) + Math.pow(v2 - mean, 2);
    totalVariance += variance;
  });

  return Math.sqrt(totalVariance / (metrics.length * 2));
}

function calculateCalibrationScore(
  agreementScore: number,
  errorMargin: number
): number {
  // Higher agreement and lower error margin = better calibration
  return (agreementScore * 0.7) + ((1 - errorMargin) * 0.3);
}

function mergeResults(
  result1: AIAnalysisResult,
  result2: AIAnalysisResult,
  agreementScore: number
): ConsensusResult['consensus'] {
  // Weight results by confidence
  const totalConfidence = result1.confidence + result2.confidence;
  const weight1 = result1.confidence / totalConfidence;
  const weight2 = result2.confidence / totalConfidence;

  // Average health score
  const avgHealthScore = Math.round(
    result1.metrics.healthScore * weight1 + result2.metrics.healthScore * weight2
  );

  // Determine risk level (take the higher risk if models disagree)
  const riskLevels: ('low' | 'medium' | 'high' | 'critical')[] = ['low', 'medium', 'high', 'critical'];
  const riskIndex1 = riskLevels.indexOf(result1.metrics.riskLevel);
  const riskIndex2 = riskLevels.indexOf(result2.metrics.riskLevel);
  const consensusRiskLevel = riskLevels[Math.max(riskIndex1, riskIndex2)];

  // Merge recommendations (deduplicate and prioritize by confidence)
  const allRecs = new Set([...result1.recommendations, ...result2.recommendations]);
  const recommendations = Array.from(allRecs).slice(0, 5);

  // Create consensus verdict
  let verdict: string;
  if (agreementScore >= 0.8) {
    verdict = result1.confidence > result2.confidence ? result1.verdict : result2.verdict;
  } else {
    verdict = `Analysis indicates ${avgHealthScore >= 70 ? 'generally healthy' : avgHealthScore >= 50 ? 'moderate condition' : 'concerning'} status. Models show ${Math.round(agreementScore * 100)}% agreement.`;
  }

  // Combine reasoning
  const reasoning = `Model 1 (confidence: ${(result1.confidence * 100).toFixed(0)}%): ${result1.reasoning.substring(0, 200)}... Model 2 (confidence: ${(result2.confidence * 100).toFixed(0)}%): ${result2.reasoning.substring(0, 200)}...`;

  return {
    verdict,
    confidence: (result1.confidence + result2.confidence) / 2,
    reasoning,
    recommendations,
    metrics: {
      healthScore: avgHealthScore,
      riskLevel: consensusRiskLevel,
    },
  };
}

export async function analyzeWithConsensus(
  model1Config: AIModelConfig,
  model2Config: AIModelConfig,
  prompt: string
): Promise<ConsensusResult> {
  // Call both models in parallel
  const [result1, result2] = await Promise.all([
    callAIModel(model1Config, prompt),
    callAIModel(model2Config, prompt),
  ]);

  // Calculate metrics
  const agreementScore = calculateAgreementScore(result1, result2);
  const errorMargin = calculateErrorMargin(result1, result2);
  const calibrationScore = calculateCalibrationScore(agreementScore, errorMargin);

  // Merge results into consensus
  const consensus = mergeResults(result1, result2, agreementScore);

  return {
    model1: result1,
    model2: result2,
    consensus,
    agreementScore,
    errorMargin,
    calibrationScore,
  };
}

export function generateAnalysisPrompt(
  deviceType: 'fish' | 'plant',
  readings: Record<string, unknown>[],
  timeRange: string
): string {
  const dataDescription = readings.length > 0
    ? JSON.stringify(readings.slice(-10), null, 2)
    : 'No recent readings available';

  if (deviceType === 'fish') {
    return `Analyze the following fish tank sensor data from the last ${timeRange}:

Sensor Readings:
${dataDescription}

Consider:
1. Water temperature trends and stability
2. pH level fluctuations
3. Dissolved oxygen levels
4. Turbidity measurements
5. Overall water quality

Provide a comprehensive analysis with health score (0-100), risk assessment, and actionable recommendations.`;
  } else {
    return `Analyze the following plant growing environment sensor data from the last ${timeRange}:

Sensor Readings:
${dataDescription}

Consider:
1. Soil moisture levels and irrigation needs
2. Light exposure patterns
3. Temperature and humidity balance
4. Nutrient uptake indicators

Provide a comprehensive analysis with health score (0-100), risk assessment, and actionable recommendations.`;
  }
}
