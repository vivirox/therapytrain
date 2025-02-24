import { ThreadReportExporter } from '../ThreadReportExporter';
import { ThreadReport, ThreadMetrics, ThreadPerformanceMetrics } from '@/types/analytics';
import { jsPDF } from 'jspdf';
import { Parser } from 'json2csv';

// Mock dependencies
jest.mock('jspdf', () => ({
    jsPDF: jest.fn().mockImplementation(() => ({
        setFontSize: jest.fn(),
        text: jest.fn(),
        autoTable: jest.fn(),
        line: jest.fn(),
        setDrawColor: jest.fn(),
        setLineWidth: jest.fn(),
        internal: {
            pageSize: {
                height: 842,
                width: 595
            }
        },
        output: jest.fn().mockReturnValue(new Uint8Array([1, 2, 3]))
    }))
}));

jest.mock('json2csv', () => ({
    Parser: jest.fn().mockImplementation(() => ({
        parse: jest.fn().mockReturnValue('csv data')
    }))
}));

describe('ThreadReportExporter', () => {
    let exporter: ThreadReportExporter;
    
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
        insights: [
            {
                type: 'success',
                message: 'Message volume has increased by 15.5%',
                metric: 'message_volume',
                change: 0.155
            }
        ]
    };

    beforeEach(() => {
        jest.clearAllMocks();
        // Reset singleton instance
        (ThreadReportExporter as any).instance = null;
        exporter = ThreadReportExporter.getInstance();
    });

    describe('exportToCsv', () => {
        it('exports report to CSV format correctly', async () => {
            const result = await exporter.exportToCsv(mockReport);
            
            expect(Parser).toHaveBeenCalledWith({
                fields: expect.arrayContaining([
                    'threadId',
                    'periodStart',
                    'periodEnd',
                    'messageCount',
                    'participantCount',
                    'activeParticipants',
                    'averageResponseTime',
                    'depth',
                    'branchCount',
                    'engagementScore',
                    'loadTime',
                    'messageLatency',
                    'cacheHitRate',
                    'errorRate',
                    'cpuUsage',
                    'memoryUsage',
                    'networkUsage'
                ])
            });
            
            expect(result).toBe('csv data');
        });

        it('handles CSV export errors', async () => {
            (Parser as jest.Mock).mockImplementation(() => ({
                parse: jest.fn().mockImplementation(() => {
                    throw new Error('CSV parsing failed');
                })
            }));

            await expect(exporter.exportToCsv(mockReport))
                .rejects.toThrow('CSV parsing failed');
        });
    });

    describe('exportToJson', () => {
        it('exports report to JSON format correctly', () => {
            const result = exporter.exportToJson(mockReport);
            expect(JSON.parse(result)).toEqual(mockReport);
        });

        it('handles JSON export errors', () => {
            const circularReport = { ...mockReport };
            (circularReport as any).circular = circularReport;

            expect(() => exporter.exportToJson(circularReport as ThreadReport))
                .toThrow();
        });
    });

    describe('exportToPdf', () => {
        it('exports report to PDF format correctly', async () => {
            const result = await exporter.exportToPdf(mockReport);
            
            expect(jsPDF).toHaveBeenCalled();
            expect(result).toEqual(new Uint8Array([1, 2, 3]));
        });

        it('includes all sections in PDF', async () => {
            await exporter.exportToPdf(mockReport);
            
            const mockPdf = (jsPDF as jest.Mock).mock.results[0].value;
            
            // Check title
            expect(mockPdf.text).toHaveBeenCalledWith('Thread Analytics Report', 14, 15);
            
            // Check thread info
            expect(mockPdf.text).toHaveBeenCalledWith(`Thread ID: ${mockReport.threadId}`, 14, 25);
            
            // Check metrics table
            expect(mockPdf.autoTable).toHaveBeenCalledWith(expect.objectContaining({
                head: [['Metric', 'Value']],
                body: expect.arrayContaining([
                    ['Message Count', '150'],
                    ['Participant Count', '10'],
                    ['Active Participants', '5']
                ])
            }));
            
            // Check performance metrics
            expect(mockPdf.autoTable).toHaveBeenCalledWith(expect.objectContaining({
                head: [['Performance Metric', 'Value']],
                body: expect.arrayContaining([
                    ['Load Time', '850.00ms'],
                    ['Message Latency', '250.00ms'],
                    ['Cache Hit Rate', '75.00%']
                ])
            }));
        });

        it('handles PDF export errors', async () => {
            (jsPDF as jest.Mock).mockImplementation(() => ({
                setFontSize: jest.fn(),
                text: jest.fn().mockImplementation(() => {
                    throw new Error('PDF generation failed');
                })
            }));

            await expect(exporter.exportToPdf(mockReport))
                .rejects.toThrow('PDF generation failed');
        });
    });

    describe('singleton pattern', () => {
        it('returns the same instance on multiple calls', () => {
            const instance1 = ThreadReportExporter.getInstance();
            const instance2 = ThreadReportExporter.getInstance();
            expect(instance1).toBe(instance2);
        });
    });

    describe('date formatting', () => {
        it('formats dates correctly', () => {
            const date = new Date('2024-03-21T12:34:56Z');
            const formatted = (exporter as any).formatDate(date);
            expect(formatted).toMatch(/3\/21\/2024/);
        });
    });

    describe('data flattening', () => {
        it('flattens report data correctly', () => {
            const flattened = (exporter as any).flattenReportData(mockReport);
            
            expect(flattened).toEqual({
                threadId: 'test-thread',
                periodStart: expect.any(String),
                periodEnd: expect.any(String),
                messageCount: 150,
                participantCount: 10,
                activeParticipants: 5,
                averageResponseTime: 2500,
                depth: 8,
                branchCount: 12,
                engagementScore: 85.5,
                loadTime: 850,
                messageLatency: 250,
                cacheHitRate: 0.75,
                errorRate: 0.02,
                cpuUsage: 0.65,
                memoryUsage: 0.80,
                networkUsage: 0.45
            });
        });
    });
}); 