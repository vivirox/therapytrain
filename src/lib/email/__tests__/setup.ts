import { supabase } from '@/lib/supabaseclient';

// Configure test timeouts
jest.setTimeout(30000); // 30 seconds

// Configure test environment
process.env.NEXT_PUBLIC_APP_URL = 'http://localhost:3000';
process.env.SUPABASE_URL = 'http://localhost:54321';
process.env.SUPABASE_ANON_KEY = 'test-anon-key';

// Helper function to clean up test data
export async function cleanupTestData(pattern: string) {
  await Promise.all([
    supabase.from('email_events').delete().like('email_id', `${pattern}%`),
    supabase.from('alerts').delete().like('sender', `${pattern}%`),
  ]);
}

// Helper function to wait for database operations
export async function waitForDbOperation(ms = 1000) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Helper function to create test events
export async function createTestEvents(
  emailId: string,
  recipient: string,
  events: Array<{ type: string; count: number }>
) {
  for (const event of events) {
    for (let i = 0; i < event.count; i++) {
      await supabase.from('email_events').insert([
        {
          email_id: `${emailId}-${event.type}-${i}`,
          type: event.type,
          recipient,
          created_at: new Date().toISOString(),
        },
      ]);
    }
  }
}

// Helper function to verify metrics
export async function verifyMetrics(expectedMetrics: Record<string, number>) {
  const { data: metrics } = await supabase
    .from('email_metrics')
    .select('*')
    .single();

  expect(metrics).toBeTruthy();
  Object.entries(expectedMetrics).forEach(([key, value]) => {
    expect(metrics[key]).toBe(value);
  });
}

// Helper function to verify alert creation
export async function verifyAlert(
  sender: string,
  type: string,
  severity: string
) {
  const { data: alerts } = await supabase
    .from('alerts')
    .select('*')
    .match({ sender, type })
    .is('resolved_at', null);

  expect(alerts).toBeTruthy();
  expect(alerts.length).toBeGreaterThan(0);
  expect(alerts[0].severity).toBe(severity);
  return alerts[0];
} 