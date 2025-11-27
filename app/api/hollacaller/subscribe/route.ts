import { NextResponse } from 'next/server';
import { adminDb, adminAuth } from '@/lib/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';

interface SubscribeRequest {
  userUid: string;
}

interface HollacallerEntry {
  email: string;
  Name: string;
  subscribedAt: string;
  userUid: string;
  companyUid: string;
}

export async function POST(request: Request) {
  try {
    const { userUid }: SubscribeRequest = await request.json();

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
    let currentUserUid: string;
    try {
      const decodedToken = await adminAuth.verifyIdToken(token);
      currentUserUid = decodedToken.uid;
    } catch (tokenError: any) {
      console.error('Token verification failed:', tokenError);
      return NextResponse.json(
        { error: `Token verification failed: ${tokenError.message}` },
        { status: 401 }
      );
    }

    // Get the company user document to verify role
    const companyDocRef = adminDb.collection('users').doc(currentUserUid);
    const companyDoc = await companyDocRef.get();
    
    if (!companyDoc.exists || companyDoc.data()?.role !== 'company') {
      console.log('Error: Only companies can subscribe users to hollacaller');
      return NextResponse.json(
        { error: 'Only companies can subscribe users to hollacaller' },
        { status: 403 }
      );
    }
    console.log('Company role verified');

    // Get the user to be subscribed
    const userDocRef = adminDb.collection('users').doc(userUid);
    const userDoc = await userDocRef.get();
    
    if (!userDoc.exists) {
      console.log('Error: User not found');
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    const userData = userDoc.data()!;
    const userEmail = userData.email;
    const userName = userData.name || userData.displayName || 'Unknown';
    console.log('Target user found:', { userEmail, userName });

    if (!userEmail) {
      console.log('Error: User email is required');
      return NextResponse.json(
        { error: 'User email is required' },
        { status: 400 }
      );
    }

    // Check if user is already subscribed to hollacaller
    const hollacallerQuery = adminDb
      .collection('hollacaller')
      .where('userUid', '==', userUid);
    const existingEntries = await hollacallerQuery.get();
    
    if (!existingEntries.empty) {
      console.log('Error: User is already subscribed to hollacaller');
      return NextResponse.json(
        { error: 'User is already subscribed to hollacaller' },
        { status: 409 }
      );
    }

    // Create entry in hollacaller collection
    const hollacallerEntry: HollacallerEntry = {
      email: userEmail,
      Name: userName,
      subscribedAt: new Date().toISOString(),
      userUid: userUid,
      companyUid: currentUserUid
    };
    console.log('Creating hollacaller entry:', hollacallerEntry);

    await adminDb.collection('hollacaller').add(hollacallerEntry);
    console.log('Hollacaller entry created successfully');

    // Update user's subscriptions array (if it exists) or create it
    const currentSubscriptions = userData.subscriptions || [];
    if (!Array.isArray(currentSubscriptions)) {
      await userDocRef.update({
        subscriptions: ['hollacaller']
      });
    } else {
      await userDocRef.update({
        subscriptions: FieldValue.arrayUnion('hollacaller')
      });
    }
    console.log('User subscriptions updated');

    const response = {
      message: 'User successfully subscribed to hollacaller',
      entry: {
        email: userEmail,
        name: userName,
        subscribedAt: hollacallerEntry.subscribedAt
      }
    };
    console.log('Returning success response:', response);

    return NextResponse.json(response);

  } catch (error: any) {
    console.error('=== ERROR IN HOLLACALLER SUBSCRIBE ===');
    console.error('Error type:', typeof error);
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
    console.error('Full error:', error);
    
    // Handle specific Firebase auth errors
    if (error.code === 'auth/argument-error' || error.code === 'auth/id-token-expired') {
      return NextResponse.json(
        { error: 'Invalid or expired authentication token' },
        { status: 401 }
      );
    }
    
    return NextResponse.json(
      { error: `Failed to subscribe user: ${error.message}` },
      { status: 500 }
    );
  }
}

// GET endpoint to list all hollacaller subscribers (companies only)
export async function GET(request: Request) {
  try {
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

    // Verify the requester is a company
    const companyDocRef = adminDb.collection('users').doc(currentUserUid);
    const companyDoc = await companyDocRef.get();
    
    if (!companyDoc.exists || companyDoc.data()?.role !== 'company') {
      return NextResponse.json(
        { error: 'Only companies can view hollacaller subscribers' },
        { status: 403 }
      );
    }

    // Get all hollacaller subscribers
    const hollacallerQuery = adminDb.collection('hollacaller');
    const snapshot = await hollacallerQuery.get();
    
    const subscribers = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    return NextResponse.json({ subscribers });

  } catch (error: any) {
    console.error('Error fetching hollacaller subscribers:', error);
    
    // Handle specific Firebase auth errors
    if (error.code === 'auth/argument-error' || error.code === 'auth/id-token-expired') {
      return NextResponse.json(
        { error: 'Invalid or expired authentication token' },
        { status: 401 }
      );
    }
    
    return NextResponse.json(
      { error: `Failed to fetch subscribers: ${error.message}` },
      { status: 500 }
    );
  }
}
