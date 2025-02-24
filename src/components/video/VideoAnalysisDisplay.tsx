import React, { useRef, useEffect, useCallback, useMemo } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  IconButton,
  Alert,
  LinearProgress,
  useTheme,
  Grid,
} from '@mui/material';
import {
  Videocam as VideocamIcon,
  VideocamOff as VideocamOffIcon,
  Cameraswitch as CameraswitchIcon,
  Warning as WarningIcon,
} from '@mui/icons-material';
import { useVideoRecognition } from '@/hooks/useVideoRecognition';
import { VideoAnalysisResult } from '@/types/video';
import { EmotionalResponse } from '@/types/emotions';

interface VideoAnalysisDisplayProps {
  onAnalysisComplete?: (result: VideoAnalysisResult) => void;
  onEmotionalStateUpdate?: (state: EmotionalResponse) => void;
  className?: string;
}

const HAND_CONNECTIONS = [
  [0, 1], [1, 2], [2, 3], [3, 4], // Thumb
  [0, 5], [5, 6], [6, 7], [7, 8], // Index finger
  [0, 9], [9, 10], [10, 11], [11, 12], // Middle finger
  [0, 13], [13, 14], [14, 15], [15, 16], // Ring finger
  [0, 17], [17, 18], [18, 19], [19, 20], // Pinky
  [0, 5], [5, 9], [9, 13], [13, 17], // Palm
] as const;

// Memoized canvas drawing functions
const drawFaceDetection = (
  ctx: CanvasRenderingContext2D,
  faceDetection: NonNullable<VideoAnalysisResult['faceDetection']>,
  colors: { primary: string; secondary: string; text: string }
) => {
  const { boundingBox, landmarks } = faceDetection;

  // Draw face bounding box
  ctx.strokeStyle = colors.primary;
  ctx.lineWidth = 2;
  ctx.strokeRect(
    boundingBox.x,
    boundingBox.y,
    boundingBox.width,
    boundingBox.height
  );

  // Draw face landmarks
  ctx.fillStyle = colors.secondary;
  landmarks.positions.forEach(point => {
    ctx.beginPath();
    ctx.arc(point.x, point.y, 2, 0, 2 * Math.PI);
    ctx.fill();
  });

  // Draw confidence score
  ctx.font = '16px Arial';
  ctx.fillStyle = colors.text;
  ctx.fillText(
    `Confidence: ${Math.round(faceDetection.confidence * 100)}%`,
    10,
    30
  );
};

const drawHandLandmarks = (
  ctx: CanvasRenderingContext2D,
  landmarks: NonNullable<VideoAnalysisResult['gestureDetection']>['landmarks'],
  canvasWidth: number,
  canvasHeight: number,
  colors: { primary: string; secondary: string }
) => {
  // Set up styles
  ctx.strokeStyle = colors.primary;
  ctx.fillStyle = colors.secondary;
  ctx.lineWidth = 2;

  // Draw each hand's landmarks
  landmarks.forEach(handLandmarks => {
    // Draw connections
    HAND_CONNECTIONS.forEach(([i, j]) => {
      const start = handLandmarks[i];
      const end = handLandmarks[j];

      ctx.beginPath();
      ctx.moveTo(start.x * canvasWidth, start.y * canvasHeight);
      ctx.lineTo(end.x * canvasWidth, end.y * canvasHeight);
      ctx.stroke();
    });

    // Draw landmarks
    handLandmarks.forEach(point => {
      ctx.beginPath();
      ctx.arc(
        point.x * canvasWidth,
        point.y * canvasHeight,
        3,
        0,
        2 * Math.PI
      );
      ctx.fill();
    });
  });
};

