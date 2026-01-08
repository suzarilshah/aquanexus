export interface AIModelConfig {
  name: string;
  endpoint: string;
  apiKey: string;
  apiVersion?: string;
}

export interface AIConnectionTestResult {
  success: boolean;
  error?: {
    code: string;
    message: string;
    statusCode?: number;
    statusText?: string;
    responseBody?: string;
    endpoint?: string;
    timestamp: string;
    suggestion?: string;
  };
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

function getErrorSuggestion(statusCode: number, responseBody: string, endpoint: string): string {
  const lowerBody = responseBody.toLowerCase();

  if (statusCode === 401 || lowerBody.includes('unauthorized') || lowerBody.includes('invalid key')) {
    return 'Check that your API key is correct and has not expired.';
  }
  if (statusCode === 403 || lowerBody.includes('forbidden')) {
    return 'Your API key may lack permissions for this endpoint, or the deployment may be restricted.';
  }
  if (statusCode === 404 || lowerBody.includes('not found') || lowerBody.includes('deploymentnotfound')) {
    return 'The model deployment was not found. Verify the endpoint URL and deployment name are correct.';
  }
  if (statusCode === 429 || lowerBody.includes('rate limit') || lowerBody.includes('quota')) {
    return 'Rate limit exceeded or quota depleted. Wait before retrying or check your subscription limits.';
  }
  if (statusCode >= 500) {
    return 'The AI service is experiencing issues. Try again later.';
  }
  if (lowerBody.includes('api-version') || lowerBody.includes('apiversion')) {
    return 'Invalid or missing API version. Check the API version parameter matches your deployment.';
  }
  if (!endpoint.startsWith('https://')) {
    return 'Endpoint should use HTTPS. Ensure the URL starts with https://';
  }
  if (lowerBody.includes('timeout') || lowerBody.includes('timed out')) {
    return 'Request timed out. The endpoint may be unreachable or slow to respond.';
  }

  return 'Verify the endpoint URL and API key are correct. Check that the model deployment is active.';
}

function parseErrorResponse(responseBody: string): { code: string; message: string } {
  try {
    const parsed = JSON.parse(responseBody);

    // Handle Azure/OpenAI error format
    if (parsed.error) {
      return {
        code: parsed.error.code || 'UNKNOWN_ERROR',
        message: parsed.error.message || 'Unknown error occurred',
      };
    }

    // Handle other common formats
    if (parsed.message) {
      return {
        code: parsed.code || parsed.status || 'API_ERROR',
        message: parsed.message,
      };
    }

    // Fallback
    return {
      code: 'PARSE_ERROR',
      message: responseBody.slice(0, 500),
    };
  } catch {
    // If not JSON, return raw text
    return {
      code: 'NON_JSON_RESPONSE',
      message: responseBody.slice(0, 500) || 'Empty response body',
    };
  }
}

export async function testAIConnection(config: AIModelConfig): Promise<AIConnectionTestResult> {
  const timestamp = new Date().toISOString();

  // Validate inputs first
  if (!config.endpoint) {
    return {
      success: false,
      error: {
        code: 'MISSING_ENDPOINT',
        message: 'Endpoint URL is required',
        endpoint: config.endpoint,
        timestamp,
        suggestion: 'Please provide a valid API endpoint URL.',
      },
    };
  }

  if (!config.apiKey) {
    return {
      success: false,
      error: {
        code: 'MISSING_API_KEY',
        message: 'API key is required',
        endpoint: config.endpoint,
        timestamp,
        suggestion: 'Please provide your API key.',
      },
    };
  }

  // Validate URL format
  try {
    new URL(config.endpoint);
  } catch {
    return {
      success: false,
      error: {
        code: 'INVALID_URL',
        message: 'The endpoint URL is not valid',
        endpoint: config.endpoint,
        timestamp,
        suggestion: 'Ensure the endpoint is a complete, valid URL (e.g., https://your-resource.openai.azure.com/...)',
      },
    };
  }

  try {
    // Build endpoint URL with API version if provided
    let finalEndpoint = config.endpoint;
    if (config.apiVersion) {
      const url = new URL(config.endpoint);
      url.searchParams.set('api-version', config.apiVersion);
      finalEndpoint = url.toString();
    }

    console.log(`[AI Connection Test] Testing endpoint: ${finalEndpoint.replace(/api-key=[^&]+/, 'api-key=***')}`);
    console.log(`[AI Connection Test] Model: ${config.name}`);
    console.log(`[AI Connection Test] API Version: ${config.apiVersion || 'not specified'}`);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

    const response = await fetch(finalEndpoint, {
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
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    const responseText = await response.text();

    console.log(`[AI Connection Test] Status: ${response.status} ${response.statusText}`);
    console.log(`[AI Connection Test] Response length: ${responseText.length} chars`);

    if (response.ok) {
      console.log(`[AI Connection Test] SUCCESS - Connection verified`);
      return { success: true };
    }

    // Parse error details from response
    const errorDetails = parseErrorResponse(responseText);
    const suggestion = getErrorSuggestion(response.status, responseText, config.endpoint);

    console.error(`[AI Connection Test] FAILED - ${errorDetails.code}: ${errorDetails.message}`);

    return {
      success: false,
      error: {
        code: errorDetails.code,
        message: errorDetails.message,
        statusCode: response.status,
        statusText: response.statusText,
        responseBody: responseText.slice(0, 1000), // Limit response body size
        endpoint: config.endpoint,
        timestamp,
        suggestion,
      },
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const isTimeout = errorMessage.includes('aborted') || errorMessage.includes('timeout');
    const isNetworkError = errorMessage.includes('fetch') || errorMessage.includes('network') || errorMessage.includes('ENOTFOUND');

    console.error(`[AI Connection Test] EXCEPTION: ${errorMessage}`);

    let code = 'CONNECTION_ERROR';
    let suggestion = 'Check your network connection and verify the endpoint is accessible.';

    if (isTimeout) {
      code = 'TIMEOUT';
      suggestion = 'The request timed out. The endpoint may be unreachable or the service is slow to respond.';
    } else if (isNetworkError) {
      code = 'NETWORK_ERROR';
      suggestion = 'Could not reach the endpoint. Verify the URL is correct and the service is available.';
    }

    return {
      success: false,
      error: {
        code,
        message: errorMessage,
        endpoint: config.endpoint,
        timestamp,
        suggestion,
      },
    };
  }
}
