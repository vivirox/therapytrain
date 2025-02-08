import { ReactNode } from 'react';
import { ClientProfile, ClientSession, Message, Intervention } from '@/clientprofile';
import { User } from '@supabase/supabase-js';

export interface AuthProviderProps {
    children: ReactNode;
}

export interface PeerLearningProps {
    userId: string;
    className?: string;
}

export interface InterventionTrackerProps {
    clientId: string;
    sessionId: string;
    onInterventionUpdate?: (intervention: Intervention) => void;
}

export interface PeerReviewProps {
    sessionId: string;
    clientProfile: ClientProfile;
    messages: Message[];
    onFeedbackSubmit?: (feedback: string) => void;
}

export interface SessionAnalysisProps {
    sessionId: string;
    clientProfile: ClientProfile;
    messages: Message[];
    interventions: Intervention[];
    metrics: {
        engagement: number;
        effectiveness: number;
        progress: number;
    };
}

export interface ClientProfileCardProps {
    profile: ClientProfile;
    onSelect?: (profile: ClientProfile) => void;
    selected?: boolean;
}

export interface SessionTimelineProps {
    session: ClientSession;
    onInterventionClick?: (intervention: Intervention) => void;
}

export interface EmotionalStateTrackerProps {
    clientId: string;
    sessionId: string;
    onStateUpdate?: (state: { emotion: string; intensity: number }) => void;
}

export interface GoalProgressTrackerProps {
    clientId: string;
    goals: string[];
    progress: Record<string, number>;
    onProgressUpdate?: (goalId: string, progress: number) => void;
}

export interface TherapyNoteProps {
    sessionId: string;
    clientProfile: ClientProfile;
    onSave?: (note: string) => void;
    defaultValue?: string;
}

export interface RiskAssessmentProps {
    clientProfile: ClientProfile;
    onRiskLevelChange?: (level: 'low' | 'medium' | 'high') => void;
}

export interface SafetyPlanProps {
    clientId: string;
    onUpdate?: (plan: {
        triggers: string[];
        copingStrategies: string[];
        supportContacts: string[];
        resources: string[];
    }) => void;
}

export interface CrisisResponseProps {
    clientProfile: ClientProfile;
    onAction?: (action: string) => void;
    severity: 'low' | 'medium' | 'high';
}

export interface SupervisionRequestProps {
    sessionId: string;
    clientProfile: ClientProfile;
    concern: string;
    onSubmit?: (request: {
        sessionId: string;
        concern: string;
        urgency: 'low' | 'medium' | 'high';
    }) => void;
}

export interface ResourceLibraryProps {
    category?: string;
    onResourceSelect?: (resource: {
        id: string;
        title: string;
        type: string;
        url: string;
    }) => void;
}

export interface ChatInterfaceProps {
    sessionId: string;
    clientProfile: ClientProfile;
    messages: Message[];
    onSendMessage?: (message: string) => void;
    onTyping?: (isTyping: boolean) => void;
}

export interface VideoCallProps {
    sessionId: string;
    participantId: string;
    onCallEnd?: () => void;
    quality?: 'low' | 'medium' | 'high';
}

export interface WhiteboardProps {
    sessionId: string;
    onDraw?: (data: any) => void;
    onClear?: () => void;
    readOnly?: boolean;
}

export interface FeedbackFormProps {
    sessionId: string;
    onSubmit?: (feedback: {
        rating: number;
        comments: string;
        areas: string[];
    }) => void;
}

export interface ProgressReportProps {
    clientId: string;
    startDate: string;
    endDate: string;
    metrics: {
        sessionsCompleted: number;
        goalsAchieved: number;
        overallProgress: number;
    };
}

export interface ConsentFormProps {
    clientId: string;
    formType: 'treatment' | 'assessment' | 'research';
    onSign?: (signed: boolean) => void;
}

export interface AppointmentSchedulerProps {
    therapistId: string;
    clientId: string;
    onSchedule?: (appointment: {
        date: string;
        time: string;
        duration: number;
    }) => void;
}

export interface BillingInterfaceProps {
    clientId: string;
    sessionId: string;
    amount: number;
    onPayment?: (transaction: {
        amount: number;
        method: string;
        status: string;
    }) => void;
}

export interface InsuranceVerificationProps {
    clientId: string;
    insuranceInfo: {
        provider: string;
        policyNumber: string;
        groupNumber?: string;
    };
    onVerify?: (status: 'verified' | 'pending' | 'failed') => void;
}

export interface ComplianceCheckerProps {
    sessionId: string;
    documentType: string;
    content: string;
    onValidate?: (isCompliant: boolean) => void;
}

export interface AuditLogViewerProps {
    startDate: string;
    endDate: string;
    filters?: {
        eventType?: string[];
        userId?: string;
        severity?: string;
    };
}

export interface EncryptionKeyManagerProps {
    userId: string;
    onKeyRotation?: () => void;
    onBackup?: () => void;
}

export interface DataRetentionControlsProps {
    dataType: string;
    retentionPeriod: number;
    onPeriodChange?: (period: number) => void;
}

export interface AccessControlPanelProps {
    userId: string;
    role: string;
    permissions: string[];
    onPermissionChange?: (permission: string, granted: boolean) => void;
}

export interface TwoFactorAuthProps {
    userId: string;
    method: 'sms' | 'email' | 'authenticator';
    onSetup?: (success: boolean) => void;
}

export interface BackupRestoreProps {
    userId: string;
    lastBackup?: string;
    onBackup?: () => void;
    onRestore?: (date: string) => void;
}

export interface EmergencyContactProps {
    clientId: string;
    contacts: Array<{
        name: string;
        relationship: string;
        phone: string;
    }>;
    onUpdate?: (contacts: any[]) => void;
}

export interface CrisisAlertProps {
    severity: 'low' | 'medium' | 'high';
    message: string;
    actions: string[];
    onAction?: (action: string) => void;
}

export interface SupervisionNoteProps {
    sessionId: string;
    supervisorId: string;
    notes: string;
    onSave?: (notes: string) => void;
}

export interface QualityMetricsProps {
    metrics: {
        clientSatisfaction: number;
        outcomeEffectiveness: number;
        documentationCompliance: number;
        responseTime: number;
    };
    period: 'day' | 'week' | 'month' | 'year';
}

export interface SystemHealthProps {
    metrics: {
        uptime: number;
        responseTime: number;
        errorRate: number;
        activeUsers: number;
    };
    onAlert?: (alert: { type: string; message: string }) => void;
}

export interface Database {
    public: { Tables: { [key: string]: any } };
}
 