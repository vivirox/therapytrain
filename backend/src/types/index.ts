// Database types
export type { Database } from './database.types';
export type { Tables } from './database.types';

// User types
export type {
    UserProfile,
    UserSession,
    UserCredentials,
    UserRegistration,
    UserUpdateRequest,
    UserSearchFilters
} from './user';

// Client types
export type {
    ClientProfile,
    ClientSession,
    ClientUpdateRequest,
    ClientSearchFilters,
    DbClient,
    DbIntervention
} from './client';

// Analytics types
export type {
    AnalyticsEvent,
    AnalyticsFilter,
    AnalyticsConfig,
    LearningAnalytics,
    SkillGrowth,
    AnalyticsData,
    MetricsData
} from '@/analytics';

// Service types
export type {
    ApiService,
    AIAnalyticsService,
    DataService,
    ServiceConfig,
    ServiceStatus,
    ServiceEvent
} from '@/services';

// UI Component types
export type {
    ComponentBaseProps,
    FormProps,
    SelectProps,
    ButtonProps,
    InputProps,
    TextareaProps,
    CalendarProps,
    CardProps,
    AlertProps,
    OTPProps,
    ProgressProps,
    SwitchProps,
    TooltipProps,
    BadgeProps,
    CheckboxProps,
    RadioProps
} from '@/ui/types';

// Session types
export type {
    SessionState,
    SessionMode,
    SessionMetrics,
    SessionConfig,
    SessionData,
    SessionStatus
} from '@/session';

// Education types
export type {
    Resource,
    Tutorial,
    CaseStudy,
    LearningPath,
    SkillLevel,
    Reply,
    PeerDiscussion,
    Member,
    MeetingSchedule,
    UpcomingSession,
    StudyGroup,
    NewDiscussion,
    PeerLearningProps
} from '@/education';

// Hub types
export type {
    HubConnection,
    HubMessage,
    HubEvent,
    HubConfig,
    HubService
} from '@/hub';

// Metrics types
export type {
    MetricDefinition,
    MetricValue,
    MetricRange,
    MetricReport,
    MetricConfig
} from '@/metrics';

// WebSocket types
export type {
    WebSocketMessage,
    WebSocketClient,
    WebSocketEvent,
    WebSocketServer
} from '@/websocket';

// Audit types
export type {
    AuditEvent,
    AuditLogFilters,
    AuditLogStats,
    AuditLogExport,
    AuditLogConfig,
    AuditLogService
} from './audit';

// Mock types
export type {
    MockUser,
    MockUserProfile,
    MockMessage,
    MockChatSession,
    MockAuditEvent,
    MockProofInput,
    MockProofOutput,
    MockDatabase
} from './mocks';

// HIPAA types
export type {
    HIPAAEventType,
    HIPAAActionType,
    HIPAAActor,
    HIPAAAction,
    HIPAAResource,
    HIPAAAuditEvent,
    HIPAAQueryFilters,
    HIPAAComplianceReport,
    HIPAAAlertConfig
} from './hipaa';

// Security types
export type {
    SecurityAlert,
    SecurityHeaders,
    SecurityAuditLog
} from './security';

// Re-export service implementations
export * from '@/services/websocket/SessionManager';
export * from '@/services/websocket/WebSocketServer';
export * from '@/services/interventionMetrics';
export * from '@/services/learningPath';
export * from '@/services/realTimeAnalytics';
export * from '@/services/sessionAnalytics'; 