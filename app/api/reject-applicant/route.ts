import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { sendRejectionEmail } from '@/lib/sendemails';

export async function POST(request: Request) {
  try {
    const { reportId, reportData } = await request.json();

    if (!reportId || !reportData?.studentEmail || !reportData?.studentName) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Send rejection email
    await sendRejectionEmail(reportData.studentEmail, reportData.studentName);

    // Delete pending report
    await adminDb.collection('pendingInterviewReports').doc(reportId).delete();

    return NextResponse.json({ success: true });

  } catch (error: any) {
    console.error('Rejection error:', error);
    return NextResponse.json(
      { error: error.message || 'Rejection failed' },
      { status: 500 }
    );
  }
}