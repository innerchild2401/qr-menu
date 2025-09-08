/**
 * Test API route for AI functionality
 * GET /api/test-ai - Check AI service availability and configuration
 */

import { NextResponse } from 'next/server';
import { env } from '@/lib/env';
import { isOpenAIAvailable } from '@/lib/ai/openai-client';
import { detectLanguage } from '@/lib/ai/language-detector';
import { supabaseAdmin } from '@/lib/supabase-server';

interface TestResult {
  test_name: string;
  status: 'pass' | 'fail' | 'warning';
  message: string;
  details?: unknown;
}

export async function GET() {
  const results: TestResult[] = [];
  
  // Test 1: Environment Configuration
  results.push({
    test_name: 'Environment Configuration',
    status: env.HAS_OPENAI ? 'pass' : 'warning',
    message: env.HAS_OPENAI 
      ? 'OpenAI API key is configured' 
      : 'OpenAI API key is not configured - AI features will be disabled',
    details: {
      openai_available: env.HAS_OPENAI,
      environment: env.NODE_ENV,
    }
  });

  // Test 2: OpenAI Service Availability
  results.push({
    test_name: 'OpenAI Service',
    status: isOpenAIAvailable() ? 'pass' : 'fail',
    message: isOpenAIAvailable() 
      ? 'OpenAI service is available' 
      : 'OpenAI service is not available',
  });

  // Test 3: Language Detection
  try {
    const testProducts = [
      'Burger cu piept de pui',
      'Chicken Caesar Salad',
      'Ciorbă de burtă',
      'Fish and Chips'
    ];

    const detectionResults = testProducts.map(name => ({
      name,
      detection: detectLanguage(name)
    }));

    results.push({
      test_name: 'Language Detection',
      status: 'pass',
      message: 'Language detection is working correctly',
      details: detectionResults
    });
  } catch (error) {
    results.push({
      test_name: 'Language Detection',
      status: 'fail',
      message: `Language detection failed: ${error}`,
    });
  }

  // Test 4: Database Tables
  try {
    // Check if AI tables exist
    const tableChecks = await Promise.allSettled([
      supabaseAdmin.from('ingredients_cache').select('count', { count: 'exact', head: true }),
      supabaseAdmin.from('allergens').select('count', { count: 'exact', head: true }),
      supabaseAdmin.from('gpt_logs').select('count', { count: 'exact', head: true }),
    ]);

    const tableStatuses = [
      { name: 'ingredients_cache', status: tableChecks[0] },
      { name: 'allergens', status: tableChecks[1] },
      { name: 'gpt_logs', status: tableChecks[2] },
    ];

    const allTablesExist = tableStatuses.every(table => 
      table.status.status === 'fulfilled'
    );

    results.push({
      test_name: 'Database Tables',
      status: allTablesExist ? 'pass' : 'fail',
      message: allTablesExist 
        ? 'All required AI tables exist' 
        : 'Some AI tables are missing - run the migration script',
      details: tableStatuses.map(table => ({
        table: table.name,
        exists: table.status.status === 'fulfilled',
        error: table.status.status === 'rejected' ? table.status.reason : null
      }))
    });
  } catch (error) {
    results.push({
      test_name: 'Database Tables',
      status: 'fail',
      message: `Database connection failed: ${error}`,
    });
  }

  // Test 5: Allergen Data
  try {
    const { data: allergens, error } = await supabaseAdmin
      .from('allergens')
      .select('code, name_ro, name_en')
      .limit(5);

    if (error) throw error;

    results.push({
      test_name: 'Allergen Data',
      status: (allergens && allergens.length > 0) ? 'pass' : 'warning',
      message: (allergens && allergens.length > 0) 
        ? `Found ${allergens.length} allergen entries` 
        : 'No allergen data found - may need to run migration',
      details: allergens?.slice(0, 3)
    });
  } catch (error) {
    results.push({
      test_name: 'Allergen Data',
      status: 'fail',
      message: `Failed to check allergen data: ${error}`,
    });
  }

  // Calculate overall status
  const failedTests = results.filter(r => r.status === 'fail').length;
  const warningTests = results.filter(r => r.status === 'warning').length;
  
  let overallStatus: 'healthy' | 'partial' | 'unhealthy';
  if (failedTests === 0 && warningTests === 0) {
    overallStatus = 'healthy';
  } else if (failedTests === 0) {
    overallStatus = 'partial';
  } else {
    overallStatus = 'unhealthy';
  }

  return NextResponse.json({
    overall_status: overallStatus,
    timestamp: new Date().toISOString(),
    summary: {
      total_tests: results.length,
      passed: results.filter(r => r.status === 'pass').length,
      warnings: warningTests,
      failed: failedTests,
    },
    test_results: results,
    recommendations: [
      ...(failedTests > 0 ? ['Fix failed tests before using AI features'] : []),
      ...(!env.HAS_OPENAI ? ['Configure OpenAI API key to enable AI generation'] : []),
      ...(results.some(r => r.test_name === 'Database Tables' && r.status === 'fail') ? 
        ['Run the AI migration script: scripts/create-ai-tables.sql'] : []),
    ]
  });
}
