import { NextResponse } from 'next/server';

export async function POST() {
  const response = NextResponse.json({ success: true, message: 'Logged out successfully' });
  response.cookies.set({
    name: 'finora_session',
    value: '',
    httpOnly: true,
    path: '/',
    maxAge: 0,
  });
  response.cookies.set({
    name: 'next-auth.session-token',
    value: '',
    httpOnly: true,
    path: '/',
    maxAge: 0,
  });
  return response;
}
