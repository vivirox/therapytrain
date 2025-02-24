import { ThreadReport, ThreadMetrics, ThreadPerformanceMetrics } from '@/types/analytics';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import { Parser } from 'json2csv';

export class ThreadReportExporter {
    private static instance: ThreadReportExporter;

    private constructor() {}

    public static getInstance(): ThreadReportExporter {
        if (!ThreadReportExporter.instance) {
            ThreadReportExporter.instance = new ThreadReportExporter();
        }
        return ThreadReportExporter.instance;
    }

    public async exportToCsv(report: ThreadReport): Promise<string> {
        try {
            // Flatten the report data for CSV
            const flatData = this.flattenReportData(report);

            // Define fields for CSV
            const fields = [
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
            ];

            // Create parser
            const parser = new Parser({ fields });

            // Convert to CSV
            return parser.parse(flatData);
        } catch (error) {
            console.error('Error exporting to CSV:', error);
            throw error;
        }
    }

    public exportToJson(report: ThreadReport): string {
        try {
            return JSON.stringify(report, null, 2);
        } catch (error) {
            console.error('Error exporting to JSON:', error);
            throw error;
        }
    }

    public async exportToPdf(report: ThreadReport): Promise<Uint8Array> {
        try {
            const doc = new jsPDF();

            // Add title
            doc.setFontSize(16);
            doc.text('Thread Analytics Report', 14, 15);

            // Add thread info
            doc.setFontSize(12);
            doc.text(`Thread ID: ${report.threadId}`, 14, 25);
            doc.text(`Period: ${this.formatDate(report.period.start)} - ${this.formatDate(report.period.end)}`, 14, 32);

            // Add metrics table
            doc.autoTable({
                startY: 40,
                head: [['Metric', 'Value']],
                body: [
                    ['Message Count', report.metrics.messageCount.toString()],
                    ['Participant Count', report.metrics.participantCount.toString()],
                    ['Active Participants', report.metrics.activeParticipants.toString()],
                    ['Average Response Time', `${report.metrics.averageResponseTime.toFixed(2)}ms`],
                    ['Thread Depth', report.metrics.depth.toString()],
                    ['Branch Count', report.metrics.branchCount.toString()],
                    ['Engagement Score', `${report.metrics.engagementScore.toFixed(2)}%`]
                ]
            });

            // Add performance metrics
            doc.autoTable({
                startY: doc.lastAutoTable!.finalY + 10,
                head: [['Performance Metric', 'Value']],
                body: [
                    ['Load Time', `${report.performance.loadTime.toFixed(2)}ms`],
                    ['Message Latency', `${report.performance.messageLatency.toFixed(2)}ms`],
                    ['Cache Hit Rate', `${(report.performance.cacheHitRate * 100).toFixed(2)}%`],
                    ['Error Rate', `${(report.performance.errorRate * 100).toFixed(2)}%`],
                    ['CPU Usage', `${(report.performance.resourceUsage.cpu * 100).toFixed(2)}%`],
                    ['Memory Usage', `${(report.performance.resourceUsage.memory * 100).toFixed(2)}%`],
                    ['Network Usage', `${(report.performance.resourceUsage.network * 100).toFixed(2)}%`]
                ]
            });

            // Add insights
            if (report.insights.length > 0) {
                doc.setFontSize(14);
                doc.text('Insights', 14, doc.lastAutoTable!.finalY + 15);

                doc.setFontSize(10);
                let y = doc.lastAutoTable!.finalY + 25;
                report.insights.forEach(insight => {
                    const icon = insight.type === 'success' ? '✓' : insight.type === 'warning' ? '⚠' : 'ℹ';
                    doc.text(`${icon} ${insight.message}`, 14, y);
                    y += 7;
                });
            }

            // Add trends
            this.addTrendsChart(doc, report);

            return doc.output('arraybuffer');
        } catch (error) {
            console.error('Error exporting to PDF:', error);
            throw error;
        }
    }

    private flattenReportData(report: ThreadReport): Record<string, any> {
        return {
            threadId: report.threadId,
            periodStart: this.formatDate(report.period.start),
            periodEnd: this.formatDate(report.period.end),
            messageCount: report.metrics.messageCount,
            participantCount: report.metrics.participantCount,
            activeParticipants: report.metrics.activeParticipants,
            averageResponseTime: report.metrics.averageResponseTime,
            depth: report.metrics.depth,
            branchCount: report.metrics.branchCount,
            engagementScore: report.metrics.engagementScore,
            loadTime: report.performance.loadTime,
            messageLatency: report.performance.messageLatency,
            cacheHitRate: report.performance.cacheHitRate,
            errorRate: report.performance.errorRate,
            cpuUsage: report.performance.resourceUsage.cpu,
            memoryUsage: report.performance.resourceUsage.memory,
            networkUsage: report.performance.resourceUsage.network
        };
    }

    private formatDate(date: Date): string {
        return date.toLocaleString();
    }

    private addTrendsChart(doc: jsPDF, report: ThreadReport): void {
        // Add trends section
        doc.setFontSize(14);
        doc.text('Trends', 14, doc.internal.pageSize.height - 80);

        // Create a simple ASCII chart for trends
        const chartWidth = 160;
        const chartHeight = 40;
        const startY = doc.internal.pageSize.height - 70;

        // Draw chart axes
        doc.line(20, startY, 20, startY - chartHeight); // Y-axis
        doc.line(20, startY, 20 + chartWidth, startY); // X-axis

        // Plot message volume trend
        const messageVolume = report.trends.messageVolume;
        if (messageVolume.length > 1) {
            const maxVolume = Math.max(...messageVolume);
            const points = messageVolume.map((value, index) => ({
                x: 20 + (index * (chartWidth / (messageVolume.length - 1))),
                y: startY - ((value / maxVolume) * chartHeight)
            }));

            // Draw line graph
            doc.setDrawColor(0, 102, 204);
            doc.setLineWidth(0.5);
            for (let i = 1; i < points.length; i++) {
                doc.line(points[i-1].x, points[i-1].y, points[i].x, points[i].y);
            }
        }

        // Add legend
        doc.setFontSize(8);
        doc.text('Message Volume', 25, startY + 10);
    }
} 