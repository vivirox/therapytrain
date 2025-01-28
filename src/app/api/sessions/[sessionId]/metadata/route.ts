import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function PATCH(
  request: Request,
  { params }: { params: { sessionId: string } }
) {
  const supabase = createRouteHandlerClient({ cookies });
  const { metadata } = await request.json();

  const { data, error } = await supabase
    .from('therapy_sessions')
    .update({ session_metadata: metadata })
    .eq('id', params.sessionId)
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json(data);
}
