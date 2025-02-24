export interface InterventionTrackerProps {
  sessionId: string;
  onEffectivenessUpdate: (effectiveness: number) => void;
}

export interface PeerReviewProps {
  sessionId: string;
  therapistId: string;
  onSubmitReview: (review: PeerReview) => void;
}

export interface PeerReview {
  rating: number;
  comments: string;
  areas: string[];
}

export interface SessionAnalysisProps {
  sessionId: string;
  onGenerateReport: (report: SessionReport) => void;
}

export interface SessionReport {
  summary: string;
  insights: string[];
  recommendations: string[];
} 