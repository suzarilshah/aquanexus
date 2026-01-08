export interface AIModelConfig {
  name: string;
  endpoint: string;
  apiKey: string;
}

export interface AIAnalysisResult {
  verdict: string;
  confidence: number;
  reasoning: string;
  recommendations: string[];
  metrics: {
    healthScore: number;
    riskLevel: 'low' | 'medium' | 'high' | 'critical';
    trends: string[];
  };
}

export async function callAIModel(
  config: AIModelConfig,
  prompt: string
): Promise<AIAnalysisResult> {
  if (!config.endpoint || !config.apiKey) {
    throw new Error('AI model not configured');
  }

  try {
    const response = await fetch(config.endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'api-key': config.apiKey,
        'Authorization': `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify({
        messages: [
          {
            role: 'system',
            content: `You are an expert aquaponics analyst. Analyze sensor data and provide actionable insights.

            IMPORTANT: Respond with valid JSON only, no markdown or extra text.

            Response format:
            {
              "verdict": "Brief overall assessment",
              "confidence": 0.95,
              "reasoning": "Detailed explanation",
              "recommendations": ["Action 1", "Action 2"],
              "metrics": {
                "healthScore": 85,
                "riskLevel": "low",
                "trends": ["Trend 1", "Trend 2"]
              }
            }`,
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.3,
        max_tokens: 1000,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`AI API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error('No response from AI model');
    }

    // Parse the JSON response
    const result = JSON.parse(content);
    return result as AIAnalysisResult;
  } catch (error) {
    console.error('AI model call failed:', error);
    throw error;
  }
}

export async function testAIConnection(config: AIModelConfig): Promise<boolean> {
  try {
    const response = await fetch(config.endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'api-key': config.apiKey,
        'Authorization': `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify({
        messages: [
          { role: 'user', content: 'Hello, respond with "OK" only.' },
        ],
        max_tokens: 10,
      }),
    });

    return response.ok;
  } catch {
    return false;
  }
}
