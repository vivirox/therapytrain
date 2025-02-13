import { createClient } from '@supabase/supabase-js';
import { DatabaseMonitoringService } from '../services/DatabaseMonitoringService';
import * as Sentry from '@sentry/node';

// Initialize Sentry
Sentry.init({
  dsn: process.env.SENTRY_DSN,
  tracesSampleRate: 1.0,
  debug: process.env.NODE_ENV === 'development',
});

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

// Initialize monitoring service
const monitoringService = DatabaseMonitoringService.getInstance(supabase);

interface OptimizationResult {
  tableName: string;
  recommendations: string[];
  appliedChanges: string[];
  performance: {
    before: {
      totalRows: number;
      totalSize: string;
      indexSize: string;
    };
  };
}

async function getTableSize(tableName: string): Promise<number> {
  try {
    // Get row count as an approximation
    const { count, error } = await supabase
      .from(tableName)
      .select('*', { count: 'exact', head: true });

    if (error) throw error;
    
    // Rough estimation: assume 1KB per row as a baseline
    return (count || 0) * 1024;
  } catch (error) {
    console.error(`Error getting table size for ${tableName}:`, error);
    return 0;
  }
}

async function analyzeTablePerformance(tableName: string): Promise<OptimizationResult> {
  try {
    // Get row count
    const { count: totalRows, error: countError } = await supabase
      .from(tableName)
      .select('*', { count: 'exact', head: true });

    if (countError) throw new Error(`Failed to get row count: ${countError.message}`);

    // Get estimated table size
    const estimatedSize = await getTableSize(tableName);

    const recommendations: string[] = [];
    const appliedChanges: string[] = [];

    // Basic size analysis
    if (estimatedSize > 100 * 1024 * 1024) { // 100MB
      recommendations.push(`Table size is large (estimated ${Math.round(estimatedSize / (1024 * 1024))} MB). Consider partitioning or archiving old data.`);
    }

    // Row count analysis
    if (totalRows && totalRows > 1000000) {
      recommendations.push(`Large number of rows (${totalRows.toLocaleString()}). Consider table partitioning.`);
    }

    // Sample some rows to check for potential issues
    const { data: sampleRows, error: sampleError } = await supabase
      .from(tableName)
      .select('*')
      .limit(1000);

    if (!sampleError && sampleRows) {
      // Check for potential indexing needs
      if (totalRows && totalRows > 10000) {
        recommendations.push('Large table detected. Consider reviewing indexing strategy.');
      }

      // Check for wide rows
      if (sampleRows.length > 0) {
        const rowSize = JSON.stringify(sampleRows[0]).length;
        if (rowSize > 1024) { // 1KB
          recommendations.push(`Large row size detected (${Math.round(rowSize / 1024)} KB). Consider normalizing data or using JSONB for nested structures.`);
        }
      }
    }

    return {
      tableName,
      recommendations,
      appliedChanges,
      performance: {
        before: {
          totalRows: totalRows || 0,
          totalSize: `${Math.round(estimatedSize / (1024 * 1024))} MB (estimated)`,
          indexSize: 'N/A'
        }
      }
    };
  } catch (error) {
    console.error('Error analyzing table performance:', error);
    Sentry.captureException(error);
    throw error;
  }
}

async function getPublicTables(): Promise<string[]> {
  // Try to discover tables by making requests to common table names
  const commonTables = [
    'users',
    'profiles',
    'sessions',
    'messages',
    'audit_logs',
    'settings',
    'notifications',
    'documents',
    'files',
    'tags'
  ];

  const tables: string[] = [];

  for (const table of commonTables) {
    try {
      const { error } = await supabase
        .from(table)
        .select('*', { count: 'exact', head: true });

      // If no permission error, the table exists
      if (!error || !error.message.includes('does not exist')) {
        tables.push(table);
      }
    } catch (error) {
      // Ignore errors
    }
  }

  return tables;
}

async function optimizeDatabasePerformance() {
  try {
    console.log('Starting database performance analysis...');

    // Get list of tables
    const publicTables = await getPublicTables();

    if (publicTables.length === 0) {
      console.log('No tables found in the database.');
      return;
    }

    console.log(`Found tables: ${publicTables.join(', ')}`);

    // Analyze each table
    const results: OptimizationResult[] = [];
    for (const tableName of publicTables) {
      console.log(`\nAnalyzing table: ${tableName}`);
      try {
        const result = await analyzeTablePerformance(tableName);
        results.push(result);
      } catch (error) {
        console.error(`Error analyzing table ${tableName}:`, error);
        Sentry.captureException(error, {
          tags: {
            table: tableName,
            operation: 'table_analysis'
          }
        });
      }
    }

    if (results.length === 0) {
      console.log('No tables were successfully analyzed.');
      return;
    }

    // Generate summary report
    console.log('\nDatabase Performance Analysis Report');
    console.log('===================================');

    for (const result of results) {
      console.log(`\nTable: ${result.tableName}`);
      console.log(`Size: ${result.performance.before.totalSize}`);
      console.log(`Rows: ${result.performance.before.totalRows.toLocaleString()}`);
      
      if (result.recommendations.length > 0) {
        console.log('\nRecommendations:');
        result.recommendations.forEach(rec => console.log(`- ${rec}`));
      }

      if (result.appliedChanges.length > 0) {
        console.log('\nApplied Changes:');
        result.appliedChanges.forEach(change => console.log(`- ${change}`));
      }
    }

    try {
      // Send report to monitoring service
      const report = await monitoringService.generatePerformanceReport();
      console.log('\nDetailed Performance Report:', JSON.stringify(report, null, 2));
    } catch (error) {
      console.error('Error generating performance report:', error);
      Sentry.captureException(error, {
        tags: {
          operation: 'generate_performance_report'
        }
      });
    }

  } catch (error) {
    console.error('Error optimizing database performance:', error);
    Sentry.captureException(error, {
      tags: {
        operation: 'database_optimization'
      }
    });
    throw error;
  }
}

// Run optimization if executed directly
if (import.meta.url === new URL(process.argv[1], 'file://').href) {
  optimizeDatabasePerformance()
    .then(() => process.exit(0))
    .catch(error => {
      console.error('Fatal error:', error);
      process.exit(1);
    });
}

export { optimizeDatabasePerformance, analyzeTablePerformance }; 