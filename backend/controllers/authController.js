
const { getAuth } = require('firebase-admin/auth');
const { getFirestore } = require('firebase-admin/firestore');
const { getApps } = require('firebase-admin/app');

function getFirebaseApp() {
    const firebaseApp = getApps().find(
        app => app.name === '[DEFAULT]'
    );

    if (!firebaseApp) {
        throw new Error(
            'Firebase Admin is not initialized. Check server.js and Render environment variables.'
        );
    }

    return firebaseApp;
}

// REGISTER
exports.register = async (req, res) => {
    let createdUid = null;

    try {
        const { email, password, name } = req.body || {};

        if (
            typeof email !== 'string' ||
            typeof password !== 'string' ||
            typeof name !== 'string' ||
            !email.trim() ||
            !password ||
            !name.trim()
        ) {
            return res.status(400).json({
                error: 'Name, email and password are required.'
            });
        }

        const firebaseApp = getFirebaseApp();
        const auth = getAuth(firebaseApp);
        const db = getFirestore(firebaseApp);

        const cleanEmail = email.trim().toLowerCase();
        const cleanName = name.trim();

        // Create Firebase Authentication account
        const userRecord = await auth.createUser({
            email: cleanEmail,
            password,
            displayName: cleanName
        });

        createdUid = userRecord.uid;

        // Create corresponding Firestore user document
        await db.collection('users').doc(userRecord.uid).set({
            uid: userRecord.uid,
            name: cleanName,
            email: cleanEmail,
            role: 0,
            profileImage: '',
            createdAt: new Date().toISOString()
        });

        return res.status(201).json({
            message: 'User registered successfully',
            uid: userRecord.uid
        });
    } catch (error) {
        console.error(
            'Register Error:',
            error.code || '',
            error.message
        );

        // If Firestore save failed, remove only the Auth account
        // created by this particular request.
        if (createdUid) {
            try {
                const firebaseApp = getFirebaseApp();
                await getAuth(firebaseApp).deleteUser(createdUid);
            } catch (rollbackError) {
                console.error(
                    'Registration rollback failed:',
                    rollbackError.message
                );
            }
        }

        if (error.code === 'auth/email-already-exists') {
            return res.status(409).json({
                error: 'This email is already registered.'
            });
        }

        if (error.code === 'auth/invalid-email') {
            return res.status(400).json({
                error: 'Please enter a valid email address.'
            });
        }

        if (
            error.code === 'auth/invalid-password' ||
            error.code === 'auth/weak-password'
        ) {
            return res.status(400).json({
                error: 'Password does not meet Firebase security requirements.'
            });
        }

        if (error.code === 'auth/operation-not-allowed') {
            return res.status(400).json({
                error: 'Enable Email/Password sign-in in Firebase Authentication.'
            });
        }

        if (
            error.code === 'auth/insufficient-permission' ||
            error.code === 'permission-denied'
        ) {
            return res.status(403).json({
                error: 'Firebase permissions do not allow this operation.'
            });
        }

        return res.status(500).json({
            error: 'Registration failed. Check Render logs for details.'
        });
    }
};

// LOGIN: expects an ID token from Firebase Client SDK
exports.login = async (req, res) => {
    try {
        const { idToken } = req.body || {};

        if (!idToken || typeof idToken !== 'string') {
            return res.status(400).json({
                error: 'ID Token required'
            });
        }

        const firebaseApp = getFirebaseApp();
        const auth = getAuth(firebaseApp);
        const db = getFirestore(firebaseApp);

        // Verify the token generated after client-side Firebase login
        const decodedToken = await auth.verifyIdToken(idToken);
        const uid = decodedToken.uid;

        const userDoc = await db.collection('users').doc(uid).get();

        if (!userDoc.exists) {
            return res.status(404).json({
                error: 'User not found in database'
            });
        }

        const userData = userDoc.data();

        return res.status(200).json({
            message: 'Login successful',
            user: {
                uid,
                email: userData.email || decodedToken.email || '',
                name: userData.name || '',
                role: userData.role ?? 0,
                profileImage: userData.profileImage || ''
            }
        });
    } catch (error) {
        console.error(
            'Login Error:',
            error.code || '',
            error.message
        );

        return res.status(401).json({
            error: 'Invalid or expired login token.'
        });
    }
};
