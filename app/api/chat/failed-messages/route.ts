import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { ChatService } from '@/services/chat/ChatService';
import { logger } from '@/lib/logger';

export async function GET() {
  const cookieStore = cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options: any) {
          cookieStore.set(name, value, options);
        },
        remove(name: string, options: any) {
          cookieStore.set(name, '', options);
        },
      },
    }
  );

  try {
    const { data: messages, error } = await supabase
      .from('failed_messages')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;

    return NextResponse.json({ messages });
  } catch (error) {
    console.error('Error fetching failed messages:', error);
    return NextResponse.json({ error: 'Failed to fetch messages' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const threadId = searchParams.get('threadId');

    if (!threadId) {
      return NextResponse.json(
        { error: 'Thread ID is required' },
        { status: 400 }
      );
    }

    const cookieStore = cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value;
          },
          set(name: string, value: string, options: any) {
            cookieStore.set(name, value, options);
          },
          remove(name: string, options: any) {
            cookieStore.set(name, '', options);
          },
        },
      }
    );
    
    // Check authentication
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Create chat service instance
    const chatService = new ChatService();
    // Set the chat service's supabase client
    chatService.setSupabaseClient(supabase);
    const recoveredCount = await chatService.recoverThreadMessages(threadId);

    await logger.info('Initiated message recovery', {
      userId: session.user.id,
      threadId,
      recoveredCount
    });

    return NextResponse.json({ recoveredCount });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    await logger.error('Failed to recover messages', {
      errorMessage
    });

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 