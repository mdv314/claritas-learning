import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { LoginInfo } from '@/types';

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_SUPABASE_SECRET_KEY!
);

export async function POST(req: Request) {
  try {
    const { email, password }: LoginInfo = await req.json();

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password required' }, { status: 400 });
    }

    // Supabase login
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });

    if (error || !data.session?.access_token) {
      return NextResponse.json({ error: error?.message || 'Invalid credentials' }, { status: 401 });
    }

    const token = data.session.access_token;
    const authID = data.user.id;

    // Set HttpOnly cookie
    const response = NextResponse.json({ success: true });
    response.cookies.set({
      name: 'access_token',
      value: token,
      httpOnly: true,
      path: '/',
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      maxAge: 600,
    });

    return response;
  } catch (err) {
    console.error('Error in /api/login:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
