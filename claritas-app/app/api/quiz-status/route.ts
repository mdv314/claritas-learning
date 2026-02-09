import { NextResponse, NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_SUPABASE_SECRET_KEY!
);

const BACKEND_URL = process.env.BACKEND_URL || 'http://127.0.0.1:5000';

export async function GET(req: NextRequest) {
  try {
    const cookie = req.cookies.get('access_token')?.value;
    if (!cookie) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { data, error } = await supabase.auth.getUser(cookie);
    if (error || !data.user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const courseId = searchParams.get('courseId');

    if (!courseId) {
      return NextResponse.json({ error: 'Missing courseId' }, { status: 400 });
    }

    const response = await fetch(
      `${BACKEND_URL}/module_quiz_status/${courseId}?auth_id=${data.user.id}`,
      { method: 'GET' }
    );

    const result = await response.json();
    return NextResponse.json(result, { status: response.status });
  } catch (err) {
    console.error('Error in /api/quiz-status:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
