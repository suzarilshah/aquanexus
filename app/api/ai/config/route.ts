import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { aiConfig } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { getSession } from '@/lib/auth';
import { testAIConnection } from '@/lib/ai/client';

export async function GET() {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const config = await db
      .select({
        id: aiConfig.id,
        model1Name: aiConfig.model1Name,
        model1Endpoint: aiConfig.model1Endpoint,
        model2Name: aiConfig.model2Name,
        model2Endpoint: aiConfig.model2Endpoint,
        consensusEnabled: aiConfig.consensusEnabled,
        updatedAt: aiConfig.updatedAt,
      })
      .from(aiConfig)
      .where(eq(aiConfig.userId, session.userId))
      .limit(1);

    if (config.length === 0) {
      return NextResponse.json({
        config: {
          model1Name: 'gpt-o3-mini',
          model1Endpoint: '',
          model2Name: 'deepseek-r1',
          model2Endpoint: '',
          consensusEnabled: true,
        },
      });
    }

    return NextResponse.json({ config: config[0] });
  } catch (error) {
    console.error('Get AI config error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const {
      model1Name,
      model1Endpoint,
      model1ApiKey,
      model2Name,
      model2Endpoint,
      model2ApiKey,
      consensusEnabled,
    } = await request.json();

    // Check if config exists
    const existingConfig = await db
      .select()
      .from(aiConfig)
      .where(eq(aiConfig.userId, session.userId))
      .limit(1);

    const configData = {
      model1Name: model1Name || 'gpt-o3-mini',
      model1Endpoint,
      model1ApiKey,
      model2Name: model2Name || 'deepseek-r1',
      model2Endpoint,
      model2ApiKey,
      consensusEnabled: consensusEnabled ?? true,
      updatedAt: new Date(),
    };

    let savedConfig;
    if (existingConfig.length > 0) {
      savedConfig = await db
        .update(aiConfig)
        .set(configData)
        .where(eq(aiConfig.id, existingConfig[0].id))
        .returning();
    } else {
      savedConfig = await db
        .insert(aiConfig)
        .values({
          userId: session.userId,
          ...configData,
        })
        .returning();
    }

    return NextResponse.json({
      success: true,
      config: {
        id: savedConfig[0].id,
        model1Name: savedConfig[0].model1Name,
        model1Endpoint: savedConfig[0].model1Endpoint,
        model2Name: savedConfig[0].model2Name,
        model2Endpoint: savedConfig[0].model2Endpoint,
        consensusEnabled: savedConfig[0].consensusEnabled,
      },
    });
  } catch (error) {
    console.error('Save AI config error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { modelNumber, endpoint, apiKey } = await request.json();

    if (!modelNumber || !endpoint || !apiKey) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Test the connection
    const isConnected = await testAIConnection({
      name: `Model ${modelNumber}`,
      endpoint,
      apiKey,
    });

    return NextResponse.json({
      success: isConnected,
      message: isConnected
        ? 'Connection successful'
        : 'Connection failed. Please check endpoint and API key.',
    });
  } catch (error) {
    console.error('Test AI connection error:', error);
    return NextResponse.json(
      { error: 'Connection test failed' },
      { status: 500 }
    );
  }
}
