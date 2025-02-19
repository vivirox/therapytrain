import React from 'react';
import { render, screen } from '@testing-library/react';
import { ThreadMetricsCard } from '../ThreadMetricsCard';
import { ThreadMetrics } from '@/types/analytics';

describe('ThreadMetricsCard', () => {
    const mockMetrics: ThreadMetrics = {
        threadId: 'test-thread',
        createdAt: new Date('2024-03-21T10:00:00Z'),
        lastActivity: new Date('2024-03-21T12:00:00Z'),
        messageCount: 150,
        participantCount: 10,
        activeParticipants: 5,
        averageResponseTime: 2500,
        depth: 8,
        branchCount: 12,
        engagementScore: 85.5
    };

    it('renders all metrics correctly', () => {
        render(<ThreadMetricsCard metrics={mockMetrics} />);

        // Check if all metric values are displayed
        expect(screen.getByText('150')).toBeInTheDocument();
        expect(screen.getByText('10')).toBeInTheDocument();
        expect(screen.getByText('5')).toBeInTheDocument();
        expect(screen.getByText('2500.00ms')).toBeInTheDocument();
        expect(screen.getByText('8')).toBeInTheDocument();
        expect(screen.getByText('12')).toBeInTheDocument();
        expect(screen.getByText('85.5%')).toBeInTheDocument();
    });

    it('displays tooltips for each metric', () => {
        render(<ThreadMetricsCard metrics={mockMetrics} />);

        // Check if tooltips are present
        expect(screen.getByTitle('Total number of messages in the thread')).toBeInTheDocument();
        expect(screen.getByTitle('Total number of participants in the thread')).toBeInTheDocument();
        expect(screen.getByTitle('Number of participants active in the last 15 minutes')).toBeInTheDocument();
        expect(screen.getByTitle('Average time between messages')).toBeInTheDocument();
        expect(screen.getByTitle('Maximum depth of message replies')).toBeInTheDocument();
        expect(screen.getByTitle('Number of conversation branches')).toBeInTheDocument();
        expect(screen.getByTitle('Overall engagement score based on activity and participation')).toBeInTheDocument();
    });

    it('applies custom className when provided', () => {
        const { container } = render(
            <ThreadMetricsCard metrics={mockMetrics} className="custom-class" />
        );
        expect(container.firstChild).toHaveClass('custom-class');
    });

    it('formats last activity time correctly', () => {
        jest.useFakeTimers();
        jest.setSystemTime(new Date('2024-03-21T13:00:00Z'));

        render(<ThreadMetricsCard metrics={mockMetrics} />);
        expect(screen.getByText(/Last updated 1 hour ago/)).toBeInTheDocument();

        jest.useRealTimers();
    });
}); 