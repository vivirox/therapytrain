import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, Grid, Typography, Tooltip, LinearProgress } from '@mui/material';
import { TrendingUp, TrendingDown, TrendingFlat } from '@mui/icons-material';
import { ComparativeAnalyticsService } from '@/services/analytics/ComparativeAnalyticsService';

interface ComparisonResult {
  metric: string;
  currentValue: number;
  benchmarkValue: number;
  percentDifference: number;
  trend: 'improving' | 'stable' | 'declining';
  significance: number;
}

interface ComparativeAnalyticsCardProps {
  sessionId: string;
  metrics: string[];
  therapyType?: string;
  clientGroup?: string;
  className?: string;
}

export const ComparativeAnalyticsCard: React.FC<ComparativeAnalyticsCardProps> = ({
  sessionId,
  metrics,
  therapyType,
  clientGroup,
  className
}) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [comparisons, setComparisons] = useState<ComparisonResult[]>([]);
  const analyticsService = ComparativeAnalyticsService.getInstance();

  useEffect(() => {
    const fetchComparisons = async () => {
      try {
        setLoading(true);
        const results = await analyticsService.compareWithBenchmark(sessionId, {
          timeframe: 'session',
          metrics,
          therapyType,
          clientGroup
        });
        setComparisons(results);
      } catch (err) {
        setError(err as Error);
      } finally {
        setLoading(false);
      }
    };

    fetchComparisons();
  }, [sessionId, metrics, therapyType, clientGroup]);

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'improving':
        return <TrendingUp color="success" />;
      case 'declining':
        return <TrendingDown color="error" />;
      default:
        return <TrendingFlat color="info" />;
    }
  };

  const formatValue = (value: number): string => {
    if (value >= 100) {
      return value.toFixed(0);
    }
    return value.toFixed(1);
  };

  const getPercentageColor = (percentage: number): string => {
    if (percentage > 10) return 'success.main';
    if (percentage < -10) return 'error.main';
    return 'info.main';
  };

  if (loading) {
    return (
      <Card className={className}>
        <CardContent>
          <LinearProgress />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className={className}>
        <CardContent>
          <Typography color="error">
            Error loading comparisons: {error.message}
          </Typography>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader 
        title="Comparative Analysis"
        subheader="Performance relative to benchmarks"
      />
      <CardContent>
        <Grid container spacing={2}>
          {comparisons.map((comparison) => (
            <Grid item xs={12} key={comparison.metric}>
              <Tooltip
                title={`Benchmark: ${formatValue(comparison.benchmarkValue)}`}
                arrow
              >
                <div>
                  <Grid container alignItems="center" spacing={1}>
                    <Grid item xs={4}>
                      <Typography variant="body2" color="textSecondary">
                        {comparison.metric}
                      </Typography>
                    </Grid>
                    <Grid item xs={3}>
                      <Typography variant="body1">
                        {formatValue(comparison.currentValue)}
                      </Typography>
                    </Grid>
                    <Grid item xs={3}>
                      <Typography
                        variant="body2"
                        sx={{ color: getPercentageColor(comparison.percentDifference) }}
                      >
                        {comparison.percentDifference > 0 ? '+' : ''}
                        {formatValue(comparison.percentDifference)}%
                      </Typography>
                    </Grid>
                    <Grid item xs={2}>
                      {getTrendIcon(comparison.trend)}
                    </Grid>
                  </Grid>
                  <LinearProgress
                    variant="determinate"
                    value={Math.min(Math.max((comparison.currentValue / comparison.benchmarkValue) * 100, 0), 100)}
                    sx={{
                      mt: 1,
                      height: 4,
                      bgcolor: 'grey.200',
                      '& .MuiLinearProgress-bar': {
                        bgcolor: getPercentageColor(comparison.percentDifference)
                      }
                    }}
                  />
                </div>
              </Tooltip>
            </Grid>
          ))}
        </Grid>
      </CardContent>
    </Card>
  );
}; 