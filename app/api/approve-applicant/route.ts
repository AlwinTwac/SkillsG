import { NextResponse } from 'next/server';
import { getAdminDb, getAdminAuth } from '@/lib/firebase-admin';
import { sendApprovalEmail } from '@/lib/sendemails'; 

export async function POST(request: Request) {
  try {
    const { reportId, reportData } = await request.json();

    if (!reportId || !reportData || !reportData.studentEmail || !reportData.studentName) {
      throw new Error("Missing required report data (ID, email, or name).");
    }

    const adminDb = getAdminDb();
    const adminAuth = getAdminAuth();

    // --- 1. Create a new user in Firebase Authentication ---
    const newUserRecord = await adminAuth.createUser({
      email: reportData.studentEmail,
      displayName: reportData.studentName,
      emailVerified: false,
    });

    // --- 2. Find the course IDs for the recommended learning path ---
    const recommendedCourseNames = reportData.recommendedLearningPath || [];
    let enrolledCourseIds: string[] = [];
    if (recommendedCourseNames.length > 0) {
        const coursesQuery = adminDb.collection('courses').where('name', 'in', recommendedCourseNames);
        const coursesSnapshot = await coursesQuery.get();
        enrolledCourseIds = coursesSnapshot.docs.map(doc => doc.id);
    }

    // --- 3. Use a batch to perform all database writes at once ---
    const batch = adminDb.batch();

    // Create the user's profile document
    const userDocRef = adminDb.collection('users').doc(newUserRecord.uid);
    batch.set(userDocRef, {
      email: reportData.studentEmail,
      name: reportData.studentName,
      role: 'student',
      profileCompleted: true,
      createdAt: new Date().toISOString(),
      authProvider: 'email',
      experience: reportData.experience || '',
      skills: reportData.skills || [],
      interests: reportData.interests || [],
      goals: reportData.goals || '',
      profileVisibility: 'private',
      enrolledCourseIds: enrolledCourseIds, // Add the enrolled course IDs
    });

    // Create enrollment documents for each recommended course
    if (enrolledCourseIds.length > 0) {
        enrolledCourseIds.forEach(courseId => {
            const enrollmentDocId = `${newUserRecord.uid}_${courseId}`;
            const enrollmentRef = adminDb.collection('enrollments').doc(enrollmentDocId);
            batch.set(enrollmentRef, {
                studentUid: newUserRecord.uid,
                courseId: courseId,
                companyUid: reportData.companyUid || '', // Assuming companyUid is on the pending report
                enrolledAt: new Date(),
                status: 'active'
            });
        });
    }

    // Move the interview report to the final collection
    const finalReportRef = adminDb.collection('interviewReports').doc();
    batch.set(finalReportRef, {
      ...reportData,
      studentUid: newUserRecord.uid,
      status: 'approved',
      approvedAt: new Date().toISOString(),
    });

    // Delete the pending report
    const pendingReportRef = adminDb.collection('pendingInterviewReports').doc(reportId);
    batch.delete(pendingReportRef);

    // --- 4. Commit all changes to the database ---
    await batch.commit();

    // --- 5. Generate and send the password reset email ---
    const passwordResetLink = await adminAuth.generatePasswordResetLink(reportData.studentEmail);
    await sendApprovalEmail(reportData.studentEmail, reportData.studentName, passwordResetLink);

    return NextResponse.json({ success: true, message: 'Applicant approved and notified via email.' });

  } catch (error: any) {
    console.error('Error in /api/approve-applicant:', error);
    return NextResponse.json(
      { success: false, error: `Failed to approve applicant: ${error.message}` },
      { status: 500 }
    );
  }
}
