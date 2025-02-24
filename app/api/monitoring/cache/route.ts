import { NextRequest, NextResponse } from 'next/server';
import { getCacheAnalytics } from '@/lib/redis';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  {
    auth: {
      persistSession: false,
      detectSessionInUrl: false,
    },
  }
);

export async function GET(req: NextRequest) {
  try {
    // Check authentication
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    // Check if user has admin role
    const { data: userRole } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', session.user.id)
      .single();

    if (!userRole || userRole.role !== 'admin') {
      return new NextResponse('Forbidden', { status: 403 });
    }

    // Get cache analytics
    const analytics = await getCacheAnalytics();

    return NextResponse.json(analytics);
  } catch (error) {
    console.error('Cache monitoring error:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}

// Allow admins to clear alerts
export async function POST(req: NextRequest) {
  try {
    // Check authentication
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    // Check if user has admin role
    const { data: userRole } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', session.user.id)
      .single();

    if (!userRole || userRole.role !== 'admin') {
      return new NextResponse('Forbidden', { status: 403 });
    }

    const { action } = await req.json();

    if (action === 'clearAlerts') {
      const monitor = CacheMonitoringService.getInstance();
      monitor.clearAlerts();
      return new NextResponse('Alerts cleared');
    }

    return new NextResponse('Invalid action', { status: 400 });
  } catch (error) {
    console.error('Cache monitoring error:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
} 