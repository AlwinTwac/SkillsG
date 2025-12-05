import { NextResponse } from 'next/server';
import { adminDb, adminAuth } from '@/lib/firebase-admin';
import { sendApprovalEmail } from '@/lib/sendemails';

export async function POST(request: Request) {
  try {
    const { reportId, reportData } = await request.json();

    console.log('Received data:', { reportId, reportData });

    if (!reportId || !reportData?.studentEmail || !reportData?.studentName) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(reportData.studentEmail)) {
      console.error('Invalid email format:', reportData.studentEmail);
      return NextResponse.json(
        { error: `Invalid email format: ${reportData.studentEmail}` },
        { status: 400 }
      );
    }

    console.log('Creating user with email:', reportData.studentEmail);

    const user = await adminAuth.createUser({
      email: reportData.studentEmail,
      displayName: reportData.studentName,
      emailVerified: false
    });

   
    const batch = adminDb.batch();
    
 
    const userRef = adminDb.collection('users').doc(user.uid);
    batch.set(userRef, {
      email: reportData.studentEmail,
      name: reportData.studentName,
      role: 'student',
      profileCompleted: true,
      createdAt: new Date().toISOString(),
      companyUid: reportData.companyUid || null
    });

    const approvedReportRef = adminDb.collection('interviewReports').doc();
    batch.set(approvedReportRef, {
      ...reportData,
      studentUid: user.uid,
      status: "approved",
      approvedAt: new Date().toISOString()
    });

    
    const pendingReportRef = adminDb.collection('pendingInterviewReports').doc(reportId);
    batch.delete(pendingReportRef);

    await batch.commit();

    
    const passwordResetLink = await adminAuth.generatePasswordResetLink(reportData.studentEmail);
    await sendApprovalEmail(reportData.studentEmail, reportData.studentName, passwordResetLink);

    return NextResponse.json({ success: true });
    
  } catch (error: any) {
    console.error('Approval error:', error);
    return NextResponse.json(
      { error: error.message || 'Approval failed' },
      { status: 500 }
    );
  }
}