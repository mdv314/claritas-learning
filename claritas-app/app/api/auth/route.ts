import { NextResponse, NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_SUPABASE_SECRET_KEY!
);

export async function GET(req: NextRequest) {
  // Read cookie directly from request headers
  const cookie = req.cookies.get('access_token')?.value;

  if (!cookie) {
    return NextResponse.json({ authenticated: false });
  }

  const { data, error } = await supabase.auth.getUser(cookie);

  if (error || !data.user) {
    return NextResponse.json({ authenticated: false });
  }

  return NextResponse.json({ authenticated: true, user_id: data.user.id });
}
