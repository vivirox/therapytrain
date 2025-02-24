import React from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  LinearProgress,
  Grid,
  IconButton,
  Tooltip
} from '@mui/material';
import {
  Mic as MicIcon,
  Stop as StopIcon,
  Warning as WarningIcon
} from '@mui/icons-material';
import { useAudioProcessing } from '@/hooks/useAudioProcessing';
import { AudioAnalysisResult } from '@/types/audio';
import { EmotionalResponse } from '@/types/emotions';

interface AudioAnalysisDisplayProps {
  onAnalysisComplete?: (result: AudioAnalysisResult) => void;
  className?: string;
}

export const AudioAnalysisDisplay: React.FC<AudioAnalysisDisplayProps> = ({
  onAnalysisComplete,
  className
}) => {
  const {
    status,
    error,
    analysisResult,
    startRecording,
    stopRecording,
    isRecording,
    isProcessing,
    isError
  } = useAudioProcessing({
    onAnalysisComplete
  });

  const renderEmotionalContent = (emotional: EmotionalResponse) => (
    <Box>
      <Typography variant="subtitle2" color="textSecondary" gutterBottom>
        Emotional Analysis
      </Typography>
      <Grid container spacing={1}>
        {Object.entries(emotional.probabilities).map(([emotion, probability]) => (
          <Grid item xs={12} key={emotion}>
            <Box display="flex" alignItems="center" mb={1}>
              <Typography variant="body2" style={{ minWidth: 100 }}>
                {emotion.charAt(0).toUpperCase() + emotion.slice(1)}
              </Typography>
              <Box flex={1} mx={1}>
                <LinearProgress
                  variant="determinate"
                  value={probability * 100}
                  color={emotion === emotional.primary ? 'primary' : 'secondary'}
                />
              </Box>
              <Typography variant="body2" color="textSecondary">
                {Math.round(probability * 100)}%
              </Typography>
            </Box>
          </Grid>
        ))}
      </Grid>
      <Typography variant="body2" color="textSecondary">
        Confidence: {Math.round(emotional.confidence * 100)}%
      </Typography>
    </Box>
  );

  const renderSpeechPatterns = (patterns: AudioAnalysisResult['speechPatterns']) => (
    <Box mt={2}>
      <Typography variant="subtitle2" color="textSecondary" gutterBottom>
        Speech Patterns
      </Typography>
      <Grid container spacing={2}>
        <Grid item xs={6}>
          <Typography variant="body2">Speech Rate</Typography>
          <LinearProgress
            variant="determinate"
            value={Math.min(100, (patterns.speechRate / 150) * 100)}
            color="primary"
          />
          <Typography variant="caption" color="textSecondary">
            {Math.round(patterns.speechRate)} words/min
          </Typography>
        </Grid>
        <Grid item xs={6}>
          <Typography variant="body2">Articulation</Typography>
          <LinearProgress
            variant="determinate"
            value={patterns.articulationQuality * 100}
            color="primary"
          />
          <Typography variant="caption" color="textSecondary">
            {Math.round(patterns.articulationQuality * 100)}% clarity
          </Typography>
        </Grid>
        <Grid item xs={6}>
          <Typography variant="body2">Prosody Variation</Typography>
          <LinearProgress
            variant="determinate"
            value={patterns.prosody.variation * 100}
            color="primary"
          />
          <Typography variant="caption" color="textSecondary">
            {Math.round(patterns.prosody.variation * 100)}% variation
          </Typography>
        </Grid>
        <Grid item xs={6}>
          <Typography variant="body2">Rhythm</Typography>
          <LinearProgress
            variant="determinate"
            value={patterns.prosody.rhythm * 100}
            color="primary"
          />
          <Typography variant="caption" color="textSecondary">
            {Math.round(patterns.prosody.rhythm * 100)}% consistency
          </Typography>
        </Grid>
      </Grid>
    </Box>
  );

  return (
    <Card className={className}>
      <CardContent>
        <Box display="flex" alignItems="center" mb={2}>
          <Typography variant="h6" component="div">
            Audio Analysis
          </Typography>
          <Box ml="auto">
            <Tooltip title={isRecording ? 'Stop Recording' : 'Start Recording'}>
              <IconButton
                color={isRecording ? 'secondary' : 'primary'}
                onClick={isRecording ? stopRecording : startRecording}
                disabled={isProcessing}
              >
                {isRecording ? <StopIcon /> : <MicIcon />}
              </IconButton>
            </Tooltip>
          </Box>
        </Box>

        {isProcessing && (
          <Box mb={2}>
            <LinearProgress />
            <Typography variant="body2" color="textSecondary" align="center">
              Processing audio...
            </Typography>
          </Box>
        )}

        {isError && error && (
          <Box
            mb={2}
            p={2}
            bgcolor="error.light"
            borderRadius={1}
            display="flex"
            alignItems="center"
          >
            <WarningIcon color="error" style={{ marginRight: 8 }} />
            <Typography color="error">
              {error.message}
            </Typography>
          </Box>
        )}

        {analysisResult && (
          <>
            {renderEmotionalContent(analysisResult.emotionalContent)}
            {renderSpeechPatterns(analysisResult.speechPatterns)}
            
            <Box mt={2}>
              <Typography variant="caption" color="textSecondary" display="block">
                Duration: {analysisResult.duration.toFixed(1)}s
              </Typography>
              <Typography variant="caption" color="textSecondary" display="block">
                Sample Rate: {analysisResult.sampleRate}Hz
              </Typography>
              <Typography variant="caption" color="textSecondary" display="block">
                Recorded at: {analysisResult.timestamp.toLocaleString()}
              </Typography>
            </Box>
          </>
        )}
      </CardContent>
    </Card>
  );
}; 