export const VideoAnalysisDisplay: React.FC<VideoAnalysisDisplayProps> = React.memo(({
  onAnalysisComplete,
  onEmotionalStateUpdate,
  className,
}) => {
  const theme = useTheme();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [facingMode, setFacingMode] = React.useState<'user' | 'environment'>('user');
  const animationFrameRef = useRef<number>();

  const {
    status,
    error,
    analysisResult,
    startAnalysis,
    stopAnalysis,
    isRunning,
    isError,
  } = useVideoRecognition({
    onAnalysisComplete,
    onEmotionalStateUpdate,
    config: {
      width: 640,
      height: 480,
      fps: 30,
      facingMode,
    },
  });

  // Memoize colors to prevent unnecessary re-renders
  const colors = useMemo(() => ({
    primary: theme.palette.primary.main,
    secondary: theme.palette.secondary.main,
    text: theme.palette.text.primary,
  }), [theme.palette]);

  // Memoized canvas drawing function
  const drawCanvas = useCallback(() => {
    if (!canvasRef.current || !analysisResult) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear previous drawing
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw face detection results
    if (analysisResult.faceDetection) {
      drawFaceDetection(ctx, analysisResult.faceDetection, colors);
    }

    // Draw hand landmarks
    if (analysisResult.gestureDetection?.landmarks) {
      drawHandLandmarks(
        ctx,
        analysisResult.gestureDetection.landmarks,
        canvas.width,
        canvas.height,
        colors
      );

      // Draw gesture label
      if (analysisResult.gestureDetection.gesture) {
        ctx.font = '16px Arial';
        ctx.fillStyle = colors.text;
        ctx.fillText(
          `${analysisResult.gestureDetection.gesture} (${Math.round(analysisResult.gestureDetection.confidence * 100)}%)`,
          10,
          60
        );
      }
    }

    // Request next frame
    animationFrameRef.current = requestAnimationFrame(drawCanvas);
  }, [analysisResult, colors]);

  // Set up canvas animation
  useEffect(() => {
    drawCanvas();
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [drawCanvas]);

  const toggleCamera = useCallback(() => {
    stopAnalysis();
    setFacingMode(prev => (prev === 'user' ? 'environment' : 'user'));
  }, [stopAnalysis]);

  // Memoize expressions rendering
  const renderExpressions = useCallback((expressions: Record<string, number>) => (
    Object.entries(expressions).map(([emotion, value]) => (
      <Box key={emotion} display="flex" alignItems="center" mb={0.5}>
        <Typography variant="caption" style={{ minWidth: 80 }}>
          {emotion.charAt(0).toUpperCase() + emotion.slice(1)}:
        </Typography>
        <Box flex={1} mx={1}>
          <LinearProgress
            variant="determinate"
            value={value * 100}
            color="secondary"
          />
        </Box>
        <Typography variant="caption" color="textSecondary">
          {Math.round(value * 100)}%
        </Typography>
      </Box>
    ))
  ), []);

  return (
    <Card className={className}>
      <CardContent>
        <Box display="flex" alignItems="center" mb={2}>
          <Typography variant="h6">Video Analysis</Typography>
          <Box ml="auto">
            <IconButton
              onClick={toggleCamera}
              disabled={isRunning}
              color="primary"
              sx={{ mr: 1 }}
            >
              <CameraswitchIcon />
            </IconButton>
            <IconButton
              onClick={isRunning ? stopAnalysis : startAnalysis}
              color={isRunning ? 'error' : 'primary'}
            >
              {isRunning ? <VideocamOffIcon /> : <VideocamIcon />}
            </IconButton>
          </Box>
        </Box>

        {status === 'initializing' && (
          <Box mb={2}>
            <LinearProgress />
            <Typography variant="body2" color="textSecondary" align="center">
              Initializing video analysis...
            </Typography>
          </Box>
        )}

        {isError && error && (
          <Alert
            severity="error"
            icon={<WarningIcon />}
            sx={{ mb: 2 }}
          >
            {error.message}
          </Alert>
        )}

        <Box position="relative" width="100%" paddingTop="75%">
          <Box
            position="absolute"
            top={0}
            left={0}
            width="100%"
            height="100%"
            bgcolor="background.default"
            borderRadius={1}
            overflow="hidden"
          >
            <video
              ref={videoRef}
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                transform: facingMode === 'user' ? 'scaleX(-1)' : 'none',
              }}
              playsInline
              muted
            />
            <canvas
              ref={canvasRef}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                transform: facingMode === 'user' ? 'scaleX(-1)' : 'none',
              }}
            />
          </Box>
        </Box>

        {analysisResult && (
          <Box mt={2}>
            <Typography variant="subtitle2" gutterBottom>
              Analysis Results
            </Typography>
            <Grid container spacing={2}>
              {analysisResult.faceDetection && (
                <Grid item xs={12} sm={6}>
                  <Typography variant="body2" color="textSecondary">
                    Face Detection Confidence:
                  </Typography>
                  <LinearProgress
                    variant="determinate"
                    value={analysisResult.faceDetection.confidence * 100}
                    color="primary"
                  />
                  <Box mt={1}>
                    <Typography variant="body2" color="textSecondary">
                      Expressions:
                    </Typography>
                    {renderExpressions(analysisResult.faceDetection.expressions)}
                  </Box>
                </Grid>
              )}
              {analysisResult.gestureDetection && (
                <Grid item xs={12} sm={6}>
                  <Typography variant="body2" color="textSecondary">
                    Detected Gesture:
                  </Typography>
                  <Box display="flex" alignItems="center" mb={1}>
                    <Typography variant="body1" color="primary" sx={{ mr: 1 }}>
                      {analysisResult.gestureDetection.gesture.charAt(0).toUpperCase() +
                        analysisResult.gestureDetection.gesture.slice(1)}
                    </Typography>
                    <LinearProgress
                      variant="determinate"
                      value={analysisResult.gestureDetection.confidence * 100}
                      color="secondary"
                      sx={{ flex: 1 }}
                    />
                    <Typography variant="caption" color="textSecondary" sx={{ ml: 1 }}>
                      {Math.round(analysisResult.gestureDetection.confidence * 100)}%
                    </Typography>
                  </Box>
                  {/* Draw hand landmarks on canvas */}
                  {canvasRef.current && analysisResult.gestureDetection.landmarks && (
                    <Box
                      component="canvas"
                      ref={canvasRef}
                      sx={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        width: '100%',
                        height: '100%',
                        pointerEvents: 'none',
                        transform: facingMode === 'user' ? 'scaleX(-1)' : 'none',
                      }}
                    />
                  )}
                </Grid>
              )}
            </Grid>
          </Box>
        )}
      </CardContent>
    </Card>
  );
}); 