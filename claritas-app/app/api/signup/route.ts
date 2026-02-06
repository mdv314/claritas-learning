// app/api/signup/route.ts
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { UserInformation } from '@/types'; // { name: string; email: string; password: string }

// Initialize Supabase client (server secret key!)
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_SUPABASE_SECRET_KEY! // server-only
);

export async function POST(req: Request) {
  try {
    const { name, email, password }: UserInformation = await req.json();

    if (!name || !email || !password) {
      return NextResponse.json(
        { error: 'Name, email, and password required' },
        { status: 400 }
      );
    }

    // 1️⃣ Sign up user (creates session automatically if allowed)
    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${process.env.NEXT_PUBLIC_BASE_URL}/welcome`, // optional
      },
    });

    if (signUpError) {
      // Handle already registered case
      if (signUpError.message.includes('already registered')) {
        return NextResponse.json({ error: 'Email already registered' }, { status: 409 });
      }
      return NextResponse.json({ error: signUpError.message }, { status: 400 });
    }

    // 2️⃣ Extract user ID from signUpData
    const userId = signUpData.user?.id;
    if (!userId) {
      return NextResponse.json({ error: 'Failed to create user' }, { status: 500 });
    }

    // 3️⃣ Insert profile info into 'users' table
    const { data: dbData, error: dbError } = await supabase
      .from('users')
      .insert({ auth_id: userId, name, email });

    if (dbError) {
      return NextResponse.json({ error: dbError.message }, { status: 500 });
    }

    // 4️⃣ Get JWT (from the session created at signUp)
    const token = signUpData.session?.access_token;
    if (!token) {
      // If no session returned, user may need email confirmation
      return NextResponse.json({
        message: 'User created. Please confirm your email to login.',
        data: dbData,
      });
    }

    // 5️⃣ Set HttpOnly cookie
    const response = NextResponse.json({
      message: 'User created successfully',
      data: dbData,
    });

    response.cookies.set({
      name: 'access_token',
      value: token,
      httpOnly: true,
      path: '/',
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      maxAge: 60 * 60 * 24, // 1 day
    });

    return response;
  } catch (err: any) {
    console.error('Error in /api/signup:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
