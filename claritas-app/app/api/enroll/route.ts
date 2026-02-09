import { NextResponse, NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_SUPABASE_SECRET_KEY!
);

const BACKEND_URL = process.env.BACKEND_URL || 'http://127.0.0.1:5000';

export async function POST(req: NextRequest) {
  try {
    const cookie = req.cookies.get('access_token')?.value;
    console.log('[enroll] cookie present:', !!cookie);
    if (!cookie) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { data, error } = await supabase.auth.getUser(cookie);
    console.log('[enroll] getUser error:', error);
    console.log('[enroll] user id:', data?.user?.id);
    if (error || !data.user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const body = await req.json();
    console.log('[enroll] request body:', body);
    console.log('[enroll] calling backend:', `${BACKEND_URL}/enroll`, {
      auth_id: data.user.id,
      course_id: body.course_id,
    });

    const response = await fetch(`${BACKEND_URL}/enroll`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        auth_id: data.user.id,
        course_id: body.course_id,
      }),
    });

    const resultText = await response.text();
    console.log('[enroll] backend status:', response.status);
    console.log('[enroll] backend response:', resultText);

    let result;
    try {
      result = JSON.parse(resultText);
    } catch {
      console.error('[enroll] backend returned non-JSON:', resultText);
      return NextResponse.json({ error: 'Backend returned invalid response', detail: resultText }, { status: 502 });
    }

    return NextResponse.json(result, { status: response.status });
  } catch (err) {
    console.error('[enroll] unhandled error:', err);
    return NextResponse.json({ error: 'Internal Server Error', detail: String(err) }, { status: 500 });
  }
}
