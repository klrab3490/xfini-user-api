const { getAuth } = require('firebase-admin/auth');
const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore, FieldValue, Timestamp } = require('firebase-admin/firestore');

module.exports = { initializeApp, cert, getAuth, getFirestore, FieldValue, Timestamp };
