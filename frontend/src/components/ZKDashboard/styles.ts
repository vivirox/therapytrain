import { SxProps, Theme } from '@mui/material';

export const styles = {
    root: {
        height: '100%',
        overflow: 'auto',
        backgroundColor: (theme: Theme) =>
            theme.palette.mode === 'dark'
                ? theme.palette.background.default
                : theme.palette.grey[100]
    },
    card: {
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: (theme: Theme) => theme.shadows[2]
    },
    cardHeader: {
        borderBottom: (theme: Theme) => `1px solid ${theme.palette.divider}`
    },
    cardContent: {
        flex: 1,
        display: 'flex',
        flexDirection: 'column'
    },
    chartContainer: {
        flex: 1,
        minHeight: 300
    },
    statCard: {
        textAlign: 'center',
        '& .MuiTypography-h4': {
            marginTop: 2
        }
    },
    alert: {
        marginBottom: 2
    }
} satisfies Record<string, SxProps<Theme>>;
