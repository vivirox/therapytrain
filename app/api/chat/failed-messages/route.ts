import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { ChatService } from '@/services/chat/ChatService';
import { logger } from '@/lib/logger';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const threadId = searchParams.get('threadId');

    if (!threadId) {
      return NextResponse.json(
        { error: 'Thread ID is required' },
        { status: 400 }
      );
    }

    const supabase = createRouteHandlerClient({ cookies });
    
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

    // Get failed messages
    const { data: messages, error } = await supabase
      .from('failed_messages')
      .select('*')
      .eq('thread_id', threadId)
      .eq('status', 'failed')
      .order('created_at', { ascending: true });

    if (error) {
      throw error;
    }

    await logger.info('Retrieved failed messages', {
      userId: session.user.id,
      threadId,
      count: messages?.length ?? 0
    });

    return NextResponse.json({ messages: messages ?? [] });
  } catch (error) {
    await logger.error('Failed to get failed messages', {
      error: error instanceof Error ? error.message : 'Unknown error'
    });

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
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

    const supabase = createRouteHandlerClient({ cookies });
    
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

    const chatService = ChatService.getInstance(supabase);
    const recoveredCount = await chatService.recoverThreadMessages(threadId);

    await logger.info('Initiated message recovery', {
      userId: session.user.id,
      threadId,
      recoveredCount
    });

    return NextResponse.json({ recoveredCount });
  } catch (error) {
    await logger.error('Failed to recover messages', {
      error: error instanceof Error ? error.message : 'Unknown error'
    });

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 