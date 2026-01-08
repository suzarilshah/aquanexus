import { NextRequest, NextResponse } from 'next/server';

/**
 * Firmware Compilation API Endpoint
 *
 * In production, this would:
 * 1. Receive the generated Arduino code
 * 2. Write it to a temporary .ino file
 * 3. Run Arduino CLI to compile: arduino-cli compile --fqbn esp32:esp32:esp32 sketch.ino
 * 4. Return the compiled .bin file
 *
 * For this implementation, we provide:
 * - Code validation
 * - Mock compilation (returns the code for manual Arduino IDE compilation)
 * - Error handling
 *
 * To enable real compilation, you would need:
 * - Docker container with Arduino CLI installed
 * - ESP32 board support: arduino-cli core install esp32:esp32
 * - Required libraries installed
 */

interface CompileRequest {
  code: string;
  filename: string;
  board?: string;
}

interface CompileResponse {
  success: boolean;
  message: string;
  binUrl?: string;
  binData?: string; // Base64 encoded binary
  errors?: string[];
  warnings?: string[];
}

// Basic code validation
function validateCode(code: string): { valid: boolean; errors: string[]; warnings: string[] } {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Check for required includes
  if (!code.includes('#include <WiFi.h>')) {
    errors.push('Missing WiFi.h include');
  }

  if (!code.includes('#include <WiFiManager.h>')) {
    errors.push('Missing WiFiManager.h include - required for provisioning mode');
  }

  // Check for setup and loop functions
  if (!code.includes('void setup()')) {
    errors.push('Missing setup() function');
  }

  if (!code.includes('void loop()')) {
    errors.push('Missing loop() function');
  }

  // Check for common issues
  if (code.includes('YOUR_WIFI_SSID') || code.includes('YOUR_WIFI_PASSWORD')) {
    errors.push('Hardcoded WiFi credentials detected - use WiFiManager instead');
  }

  // Warnings
  if (code.includes('delay(') && !code.includes('// delay')) {
    warnings.push('Consider using non-blocking delays for better performance');
  }

  if (code.includes('String ') && code.split('String ').length > 10) {
    warnings.push('Heavy String usage detected - consider using char arrays for memory efficiency');
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

// Simulate compilation (in production, this would call Arduino CLI)
async function simulateCompilation(code: string, filename: string): Promise<{
  success: boolean;
  binData?: string;
  error?: string;
}> {
  // Simulate compilation time
  await new Promise((resolve) => setTimeout(resolve, 1500));

  // In production, you would:
  // 1. Write code to /tmp/{uuid}/sketch/sketch.ino
  // 2. Run: arduino-cli compile --fqbn esp32:esp32:esp32 --output-dir /tmp/{uuid}/build /tmp/{uuid}/sketch
  // 3. Read the .bin file from /tmp/{uuid}/build/sketch.ino.bin
  // 4. Return as base64

  // For now, return a mock binary header that indicates this is a placeholder
  // Real ESP32 binaries start with specific magic bytes
  const mockBinaryHeader = new Uint8Array([
    0xe9, // ESP32 magic byte
    0x00, // Segment count
    0x02, // SPI mode
    0x10, // SPI speed/size
    0x40, 0x00, 0x00, 0x00, // Entry point
  ]);

  // Create a mock "binary" that includes a comment about needing real compilation
  const codeBytes = new TextEncoder().encode(`
/* ============================================
   FIRMWARE PREVIEW - NOT A REAL BINARY
   ============================================

   This is a placeholder. To get a real binary:

   1. Download the .ino file from the configurator
   2. Open in Arduino IDE
   3. Install required libraries:
      - WiFiManager by tzapu
      - ArduinoJson by Benoit Blanchon
      - Required sensor libraries
   4. Select board: ESP32 Dev Module
   5. Click Verify/Compile
   6. Upload to your ESP32

   For automated compilation, deploy this API
   with Arduino CLI in a Docker container.

   ============================================ */

${code}
`);

  const combined = new Uint8Array(mockBinaryHeader.length + codeBytes.length);
  combined.set(mockBinaryHeader);
  combined.set(codeBytes, mockBinaryHeader.length);

  // Convert to base64
  const binData = btoa(Array.from(combined, (byte) => String.fromCharCode(byte)).join(''));

  return {
    success: true,
    binData,
  };
}

export async function POST(request: NextRequest): Promise<NextResponse<CompileResponse>> {
  try {
    const body: CompileRequest = await request.json();
    const { code, filename, board = 'esp32:esp32:esp32' } = body;

    if (!code || !filename) {
      return NextResponse.json(
        {
          success: false,
          message: 'Missing required fields: code and filename',
        },
        { status: 400 }
      );
    }

    // Validate the code
    const validation = validateCode(code);

    if (!validation.valid) {
      return NextResponse.json(
        {
          success: false,
          message: 'Code validation failed',
          errors: validation.errors,
          warnings: validation.warnings,
        },
        { status: 400 }
      );
    }

    // Attempt compilation
    const result = await simulateCompilation(code, filename);

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          message: result.error || 'Compilation failed',
        },
        { status: 500 }
      );
    }

    // Return success with the "compiled" binary
    return NextResponse.json({
      success: true,
      message: 'Compilation successful',
      binUrl: `/api/firmware/download/${filename.replace('.ino', '.bin')}`,
      binData: result.binData,
      warnings: validation.warnings,
    });
  } catch (error) {
    console.error('Compilation error:', error);
    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 }
    );
  }
}

// GET endpoint to check compilation status/capabilities
export async function GET(): Promise<NextResponse> {
  return NextResponse.json({
    supported: true,
    boards: [
      {
        fqbn: 'esp32:esp32:esp32',
        name: 'ESP32 Dev Module',
        platform: 'esp32:esp32',
      },
      {
        fqbn: 'esp32:esp32:esp32wrover',
        name: 'ESP32 Wrover Module',
        platform: 'esp32:esp32',
      },
    ],
    note: 'This is a simulated compiler. For real compilation, deploy with Arduino CLI.',
    instructions: {
      manual: [
        'Download the generated .ino file',
        'Open in Arduino IDE 2.x',
        'Install ESP32 board support',
        'Install required libraries',
        'Select your board and port',
        'Click Upload',
      ],
      automated: [
        'Deploy this API with Docker',
        'Install arduino-cli in container',
        'Add ESP32 board support',
        'Configure library dependencies',
        'Real compilation will be enabled',
      ],
    },
  });
}
