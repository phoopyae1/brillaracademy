import { NextRequest, NextResponse } from 'next/server';
import { createStudent, listStudents, fetchStudentById } from '@/lib/db';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const idParam = searchParams.get('id');

  if (idParam) {
    const studentId = Number(idParam);
    const student = await fetchStudentById(studentId);

    if (!student) {
      return NextResponse.json({ error: 'Student not found.' }, { status: 404 });
    }

    return NextResponse.json({ student });
  }

  const students = await listStudents();
  return NextResponse.json({ students });
}

export async function POST(request: NextRequest) {
  const payload = await request.json();

  const { firstName, lastName, email, password, role, primaryInterest } = payload ?? {};

  if (!firstName || !lastName || !email || !password) {
    return NextResponse.json(
      { error: 'First name, last name, email, and password are required.' },
      { status: 400 }
    );
  }

  try {
    const student = await createStudent({ firstName, lastName, email, password, role, primaryInterest });
    return NextResponse.json({ student }, { status: 201 });
  } catch (error) {
    console.error('Failed to create student account', error);
    const duplicate = (error as { code?: string; message?: string } | undefined)?.code === '23505' ||
      (error as Error | undefined)?.message?.toLowerCase().includes('already exists');
    const status = duplicate ? 409 : 500;
    const message = duplicate
      ? 'An account with this email already exists. Try logging in instead.'
      : 'Unable to create account. Please try again later.';
    return NextResponse.json({ error: message }, { status });
  }
}
