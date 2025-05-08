// src/scripts/setupAdminRoles.js
// This script can be used to set up admin roles in your Firebase database
// You can run this locally using Node.js with appropriate Firebase credentials

const admin = require('firebase-admin');
const serviceAccount = require('./path-to-your-firebase-admin-sdk.json');

// Initialize the app
admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: "https://campuscare-9b9d2.firebaseio.com"
});

// Get a database reference
const db = admin.database();

// Sample admin data structure
const adminData = {
    "admins": {
        "admin1": {
            "email": "admin@example.com",
            "name": "Admin User",
            "role": "admin",
            "permissions": {
                "canManageUsers": true,
                "canManageCategories": true,
                "canManageLocations": true,
                "canViewAnalytics": true,
                "canViewWorkload": true
            },
            "createdAt": new Date().toISOString()
        },
        "supervisor1": {
            "email": "supervisor@example.com",
            "name": "Supervisor User",
            "role": "supervisor",
            "permissions": {
                "canManageUsers": false,
                "canManageCategories": true,
                "canManageLocations": true,
                "canViewAnalytics": true,
                "canViewWorkload": true
            },
            "createdAt": new Date().toISOString()
        }
    }
};

// Update admin data structure
db.ref().update(adminData)
    .then(() => {
        console.log('Admin roles set up successfully!');
        process.exit(0);
    })
    .catch((error) => {
        console.error('Error setting up admin roles:', error);
        process.exit(1);
    });

// Firebase Realtime Database Rules for Admin Access
/*
{
  "rules": {
    "admins": {
      ".read": "auth != null && (root.child('admins').child(auth.uid).exists() || root.child('staff').child(auth.uid).child('role').val() === 'supervisor')",
      ".write": "auth != null && root.child('admins').child(auth.uid).child('role').val() === 'admin'"
    },
    "staff": {
      ".read": "auth != null",
      ".write": "auth != null && (root.child('admins').child(auth.uid).exists() || root.child('staff').child(auth.uid).child('role').val() === 'supervisor')"
    },
    "categories": {
      ".read": "auth != null",
      ".write": "auth != null && (root.child('admins').child(auth.uid).exists() || root.child('staff').child(auth.uid).child('role').val() === 'supervisor')"
    },
    "locations": {
      ".read": "auth != null",
      ".write": "auth != null && (root.child('admins').child(auth.uid).exists() || root.child('staff').child(auth.uid).child('role').val() === 'supervisor')"
    },
    "tickets": {
      ".read": "auth != null",
      ".write": "auth != null"
    }
  }
}
*/