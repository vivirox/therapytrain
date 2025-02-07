// src/hooks/useChatAnalytics.ts
import { useChat } from 'ai/react';
import { useState, useEffect } from 'react';
import { supabase } from "@/../lib/supabaseClient";
export const useChatAnalytics = () => {
    const analyticsData = {
        sessions: [
            { id: '1', value: 85, label: 'Session Completion' }
        ],
        engagement: [
            { id: '1', value: 92, label: 'Response Rate' }
        ],
        satisfaction: [
            { id: '1', value: 88, label: 'Positive Feedback' }
        ]
    };
    return { analyticsData };
};
