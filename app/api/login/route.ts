import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { authenticateStudent } from '@/lib/db';

export async function POST(request: NextRequest) {
  const payload = await request.json();
  const { email, password } = payload ?? {};

  if (!email || !password) {
    return NextResponse.json({ error: 'Email and password are required.' }, { status: 400 });
  }

  const student = await authenticateStudent(email, password);

  if (!student) {
    return NextResponse.json({ error: 'Invalid credentials. Please try again.' }, { status: 401 });
  }

  return NextResponse.json({ student });
}
