import React from 'react';
import { render, screen } from '@testing-library/react';
import { ThreadInsightsCard } from '../ThreadInsightsCard';
import { ThreadReport } from '@/types/analytics';

describe('ThreadInsightsCard', () => {
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
        insights: [
            {
                type: 'success',
                message: 'Message volume has increased by 15.5%',
                metric: 'message_volume',
                change: 0.155
            },
            {
                type: 'warning',
                message: 'Response time has increased by 12.3%',
                metric: 'response_times',
                change: 0.123
            },
            {
                type: 'info',
                message: 'Participant activity remains stable'
            }
        ]
    };

    it('renders insights card title and count', () => {
        render(<ThreadInsightsCard report={mockReport} />);
        
        expect(screen.getByText('Analytics Insights')).toBeInTheDocument();
        expect(screen.getByText('3 insights found')).toBeInTheDocument();
    });

    it('renders all insights with correct icons and messages', () => {
        render(<ThreadInsightsCard report={mockReport} />);
        
        // Check success insight
        const successInsight = screen.getByText('Message volume has increased by 15.5%');
        expect(successInsight).toBeInTheDocument();
        expect(successInsight.closest('li')).toContainElement(screen.getByTestId('CheckCircleIcon'));
        
        // Check warning insight
        const warningInsight = screen.getByText('Response time has increased by 12.3%');
        expect(warningInsight).toBeInTheDocument();
        expect(warningInsight.closest('li')).toContainElement(screen.getByTestId('WarningIcon'));
        
        // Check info insight
        const infoInsight = screen.getByText('Participant activity remains stable');
        expect(infoInsight).toBeInTheDocument();
        expect(infoInsight.closest('li')).toContainElement(screen.getByTestId('InfoIcon'));
    });

    it('displays change percentages with correct formatting', () => {
        render(<ThreadInsightsCard report={mockReport} />);
        
        expect(screen.getByText('15.5%')).toBeInTheDocument();
        expect(screen.getByText('12.3%')).toBeInTheDocument();
    });

    it('displays metric names when provided', () => {
        render(<ThreadInsightsCard report={mockReport} />);
        
        expect(screen.getByText('Metric: message_volume')).toBeInTheDocument();
        expect(screen.getByText('Metric: response_times')).toBeInTheDocument();
    });

    it('handles empty insights array', () => {
        const emptyReport = {
            ...mockReport,
            insights: []
        };
        
        render(<ThreadInsightsCard report={emptyReport} />);
        
        expect(screen.getByText('No significant insights found in this period.')).toBeInTheDocument();
        expect(screen.getByText('0 insights found')).toBeInTheDocument();
    });

    it('applies custom className when provided', () => {
        const { container } = render(
            <ThreadInsightsCard report={mockReport} className="custom-class" />
        );
        expect(container.firstChild).toHaveClass('custom-class');
    });

    it('renders insights in correct order', () => {
        render(<ThreadInsightsCard report={mockReport} />);
        
        const listItems = screen.getAllByRole('listitem');
        expect(listItems).toHaveLength(3);
        
        expect(listItems[0]).toHaveTextContent('Message volume has increased by 15.5%');
        expect(listItems[1]).toHaveTextContent('Response time has increased by 12.3%');
        expect(listItems[2]).toHaveTextContent('Participant activity remains stable');
    });
}); 