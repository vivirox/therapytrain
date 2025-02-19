import React from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  LinearProgress,
  Tooltip,
  IconButton,
  Divider
} from '@mui/material';
import {
  Timeline,
  TimelineItem,
  TimelineSeparator,
  TimelineConnector,
  TimelineContent,
  TimelineDot
} from '@mui/lab';
import {
  Refresh as RefreshIcon,
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
  TrendingFlat as TrendingFlatIcon
} from '@mui/icons-material';
import { EmotionalContext, EmotionalTrend, EmotionType } from '@/types/emotions';
import { ModelMetrics } from '@/types/models';

interface EmotionalTrendsDisplayProps {
  emotionalContext: EmotionalContext;
  modelMetrics?: ModelMetrics | null;
  onRefresh?: () => void;
  className?: string;
}

const EMOTION_COLORS: Record<EmotionType, string> = {
  joy: '#4CAF50',
  sadness: '#2196F3',
  anger: '#F44336',
  fear: '#9C27B0',
  neutral: '#9E9E9E'
};

export const EmotionalTrendsDisplay: React.FC<EmotionalTrendsDisplayProps> = ({
  emotionalContext,
  modelMetrics,
  onRefresh,
  className
}) => {
  const {
    baselineEmotion,
    historicalContext: {
      dominantEmotion,
      emotionalStability,
      emotionalVariability,
      averageIntensity,
      confidenceScore,
      trends
    }
  } = emotionalContext;

  const renderMetricBar = (
    label: string,
    value: number,
    color: string = 'primary'
  ) => (
    <Box mb={2}>
      <Box display="flex" justifyContent="space-between" mb={0.5}>
        <Typography variant="body2">{label}</Typography>
        <Typography variant="body2" color="textSecondary">
          {Math.round(value * 100)}%
        </Typography>
      </Box>
      <LinearProgress
        variant="determinate"
        value={value * 100}
        color={color as any}
      />
    </Box>
  );

  const getTrendIcon = (trend: EmotionalTrend) => {
    const intensity = trend.averageIntensity;
    if (intensity > 0.7) return <TrendingUpIcon />;
    if (intensity < 0.3) return <TrendingDownIcon />;
    return <TrendingFlatIcon />;
  };

  const formatDuration = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    if (minutes < 1) return `${Math.round(seconds)}s`;
    const hours = Math.floor(minutes / 60);
    if (hours < 1) return `${minutes}m`;
    return `${hours}h ${minutes % 60}m`;
  };

  return (
    <Card className={className}>
      <CardContent>
        <Box display="flex" alignItems="center" mb={3}>
          <Typography variant="h6">Emotional Trends</Typography>
          {onRefresh && (
            <IconButton onClick={onRefresh} size="small" sx={{ ml: 'auto' }}>
              <RefreshIcon />
            </IconButton>
          )}
        </Box>

        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Typography variant="subtitle2" gutterBottom>
              Current Metrics
            </Typography>
            {renderMetricBar('Emotional Stability', emotionalStability)}
            {renderMetricBar('Emotional Variability', emotionalVariability)}
            {renderMetricBar('Average Intensity', averageIntensity)}
            {renderMetricBar('Confidence Score', confidenceScore)}
          </Grid>

          <Grid item xs={12} md={6}>
            <Typography variant="subtitle2" gutterBottom>
              Emotional States
            </Typography>
            <Box mb={2}>
              <Typography variant="body2">
                Baseline Emotion:{' '}
                <Box
                  component="span"
                  sx={{
                    color: EMOTION_COLORS[baselineEmotion],
                    fontWeight: 'medium'
                  }}
                >
                  {baselineEmotion.charAt(0).toUpperCase() + baselineEmotion.slice(1)}
                </Box>
              </Typography>
              <Typography variant="body2">
                Dominant Emotion:{' '}
                <Box
                  component="span"
                  sx={{
                    color: EMOTION_COLORS[dominantEmotion],
                    fontWeight: 'medium'
                  }}
                >
                  {dominantEmotion.charAt(0).toUpperCase() + dominantEmotion.slice(1)}
                </Box>
              </Typography>
            </Box>
          </Grid>

          {modelMetrics && (
            <Grid item xs={12}>
              <Divider sx={{ my: 2 }} />
              <Typography variant="subtitle2" gutterBottom>
                AI Model Performance
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6} md={3}>
                  <Box mb={2}>
                    <Typography variant="body2">Accuracy</Typography>
                    <LinearProgress
                      variant="determinate"
                      value={modelMetrics.accuracy * 100}
                      color="primary"
                    />
                    <Typography variant="caption" color="textSecondary">
                      {Math.round(modelMetrics.accuracy * 100)}%
                    </Typography>
                  </Box>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <Box mb={2}>
                    <Typography variant="body2">Privacy Score</Typography>
                    <LinearProgress
                      variant="determinate"
                      value={modelMetrics.privacyScore * 100}
                      color="secondary"
                    />
                    <Typography variant="caption" color="textSecondary">
                      {Math.round(modelMetrics.privacyScore * 100)}%
                    </Typography>
                  </Box>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <Box mb={2}>
                    <Typography variant="body2">Robustness</Typography>
                    <LinearProgress
                      variant="determinate"
                      value={modelMetrics.robustnessScore * 100}
                      color="info"
                    />
                    <Typography variant="caption" color="textSecondary">
                      {Math.round(modelMetrics.robustnessScore * 100)}%
                    </Typography>
                  </Box>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <Box mb={2}>
                    <Typography variant="body2">Response Time</Typography>
                    <LinearProgress
                      variant="determinate"
                      value={Math.min(100, (modelMetrics.latency / 1000) * 100)}
                      color="warning"
                    />
                    <Typography variant="caption" color="textSecondary">
                      {modelMetrics.latency.toFixed(0)}ms
                    </Typography>
                  </Box>
                </Grid>
              </Grid>
              {modelMetrics.lossHistory.length > 0 && (
                <Box mt={2}>
                  <Typography variant="body2" gutterBottom>
                    Learning Progress
                  </Typography>
                  <Box
                    sx={{
                      height: 100,
                      position: 'relative',
                      '& .trend-line': {
                        position: 'absolute',
                        bottom: 0,
                        left: 0,
                        width: '100%',
                        height: '100%',
                        display: 'flex',
                        alignItems: 'flex-end',
                      },
                    }}
                  >
                    {modelMetrics.lossHistory.map((loss, index) => (
                      <Box
                        key={index}
                        sx={{
                          width: `${100 / modelMetrics.lossHistory.length}%`,
                          height: `${(1 - loss) * 100}%`,
                          bgcolor: 'primary.main',
                          opacity: 0.7,
                          transition: 'height 0.3s ease',
                        }}
                      />
                    ))}
                  </Box>
                </Box>
              )}
            </Grid>
          )}
        </Grid>

        <Box mt={3}>
          <Typography variant="subtitle2" gutterBottom>
            Recent Trends
          </Typography>
          <Timeline>
            {trends.slice(-5).map((trend, index) => (
              <TimelineItem key={index}>
                <TimelineSeparator>
                  <TimelineDot
                    sx={{
                      bgcolor: EMOTION_COLORS[trend.emotion]
                    }}
                  >
                    {getTrendIcon(trend)}
                  </TimelineDot>
                  {index < trends.length - 1 && <TimelineConnector />}
                </TimelineSeparator>
                <TimelineContent>
                  <Tooltip
                    title={`Confidence: ${Math.round(trend.confidence * 100)}%`}
                  >
                    <Box>
                      <Typography variant="body2">
                        {trend.emotion.charAt(0).toUpperCase() + trend.emotion.slice(1)}
                      </Typography>
                      <Typography variant="caption" color="textSecondary">
                        Duration: {formatDuration(trend.duration)}
                        {' • '}
                        Intensity: {Math.round(trend.averageIntensity * 100)}%
                      </Typography>
                    </Box>
                  </Tooltip>
                </TimelineContent>
              </TimelineItem>
            ))}
          </Timeline>
        </Box>
      </CardContent>
    </Card>
  );
}; 