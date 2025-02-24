import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ThreadAnalyticsDashboard } from '../ThreadAnalyticsDashboard';
import { useThreadAnalytics } from '@/hooks/useThreadAnalytics';
import { ThreadMetrics, ThreadPerformanceMetrics, ThreadReport } from '@/types/analytics';

// Mock the useThreadAnalytics hook
jest.mock('@/hooks/useThreadAnalytics');

// Mock the child components
jest.mock('../ThreadMetricsCard', () => ({
    ThreadMetricsCard: () => <div data-testid="metrics-card">Metrics Card</div>
}));

jest.mock('../ThreadPerformanceCard', () => ({
    ThreadPerformanceCard: () => <div data-testid="performance-card">Performance Card</div>
}));

jest.mock('../ThreadTrendsChart', () => ({
    ThreadTrendsChart: () => <div data-testid="trends-chart">Trends Chart</div>
}));

jest.mock('../ThreadInsightsCard', () => ({
    ThreadInsightsCard: () => <div data-testid="insights-card">Insights Card</div>
}));

describe('ThreadAnalyticsDashboard', () => {
    const mockMetrics: ThreadMetrics = {
        threadId: 'test-thread',
        createdAt: new Date('2024-03-21T00:00:00Z'),
        lastActivity: new Date('2024-03-21T23:59:59Z'),
        messageCount: 150,
        participantCount: 10,
        activeParticipants: 5,
        averageResponseTime: 2500,
        depth: 8,
        branchCount: 12,
        engagementScore: 85.5
    };

    const mockPerformance: ThreadPerformanceMetrics = {
        threadId: 'test-thread',
        loadTime: 850,
        messageLatency: 250,
        cacheHitRate: 0.75,
        errorRate: 0.02,
        resourceUsage: {
            cpu: 0.65,
            memory: 0.80,
            network: 0.45
        },
        timestamp: new Date('2024-03-21T23:59:59Z')
    };

    const mockReport: ThreadReport = {
        threadId: 'test-thread',
        period: {
            start: new Date('2024-03-21T00:00:00Z'),
            end: new Date('2024-03-21T23:59:59Z')
        },
        metrics: mockMetrics,
        performance: mockPerformance,
        trends: {
            messageVolume: [10, 20, 15, 25, 30],
            participantActivity: [5, 8, 6, 9, 7],
            responseTimes: [2000, 1800, 2200, 1900, 2100],
            errors: [1, 0, 2, 1, 0]
        },
        insights: []
    };

    beforeEach(() => {
        // Reset all mocks before each test
        jest.clearAllMocks();
        
        // Mock the default hook implementation
        (useThreadAnalytics as jest.Mock).mockReturnValue({
            metrics: mockMetrics,
            performance: mockPerformance,
            report: mockReport,
            loading: false,
            error: null,
            exportReport: jest.fn(),
            exportStatus: { exporting: false, error: null },
            refreshMetrics: jest.fn(),
            refreshPerformance: jest.fn(),
            refreshReport: jest.fn()
        });
    });

    it('renders loading spinner when loading', () => {
        (useThreadAnalytics as jest.Mock).mockReturnValue({
            loading: true,
            error: null
        });

        render(<ThreadAnalyticsDashboard threadId="test-thread" />);
        expect(screen.getByRole('progressbar')).toBeInTheDocument();
    });

    it('renders error message with retry button when error occurs', () => {
        const mockRefresh = jest.fn();
        (useThreadAnalytics as jest.Mock).mockReturnValue({
            loading: false,
            error: new Error('Test error'),
            refreshMetrics: mockRefresh,
            refreshPerformance: mockRefresh,
            refreshReport: mockRefresh
        });

        render(<ThreadAnalyticsDashboard threadId="test-thread" />);
        
        expect(screen.getByText(/Error loading analytics: Test error/)).toBeInTheDocument();
        
        const retryButton = screen.getByText('Retry');
        fireEvent.click(retryButton);
        
        expect(mockRefresh).toHaveBeenCalledTimes(3);
    });

    it('renders all analytics components when data is available', () => {
        render(<ThreadAnalyticsDashboard threadId="test-thread" />);
        
        expect(screen.getByTestId('metrics-card')).toBeInTheDocument();
        expect(screen.getByTestId('performance-card')).toBeInTheDocument();
        expect(screen.getByTestId('trends-chart')).toBeInTheDocument();
        expect(screen.getByTestId('insights-card')).toBeInTheDocument();
    });

    it('handles export functionality for different formats', async () => {
        const mockExportReport = jest.fn().mockImplementation((format) => {
            return format === 'json' ? '{"data": "test"}' : new Uint8Array([1, 2, 3]);
        });

        (useThreadAnalytics as jest.Mock).mockReturnValue({
            metrics: mockMetrics,
            performance: mockPerformance,
            report: mockReport,
            loading: false,
            error: null,
            exportReport: mockExportReport,
            exportStatus: { exporting: false, error: null }
        });

        // Mock URL.createObjectURL and URL.revokeObjectURL
        const mockCreateObjectURL = jest.fn();
        const mockRevokeObjectURL = jest.fn();
        global.URL.createObjectURL = mockCreateObjectURL;
        global.URL.revokeObjectURL = mockRevokeObjectURL;

        render(<ThreadAnalyticsDashboard threadId="test-thread" />);

        // Test PDF export
        fireEvent.click(screen.getByText('Export PDF'));
        await waitFor(() => {
            expect(mockExportReport).toHaveBeenCalledWith('pdf');
        });

        // Test CSV export
        fireEvent.click(screen.getByText('Export CSV'));
        await waitFor(() => {
            expect(mockExportReport).toHaveBeenCalledWith('csv');
        });

        // Test JSON export
        fireEvent.click(screen.getByText('Export JSON'));
        await waitFor(() => {
            expect(mockExportReport).toHaveBeenCalledWith('json');
        });

        // Clean up
        global.URL.createObjectURL = undefined;
        global.URL.revokeObjectURL = undefined;
    });

    it('disables export buttons while exporting', () => {
        (useThreadAnalytics as jest.Mock).mockReturnValue({
            metrics: mockMetrics,
            performance: mockPerformance,
            report: mockReport,
            loading: false,
            error: null,
            exportReport: jest.fn(),
            exportStatus: { exporting: true, error: null }
        });

        render(<ThreadAnalyticsDashboard threadId="test-thread" />);
        
        expect(screen.getByText('Export PDF')).toBeDisabled();
        expect(screen.getByText('Export CSV')).toBeDisabled();
        expect(screen.getByText('Export JSON')).toBeDisabled();
    });

    it('applies custom className when provided', () => {
        const { container } = render(
            <ThreadAnalyticsDashboard threadId="test-thread" className="custom-class" />
        );
        expect(container.firstChild).toHaveClass('custom-class');
    });
}); 