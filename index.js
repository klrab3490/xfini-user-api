require('dotenv').config();
const express = require('express');
const admin = require('firebase-admin');
const fetch = require('node-fetch');
const serviceAccount = require('./serviceAccount.json');

const FIREBASE_API_KEY = 'AIzaSyCS0ZNzHsLBUWTgr-O0UkvflZVNC25V9OI';
const ADMIN_EMAIL = process.env.ADMIN_EMAIL;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const app = express();
app.use(express.json());

app.use((req, res, next) => {
  const start = Date.now();
  const timestamp = new Date().toISOString();
  const body = req.body && Object.keys(req.body).length ? JSON.stringify(req.body) : null;
  console.log(`[${timestamp}] ${req.method} ${req.path}${body ? ` — body: ${body}` : ''}`);

  res.on('finish', () => {
    const ms = Date.now() - start;
    const status = res.statusCode;
    const color = status < 400 ? '\x1b[32m' : '\x1b[31m';
    const reset = '\x1b[0m';
    const label = status < 400 ? 'SUCCESS' : 'FAILED';
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.path} → ${color}${status} ${label}${reset} (${ms}ms)`);
  });

  next();
});

// POST /api/getToken — signs in using credentials from .env and returns a fresh ID token
app.post('/api/getToken', async (req, res) => {
  if (!ADMIN_EMAIL || !ADMIN_PASSWORD) {
    return res.status(500).json({ success: false, error: 'ADMIN_EMAIL or ADMIN_PASSWORD not set in .env' });
  }

  try {
    const response = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${FIREBASE_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD, returnSecureToken: true })
      }
    );

    const data = await response.json();

    if (!response.ok) {
      const msg = data.error?.message || 'Sign-in failed.';
      return res.status(401).json({ success: false, error: msg });
    }

    return res.status(200).json({
      success: true,
      idToken: data.idToken,
      expiresIn: data.expiresIn  // seconds until token expires (3600 = 1 hour)
    });

  } catch (err) {
    return res.status(500).json({ success: false, error: `Failed to get token: ${err.message}` });
  }
});

// Cache token for 55 minutes (token expires after 60)
let cachedToken = null;
let tokenExpiry = 0;

async function getAdminToken() {
  if (cachedToken && Date.now() < tokenExpiry) return cachedToken;

  const response = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${FIREBASE_API_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD, returnSecureToken: true })
    }
  );
  const data = await response.json();
  if (!response.ok) throw new Error(data.error?.message || 'Sign-in failed.');

  cachedToken = data.idToken;
  tokenExpiry = Date.now() + 55 * 60 * 1000;
  return cachedToken;
}

// POST /api/createUser
app.post('/api/createUser', async (req, res) => {
  if (!ADMIN_EMAIL || !ADMIN_PASSWORD) {
    return res.status(500).json({ success: false, error: 'ADMIN_EMAIL or ADMIN_PASSWORD not set in .env' });
  }

  // Auto-fetch token internally using .env credentials
  let callerUid;
  try {
    const idToken = await getAdminToken();
    const decoded = await admin.auth().verifyIdToken(idToken);
    callerUid = decoded.uid;
  } catch (err) {
    return res.status(401).json({ success: false, error: `Auth failed: ${err.message}` });
  }

  // Verify the .env admin user has admin role in Firestore
  const callerDoc = await admin.firestore().collection('users').doc(callerUid).get();
  if (!callerDoc.exists || callerDoc.data().role !== 'admin') {
    return res.status(403).json({ success: false, error: 'The credentials in .env do not belong to an admin user.' });
  }

  const { password, role } = req.body;
  const email = req.body.email?.trim();
  const toProper = str => str.trim().toLowerCase().replace(/\b\w/g, c => c.toUpperCase());
  const firstName = toProper(req.body.firstName || '');
  const lastName = toProper(req.body.lastName || '');
  const displayName = `${firstName} ${lastName}`.trim();

  if (!email || !password || !displayName || !role) {
    return res.status(400).json({ success: false, error: 'All fields are required: email, password, displayName, role.' });
  }

  if (!['admin', 'student'].includes(role)) {
    return res.status(400).json({ success: false, error: "Role must be 'admin' or 'student'." });
  }

  try {
    const userRecord = await admin.auth().createUser({ email, password, displayName, emailVerified: false });

    await admin.firestore().collection('users').doc(userRecord.uid).set({
      email,
      displayName,
      role,
      assignedModules: [],
      assignedCourseIds: [],
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    try {
      await admin.auth().setCustomUserClaims(userRecord.uid, { role, assignedModules: [], assignedCourseIds: [] });
    } catch (e) {
      console.warn('Custom claims failed (non-fatal):', e.message);
    }

    return res.status(201).json({
      success: true,
      message: 'User created successfully.',
      user: { uid: userRecord.uid, email: userRecord.email, displayName: userRecord.displayName, role }
    });

  } catch (error) {
    if (error.code === 'auth/email-already-exists') {
      return res.status(409).json({ success: false, error: 'A user with this email already exists.' });
    } else if (error.code === 'auth/invalid-email') {
      return res.status(400).json({ success: false, error: 'Invalid email address.' });
    } else if (['auth/invalid-password', 'auth/weak-password'].includes(error.code)) {
      return res.status(400).json({ success: false, error: 'Password must be at least 6 characters.' });
    }
    return res.status(500).json({ success: false, error: `Failed to create user: ${error.message}` });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`Xfini user API running on http://localhost:${PORT}`));
