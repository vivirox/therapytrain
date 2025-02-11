import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { MdWarning, MdCheckCircle, MdError } from 'react-icons/md';
import { SpamDetectionService } from '@/lib/email/spam-detection';

interface SpamDetectionCardProps {
  sender: string;
  onSpamDetected?: (result: boolean) => void;
}

export const SpamDetectionCard: React.FC<SpamDetectionCardProps> = ({
  sender,
  onSpamDetected,
}) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [spamResult, setSpamResult] = useState<Awaited<ReturnType<typeof SpamDetectionService.analyzeSender>> | null>(null);

  useEffect(() => {
    analyzeSender();
  }, [sender]);

  const analyzeSender = async () => {
    try {
      setLoading(true);
      const result = await SpamDetectionService.analyzeSender(sender);
      setSpamResult(result);
      onSpamDetected?.(result.isSpam);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to analyze sender');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card className="bg-white/5 border-white/10">
        <CardHeader>
          <CardTitle>Spam Detection</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-32">
            Loading...
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="bg-white/5 border-white/10">
        <CardHeader>
          <CardTitle>Spam Detection</CardTitle>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive">
            <MdError className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  if (!spamResult) return null;

  const { signals, reason, isSpam } = spamResult;

  return (
    <Card className="bg-white/5 border-white/10">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <span>Spam Detection</span>
          {isSpam ? (
            <MdWarning className="text-yellow-500 h-5 w-5" />
          ) : (
            <MdCheckCircle className="text-green-500 h-5 w-5" />
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {isSpam && (
          <Alert variant="warning">
            <MdWarning className="h-4 w-4" />
            <AlertTitle>Potential Spam Detected</AlertTitle>
            <AlertDescription>
              <ul className="list-disc list-inside">
                {reason.map((r, i) => (
                  <li key={i}>{r}</li>
                ))}
              </ul>
            </AlertDescription>
          </Alert>
        )}

        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Risk Score</span>
            <span>{(signals.riskScore * 100).toFixed(1)}%</span>
          </div>
          <Progress
            value={signals.riskScore * 100}
            className={signals.riskScore > 0.7 ? 'bg-red-500' : 'bg-green-500'}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <div className="text-sm font-medium mb-1">Bounce Rate</div>
            <div className={`text-lg ${signals.bounceRate > 0.05 ? 'text-red-500' : 'text-green-500'}`}>
              {(signals.bounceRate * 100).toFixed(1)}%
            </div>
          </div>
          <div>
            <div className="text-sm font-medium mb-1">Spam Reports</div>
            <div className={`text-lg ${signals.spamReports > 0.02 ? 'text-red-500' : 'text-green-500'}`}>
              {(signals.spamReports * 100).toFixed(1)}%
            </div>
          </div>
        </div>

        {(signals.rapidSendRate || signals.suspiciousPatterns) && (
          <div className="border-t border-white/10 pt-4 mt-4">
            <div className="text-sm font-medium mb-2">Additional Signals</div>
            <ul className="space-y-1 text-sm">
              {signals.rapidSendRate && (
                <li className="text-yellow-500">• High sending rate detected</li>
              )}
              {signals.suspiciousPatterns && (
                <li className="text-yellow-500">• Suspicious patterns detected</li>
              )}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}; 