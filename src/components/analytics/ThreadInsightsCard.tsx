import React from 'react';
import { ThreadReport } from '@/types/analytics';
import {
    Card,
    CardContent,
    CardHeader,
    List,
    ListItem,
    ListItemIcon,
    ListItemText,
    Typography,
    Chip
} from '@mui/material';
import {
    TrendingUp as TrendingUpIcon,
    TrendingDown as TrendingDownIcon,
    CheckCircle as SuccessIcon,
    Warning as WarningIcon,
    Info as InfoIcon
} from '@mui/icons-material';

interface ThreadInsightsCardProps {
    report: ThreadReport;
    className?: string;
}

export const ThreadInsightsCard: React.FC<ThreadInsightsCardProps> = ({ report, className }) => {
    const getInsightIcon = (type: string) => {
        switch (type) {
            case 'success':
                return <SuccessIcon color="success" />;
            case 'warning':
                return <WarningIcon color="warning" />;
            default:
                return <InfoIcon color="info" />;
        }
    };

    const getTrendIcon = (change: number | undefined) => {
        if (!change) return null;
        return change > 0 ? (
            <TrendingUpIcon color="success" fontSize="small" />
        ) : (
            <TrendingDownIcon color="error" fontSize="small" />
        );
    };

    const formatChange = (change: number | undefined) => {
        if (!change) return '';
        const value = Math.abs(change * 100);
        return `${value.toFixed(1)}%`;
    };

    return (
        <Card className={className}>
            <CardHeader
                title="Analytics Insights"
                subheader={`${report.insights.length} insights found`}
            />
            <CardContent>
                {report.insights.length === 0 ? (
                    <Typography color="textSecondary">
                        No significant insights found in this period.
                    </Typography>
                ) : (
                    <List>
                        {report.insights.map((insight, index) => (
                            <ListItem
                                key={index}
                                alignItems="flex-start"
                                sx={{
                                    borderBottom:
                                        index < report.insights.length - 1
                                            ? '1px solid rgba(0, 0, 0, 0.12)'
                                            : 'none'
                                }}
                            >
                                <ListItemIcon>{getInsightIcon(insight.type)}</ListItemIcon>
                                <ListItemText
                                    primary={
                                        <Typography
                                            component="div"
                                            variant="body1"
                                            sx={{ display: 'flex', alignItems: 'center', gap: 1 }}
                                        >
                                            {insight.message}
                                            {insight.change && (
                                                <Chip
                                                    icon={getTrendIcon(insight.change)}
                                                    label={formatChange(insight.change)}
                                                    size="small"
                                                    color={insight.change > 0 ? 'success' : 'error'}
                                                    variant="outlined"
                                                />
                                            )}
                                        </Typography>
                                    }
                                    secondary={
                                        insight.metric && (
                                            <Typography
                                                component="span"
                                                variant="body2"
                                                color="textSecondary"
                                            >
                                                Metric: {insight.metric}
                                            </Typography>
                                        )
                                    }
                                />
                            </ListItem>
                        ))}
                    </List>
                )}
            </CardContent>
        </Card>
    );
}; 