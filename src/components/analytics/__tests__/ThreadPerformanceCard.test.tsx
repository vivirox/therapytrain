import React from 'react';
import { render, screen } from '@testing-library/react';
import { ThreadPerformanceCard } from '../ThreadPerformanceCard';
import { ThreadPerformanceMetrics } from '@/types/analytics';

describe('ThreadPerformanceCard', () => {
    const mockPerformance: ThreadPerformanceMetrics = {
        threadId: 'test-thread',
        timestamp: new Date('2024-03-21T12:00:00Z'),
        loadTime: 850,
        messageLatency: 250,
        cacheHitRate: 0.75,
        errorRate: 0.02,
        resourceUsage: {
            cpu: 0.65,
            memory: 0.80,
            network: 0.45
        }
    };

    it('renders all performance metrics correctly', () => {
        render(<ThreadPerformanceCard performance={mockPerformance} />);

        // Check performance metrics
        expect(screen.getByText('850.00ms')).toBeInTheDocument();
        expect(screen.getByText('250.00ms')).toBeInTheDocument();
        expect(screen.getByText('75.0%')).toBeInTheDocument();
        expect(screen.getByText('2.00%')).toBeInTheDocument();

        // Check resource usage metrics
        expect(screen.getByText('65.0%')).toBeInTheDocument();
        expect(screen.getByText('80.0%')).toBeInTheDocument();
        expect(screen.getByText('45.0%')).toBeInTheDocument();
    });

    it('displays correct status colors based on thresholds', () => {
        const criticalPerformance: ThreadPerformanceMetrics = {
            ...mockPerformance,
            loadTime: 1500, // Error threshold
            messageLatency: 400, // Warning threshold
            cacheHitRate: 0.45, // Error threshold
            errorRate: 0.06, // Error threshold
            resourceUsage: {
                cpu: 0.95, // Error threshold
                memory: 0.85, // Warning threshold
                network: 0.30 // Normal
            }
        };

        render(<ThreadPerformanceCard performance={criticalPerformance} />);

        // Check for error and warning indicators
        const progressBars = screen.getAllByRole('progressbar');
        expect(progressBars[0]).toHaveClass('MuiLinearProgress-colorError'); // Load Time
        expect(progressBars[1]).toHaveClass('MuiLinearProgress-colorWarning'); // Message Latency
        expect(progressBars[2]).toHaveClass('MuiLinearProgress-colorError'); // Cache Hit Rate
        expect(progressBars[3]).toHaveClass('MuiLinearProgress-colorError'); // Error Rate
        expect(progressBars[4]).toHaveClass('MuiLinearProgress-colorError'); // CPU Usage
        expect(progressBars[5]).toHaveClass('MuiLinearProgress-colorWarning'); // Memory Usage
        expect(progressBars[6]).toHaveClass('MuiLinearProgress-colorSuccess'); // Network Usage
    });

    it('displays tooltips for each metric', () => {
        render(<ThreadPerformanceCard performance={mockPerformance} />);

        // Check tooltips
        expect(screen.getByLabelText('Time taken to load thread content')).toBeInTheDocument();
        expect(screen.getByLabelText('Average time to deliver messages')).toBeInTheDocument();
        expect(screen.getByLabelText('Percentage of successful cache hits')).toBeInTheDocument();
        expect(screen.getByLabelText('Percentage of failed operations')).toBeInTheDocument();
        expect(screen.getByLabelText('Current CPU utilization')).toBeInTheDocument();
        expect(screen.getByLabelText('Current memory utilization')).toBeInTheDocument();
        expect(screen.getByLabelText('Current network bandwidth utilization')).toBeInTheDocument();
    });

    it('applies custom className when provided', () => {
        const { container } = render(
            <ThreadPerformanceCard performance={mockPerformance} className="custom-class" />
        );
        expect(container.firstChild).toHaveClass('custom-class');
    });

    it('formats timestamp correctly', () => {
        render(<ThreadPerformanceCard performance={mockPerformance} />);
        expect(screen.getByText('11 months ago')).toBeInTheDocument();
    });
}); 