import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { ThreadTrendsChart } from '../ThreadTrendsChart';
import { ThreadReport } from '@/types/analytics';

// Mock Recharts to avoid rendering issues in tests
jest.mock('recharts', () => ({
    ResponsiveContainer: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
    LineChart: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
    Line: () => null,
    XAxis: () => null,
    YAxis: () => null,
    CartesianGrid: () => null,
    Tooltip: () => null,
    Legend: () => null
}));

describe('ThreadTrendsChart', () => {
    const mockReport: ThreadReport = {
        threadId: 'test-thread',
        period: {
            start: new Date('2024-03-21T00:00:00Z'),
            end: new Date('2024-03-21T23:59:59Z')
        },
        metrics: {
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
        },
        performance: {
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
        },
        trends: {
            messageVolume: [10, 20, 15, 25, 30],
            participantActivity: [5, 8, 6, 9, 7],
            responseTimes: [2000, 1800, 2200, 1900, 2100],
            errors: [1, 0, 2, 1, 0]
        },
        insights: []
    };

    it('renders chart title and period', () => {
        render(<ThreadTrendsChart report={mockReport} />);
        
        expect(screen.getByText('Analytics Trends')).toBeInTheDocument();
        expect(screen.getByText(/March 21, 2024/)).toBeInTheDocument();
    });

    it('renders metric toggle buttons', () => {
        render(<ThreadTrendsChart report={mockReport} />);
        
        expect(screen.getByText('Message Volume')).toBeInTheDocument();
        expect(screen.getByText('Active Participants')).toBeInTheDocument();
        expect(screen.getByText('Response Time')).toBeInTheDocument();
        expect(screen.getByText('Errors')).toBeInTheDocument();
    });

    it('toggles metrics when buttons are clicked', () => {
        render(<ThreadTrendsChart report={mockReport} />);
        
        // Message Volume is selected by default
        const messageVolumeButton = screen.getByRole('button', { name: 'Message Volume' });
        const participantsButton = screen.getByRole('button', { name: 'Active Participants' });
        
        expect(messageVolumeButton).toHaveAttribute('aria-pressed', 'true');
        expect(participantsButton).toHaveAttribute('aria-pressed', 'false');
        
        // Click participants button
        fireEvent.click(participantsButton);
        
        expect(messageVolumeButton).toHaveAttribute('aria-pressed', 'true');
        expect(participantsButton).toHaveAttribute('aria-pressed', 'true');
    });

    it('prevents deselecting all metrics', () => {
        render(<ThreadTrendsChart report={mockReport} />);
        
        const messageVolumeButton = screen.getByRole('button', { name: 'Message Volume' });
        
        // Try to deselect the only selected metric
        fireEvent.click(messageVolumeButton);
        
        // Should still be selected
        expect(messageVolumeButton).toHaveAttribute('aria-pressed', 'true');
    });

    it('applies custom className when provided', () => {
        const { container } = render(
            <ThreadTrendsChart report={mockReport} className="custom-class" />
        );
        expect(container.firstChild).toHaveClass('custom-class');
    });

    it('renders chart with correct data series', () => {
        const { container } = render(<ThreadTrendsChart report={mockReport} />);
        
        // Check if Line components are rendered with correct data
        const chartContainer = container.querySelector('.recharts-wrapper');
        expect(chartContainer).toBeInTheDocument();
        
        // Since we mocked Recharts, we can't check the actual chart rendering
        // but we can verify the chart container exists and has the correct structure
        expect(container.querySelector('[role="button"][aria-pressed="true"]')).toHaveTextContent('Message Volume');
    });
}); 