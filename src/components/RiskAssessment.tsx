import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '../components/ui/alert';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../components/ui/table";
import { AlertTriangle, AlertCircle, Info } from 'lucide-react';
import CrisisPrediction, {
  type RiskAssessment as RiskAssessmentType,
  type RiskFactor
} from '../services/crisisPrediction';

interface Props {
  sessionId: string;
  clientId: string;
  className?: string;
}

const RiskAssessment = ({ sessionId, clientId, className = '' }: Props) => {
  const [assessment, setAssessment] = useState<RiskAssessmentType | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    const assessRisk = async () => {
      try {
        const data = await CrisisPrediction.assessRisk(sessionId, clientId);
        setAssessment(data);

        // Trigger alert if risk is high
        if (data.urgency === 'high' || data.urgency === 'critical') {
          await CrisisPrediction.triggerAlert(clientId, data);
        }
      } catch (error) {
        console.error('Error assessing risk:', error);
      } finally {
        setIsLoading(false);
      }
    };

    assessRisk();
    // Refresh assessment every 5 minutes
    const interval = setInterval(assessRisk, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [sessionId, clientId]);

  const getUrgencyColor = (urgency: RiskAssessmentType['urgency']) => {
    switch (urgency) {
      case 'critical':
        return 'bg-red-100 text-red-800 border-red-300';
      case 'high':
        return 'bg-orange-100 text-orange-800 border-orange-300';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'low':
        return 'bg-green-100 text-green-800 border-green-300';
    }
  };

  const getUrgencyIcon = (urgency: RiskAssessmentType['urgency']) => {
    switch (urgency) {
      case 'critical':
      case 'high':
        return <AlertTriangle className="h-4 w-4" />;
      case 'medium':
        return <AlertCircle className="h-4 w-4" />;
      case 'low':
        return <Info className="h-4 w-4" />;
    }
  };

  if (isLoading) {
    return (
      <Card className={`${className} min-h-[200px] flex items-center justify-center`}>
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900" />
      </Card>
    );
  }

  if (!assessment) {
    return null;
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Risk Assessment</span>
          <Badge
            variant="outline"
            className={`${getUrgencyColor(assessment.urgency)} flex gap-1`}
          >
            {getUrgencyIcon(assessment.urgency)}
            {assessment.urgency.toUpperCase()}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Risk Score */}
          <div className="text-center">
            <div className="text-3xl font-bold">
              {(assessment.overallRisk * 100).toFixed(1)}%
            </div>
            <div className="text-sm text-gray-500">Risk Score</div>
          </div>

          {/* Alert for high/critical risk */}
          {(assessment.urgency === 'high' || assessment.urgency === 'critical') && (
            <Alert variant="destructive" className="mt-4">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Immediate Action Required</AlertTitle>
              <AlertDescription>
                High risk level detected. Please review the escalation protocol.
              </AlertDescription>
            </Alert>
          )}

          {/* Key Recommendations */}
          <div>
            <h3 className="font-medium mb-2">Key Recommendations</h3>
            <ul className="space-y-1">
              {assessment.recommendations.slice(0, 3).map((rec, i) => (
                <li key={i} className="text-sm text-gray-600">• {rec}</li>
              ))}
            </ul>
          </div>

          {/* View Details Button */}
          <Dialog open={showDetails} onOpenChange={setShowDetails}>
            <DialogTrigger asChild>
              <Button variant="outline" className="w-full">
                View Full Assessment
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Detailed Risk Assessment</DialogTitle>
                <DialogDescription>
                  Comprehensive analysis of risk factors and recommended actions
                </DialogDescription>
              </DialogHeader>

              {/* Risk Factors Table */}
              <div className="mt-4">
                <h3 className="font-medium mb-2">Risk Factors</h3>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Type</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Severity</TableHead>
                      <TableHead>Confidence</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {assessment.factors.map((factor, i) => (
                      <TableRow key={i}>
                        <TableCell className="capitalize">{factor.type}</TableCell>
                        <TableCell>{factor.description}</TableCell>
                        <TableCell>
                          {(factor.severity * 100).toFixed(1)}%
                        </TableCell>
                        <TableCell>
                          {(factor.confidence * 100).toFixed(1)}%
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Next Steps */}
              <div className="mt-4">
                <h3 className="font-medium mb-2">Next Steps</h3>
                <ul className="space-y-2">
                  {assessment.nextSteps.map((step, i) => (
                    <li key={i} className="text-sm">
                      {step}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Escalation Protocol */}
              {assessment.escalationProtocol && (
                <div className="mt-4">
                  <Alert>
                    <AlertTitle>Escalation Protocol</AlertTitle>
                    <AlertDescription className="whitespace-pre-line">
                      {assessment.escalationProtocol}
                    </AlertDescription>
                  </Alert>
                </div>
              )}

              {/* All Recommendations */}
              <div className="mt-4">
                <h3 className="font-medium mb-2">All Recommendations</h3>
                <ul className="space-y-2">
                  {assessment.recommendations.map((rec, i) => (
                    <li key={i} className="text-sm">
                      • {rec}
                    </li>
                  ))}
                </ul>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </CardContent>
    </Card>
  );
};

export default RiskAssessment;
