# Thread Analytics Module

## Overview

The Thread Analytics module provides real-time analytics and reporting for thread activity, performance metrics, and user engagement. It uses optimized database queries, materialized views, and multi-level caching for efficient data access.

## Quick Start

```typescript
import { ThreadAnalyticsService } from './ThreadAnalyticsService';

// Get singleton instance
const analytics = ThreadAnalyticsService.getInstance();

// Track an event
await analytics.trackEvent({
    type: 'thread_created',
    threadId: 'thread-123',
    userId: 'user-456',
    timestamp: new Date(),
    metadata: {}
});

// Get thread metrics
const metrics = await analytics.getThreadMetrics('thread-123');
console.log(`Message count: ${metrics.messageCount}`);
console.log(`Active participants: ${metrics.activeParticipants}`);

// Get performance metrics
const performance = await analytics.getThreadPerformance('thread-123');
console.log(`Load time: ${performance.loadTime}ms`);
console.log(`Cache hit rate: ${performance.cacheHitRate * 100}%`);

// Generate a report
const report = await analytics.generateThreadReport(
    'thread-123',
    new Date('2024-03-21T00:00:00Z'),
    new Date('2024-03-21T23:59:59Z')
);
```

## Real-time Tracking

```typescript
// Start real-time tracking
await analytics.startRealtimeTracking('thread-123');

// Listen for updates
analytics.on('thread:performance:update', ({ threadId, metrics }) => {
    console.log(`New performance metrics for ${threadId}:`, metrics);
});

// Listen for warnings
analytics.on('thread:performance:warning', ({ threadId, metric, value, threshold }) => {
    console.log(`Warning: ${metric} (${value}) exceeded threshold (${threshold})`);
});

// Stop tracking when done
await analytics.stopRealtimeTracking('thread-123');
```

## Report Export

```typescript
// Export as CSV
const csvData = await analytics.exportReport('thread-123', 'csv');

// Export as JSON
const jsonData = await analytics.exportReport('thread-123', 'json');

// Export as PDF
const pdfData = await analytics.exportReport('thread-123', 'pdf');

// Export with custom period
const customReport = await analytics.exportReport('thread-123', 'pdf', {
    start: new Date('2024-03-21T00:00:00Z'),
    end: new Date('2024-03-21T23:59:59Z')
});

// Batch export
const threadIds = ['thread-123', 'thread-456', 'thread-789'];
const batchResults = await analytics.exportBatchReports(threadIds, 'pdf');
```

## React Hook

```typescript
import { useThreadAnalytics } from '@/hooks/useThreadAnalytics';

function ThreadAnalytics({ threadId }: { threadId: string }) {
    const {
        metrics,
        performance,
        report,
        loading,
        error,
        refreshMetrics,
        refreshPerformance,
        refreshReport,
        exportReport,
        exportStatus
    } = useThreadAnalytics(threadId, {
        pollInterval: 60000,
        includePerformance: true,
        includeReports: true,
        realtimePerformance: true
    });

    if (loading) return <div>Loading...</div>;
    if (error) return <div>Error: {error.message}</div>;

    return (
        <div>
            <h2>Thread Metrics</h2>
            <p>Messages: {metrics?.messageCount}</p>
            <p>Participants: {metrics?.participantCount}</p>
            
            <h2>Performance</h2>
            <p>Load Time: {performance?.loadTime}ms</p>
            <p>Error Rate: {performance?.errorRate * 100}%</p>
            
            <button onClick={() => exportReport('pdf')}>
                Export Report
            </button>
        </div>
    );
}
```

## Database Schema

The module uses several optimized tables and materialized views:

```sql
-- Core tables
thread_events        -- Event tracking
thread_metrics       -- Thread metrics
thread_performance   -- Performance metrics
thread_trends        -- Time-series data

-- Materialized views
thread_activity_summary  -- Combined metrics
thread_hourly_trends    -- Aggregated trends
```

See [analytics-optimizations.mdx](../../../docs/analytics-optimizations.mdx) for detailed schema information and optimization strategies.

## Configuration

Key configuration options are available through environment variables:

```env
ANALYTICS_RETENTION_DAYS=30          # Data retention period
ANALYTICS_REFRESH_INTERVAL=3600      # View refresh interval (seconds)
ANALYTICS_CACHE_PREFIX=thread        # Cache key prefix
ANALYTICS_MAX_BATCH_SIZE=100        # Maximum batch export size
```

## Testing

Run the test suite:

```bash
# Run all tests
pnpm test src/services/analytics

# Run specific test file
pnpm test src/services/analytics/__tests__/ThreadAnalyticsService.test.ts

# Run SQL tests
psql -f supabase/migrations/__tests__/20240322000000_optimize_thread_analytics.test.sql
```

## Performance Monitoring

Monitor key metrics:

1. Cache hit rates:
   ```typescript
   const stats = await analytics.getCacheStats();
   console.log(`Hit rate: ${stats.hitRate * 100}%`);
   ```

2. Query performance:
   ```typescript
   const metrics = await analytics.getPerformanceMetrics();
   console.log(`Average query time: ${metrics.avgQueryTime}ms`);
   ```

3. Storage usage:
   ```typescript
   const usage = await analytics.getStorageStats();
   console.log(`Total size: ${usage.totalSizeGB}GB`);
   ```

## Best Practices

1. Event Tracking:
   - Track events as they occur
   - Include relevant metadata
   - Use appropriate event types

2. Performance Monitoring:
   - Enable real-time tracking for active threads
   - Set up alerts for performance warnings
   - Monitor cache hit rates

3. Report Generation:
   - Cache reports when possible
   - Use appropriate time ranges
   - Consider batch exports for multiple threads

4. Error Handling:
   - Handle network errors gracefully
   - Implement retry logic
   - Log errors appropriately

## Contributing

1. Follow the coding style
2. Add tests for new features
3. Update documentation
4. Run the test suite before submitting PRs

## License

MIT License - see [LICENSE](../../../LICENSE) for details 