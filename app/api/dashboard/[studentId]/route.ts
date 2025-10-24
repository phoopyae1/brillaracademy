import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { fetchStudentDashboard } from '@/lib/db';

interface Params {
  params: {
    studentId: string;
  };
}

export async function GET(_request: NextRequest, { params }: Params) {
  const studentId = Number(params.studentId);

  if (!Number.isFinite(studentId)) {
    return NextResponse.json({ error: 'A valid student id is required.' }, { status: 400 });
  }

  const dashboard = await fetchStudentDashboard(studentId);

  if (!dashboard) {
    return NextResponse.json({ error: 'Dashboard data not found.' }, { status: 404 });
  }

  return NextResponse.json(dashboard);
}
