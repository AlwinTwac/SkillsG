import { NextResponse } from 'next/server';
import { adminDb, adminAuth } from '@/lib/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';

interface UnsubscribeRequest {
  userUid: string;
}

export async function POST(request: Request) {
  try {
    const { userUid }: UnsubscribeRequest = await request.json();

    if (!userUid) {
      return NextResponse.json(
        { error: 'User UID is required' },
        { status: 400 }
      );
    }

    // Get the authorization token from the request headers
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Authorization token required' },
        { status: 401 }
      );
    }

    const token = authHeader.split('Bearer ')[1];

    // Verify the Firebase ID token
    const decodedToken = await adminAuth.verifyIdToken(token);
    const currentUserUid = decodedToken.uid;

    // Get the company user document to verify role
    const companyDocRef = adminDb.collection('users').doc(currentUserUid);
    const companyDoc = await companyDocRef.get();
    
    if (!companyDoc.exists || companyDoc.data()?.role !== 'company') {
      return NextResponse.json(
        { error: 'Only companies can unsubscribe users from hollacaller' },
        { status: 403 }
      );
    }

    // Find the hollacaller entry for this user
    const hollacallerQuery = adminDb
      .collection('hollacaller')
      .where('userUid', '==', userUid);
    const snapshot = await hollacallerQuery.get();
    
    if (snapshot.empty) {
      return NextResponse.json(
        { error: 'User is not subscribed to hollacaller' },
        { status: 404 }
      );
    }

    // Delete the hollacaller entry
    const entryDoc = snapshot.docs[0];
    await adminDb.collection('hollacaller').doc(entryDoc.id).delete();

    // Update user's subscriptions array
    const userDocRef = adminDb.collection('users').doc(userUid);
    await userDocRef.update({
      subscriptions: FieldValue.arrayRemove('hollacaller')
    });

    return NextResponse.json({
      message: 'User successfully unsubscribed from hollacaller',
      unsubscribedUser: {
        userUid,
        email: entryDoc.data().email,
        name: entryDoc.data().Name
      }
    });

  } catch (error: any) {
    console.error('Error unsubscribing user from hollacaller:', error);
    
    // Handle specific Firebase auth errors
    if (error.code === 'auth/argument-error' || error.code === 'auth/id-token-expired') {
      return NextResponse.json(
        { error: 'Invalid or expired authentication token' },
        { status: 401 }
      );
    }
    
    return NextResponse.json(
      { error: `Failed to unsubscribe user: ${error.message}` },
      { status: 500 }
    );
  }
}
