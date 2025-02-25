// firebase.gs - Firebase-related functions
function createTicket(ticketData) {
  const firebaseUrl = "https://sjmc-maintenance-system-default-rtdb.firebaseio.com/tickets.json";
  
  const options = {
    'method': 'post',
    'contentType': 'application/json',
    'payload': JSON.stringify(ticketData),
    'muteHttpExceptions': true
  };
  
  try {
    const response = UrlFetchApp.fetch(firebaseUrl, options);
    if (response.getResponseCode() !== 200) {
      Logger.log("Firebase error: " + response.getContentText());
      throw new Error("Failed to create ticket in Firebase");
    }
    Logger.log("Ticket created successfully in Firebase");
    return ticketData.ticketId;
  } catch(error) {
    Logger.log('Error creating ticket: ' + error.toString());
    throw error;
  }
}
function updateTicket(ticketId, updates) {
  const token = getAccessToken();
  const firebaseUrl = `https://sjmc-maintenance-system-default-rtdb.firebaseio.com/tickets/${ticketId}.json`;
  
  const options = {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${token}`
    },
    contentType: 'application/json',
    payload: JSON.stringify({
      ...updates,
      lastUpdated: new Date().toISOString()
    })
  };

  try {
    const response = UrlFetchApp.fetch(firebaseUrl, options);
    return JSON.parse(response.getContentText());
  } catch (error) {
    Logger.log('Error updating ticket:', error);
    throw error;
  }
}
function cleanupDuplicateTickets() {
  const firebaseUrl = "https://sjmc-maintenance-system-default-rtdb.firebaseio.com/tickets.json";
  
  try {
    const response = UrlFetchApp.fetch(firebaseUrl, {
      'muteHttpExceptions': true,
      'method': 'GET'
    });
    
    if (response.getResponseCode() !== 200) {
      Logger.log("Error accessing Firebase: " + response.getContentText());
      return;
    }
    
    const tickets = JSON.parse(response.getContentText());
    if (!tickets) {
      Logger.log("No tickets found");
      return;
    }
    
    // Group tickets by email and keep only the latest
    const uniqueTickets = {};
    Object.entries(tickets).forEach(([key, ticket]) => {
      if (ticket && ticket.requester && ticket.requester.email && ticket.createdAt) {
        const email = ticket.requester.email;
        if (!uniqueTickets[email] || new Date(ticket.createdAt) > new Date(uniqueTickets[email].createdAt)) {
          uniqueTickets[email] = {
            ...ticket,
            key: key
          };
        }
      }
    });
    
    // Count duplicates for logging
    let deletedCount = 0;
    
    // Delete duplicates
    Object.entries(tickets).forEach(([key, ticket]) => {
      if (ticket && ticket.requester && ticket.requester.email) {
        const email = ticket.requester.email;
        if (uniqueTickets[email].key !== key) {
          const deleteUrl = `https://sjmc-maintenance-system-default-rtdb.firebaseio.com/tickets/${key}.json`;
          const deleteResponse = UrlFetchApp.fetch(deleteUrl, {
            'method': 'DELETE',
            'muteHttpExceptions': true
          });
          
          if (deleteResponse.getResponseCode() === 200) {
            deletedCount++;
          }
        }
      }
    });
    
    Logger.log(`Cleanup completed. Deleted ${deletedCount} duplicate tickets.`);
    
  } catch (error) {
    Logger.log("Error in cleanup: " + error.toString());
  }
}
// Firebase Authentication
function getServiceAccountCredentials() {
  return {
     "type": "service_account",
  "project_id": "sjmc-maintenance-system",
  "private_key_id": "da3759b524ddafbaba9347581034639afd23d5a5",
  "private_key": "-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQCZKzREvEaiUc3j\nqC+KCKWUHnt/GA+rFvlRRzGHXYJtaJrUoTgrzJlC9mJN1nm4+tp4ZTrNFBLxErll\ntcM9v8iF/+A7x1WX472R+ysXxu9XV+cxb4/xdR9WFXCsYrUXpRchGLYtV2Jq590Z\nd9F1byUaJ/SgNCEpKCHMBq7p4uHulPEyI9TtoE4zkrV0W2z3CgaoHtkvRoev5Z9y\n0Rxma3H49DPiJa9EVNqpkbfhiGGkQ9QXwBpyu9N+Y8bysWZrK0Ibn6HXeWH3teG1\nwEM/7EJxVCP8GBbbp3J4TQEEFpfjQylveAiwb3idOxXNrXnydiNAwg3rLZlqew+9\nw7OptYpHAgMBAAECggEAHPQeTsn6Xi+xiFHgHqswxZWXibheKdzPZ05abfi+sXjf\nH8eUCy+DXzWc8pLS8qU0zCJyoZakV/7OngvkatVIjhAG7rXpF6u8x44foMCBuNSM\nhvtMTfvyXv7xjByil+QkwaRet6Z3m7bVxD0ykozeihm4c9o21IVaEivHP74cMFGb\ncTFb6NCXxoOMCksyOh5bz6JM84FEJFOF8TSApgAXMRCb4uSw7ddCVmc7WQJi7+Fi\n5VcJsWY7JhJHPkE01/d11ifTPgojefCq/RaH2OGhVRDNgQUG1XczKnT2b2VQTks0\nSyNIm9SlDzszfYQlG7vHvX6+60m8XWmD72C+Q2aUkQKBgQDOziZk/QWce1wcQIB6\nsALWEvkFFAHuL3uL9H7GZeQNedXqQOxsk1WowdRysNVyzQE6n+mXzdstTwoIQakN\nP0VN7ziHuwzMTpzf4wGPauda7BqPMATcWm55GE01a7CwbEqXRAxfh/G60rmxcidX\nEc93m63Uj1EyYeVi0Z9OD7iTMQKBgQC9mr6Fye5SJRZB9gh1ioQYxGJU+SgxhvOC\nT77Q/FmI0jv+XCQn071ynLn1c7K83ncfW6HrP4fqYZ44T4y40rRqRyuHYwQVtJWF\ngFh069/Wp35xlBhGDmkuaCDB0vH+aQW41fjS8wxJQdOB6dDTKtvkWjZiS049NLSa\nUQBF0Rpm9wKBgQCsgSNfu/tRQ0lbO6awMF+9SEg2JzFRCISLAuA5CEcJwqZgZ9WO\n3/tk8IIRRVZXE5BB4aBNg2afTb31kye7qBpcXv6NocaUKcMLsmTbx/XCTw38gLad\nREXAdzf4JqNVFo/Fy/pyOYi3KQ3CaZFNPMsNX2vJ0d6OI0DfhDHZQJ3bEQKBgACE\nkq6k3YzF4yis9lrz1OaIashWoeB4wOODOj8x4UC5akaIk+Sz9FmCyhM8jKltZh/k\nzS1qUAG44IjA1t6OXMXJifnlsFYq1xm1PwiauFLKxFKlF+fhFDJ3QFenLtgGC2j0\n1Kgm18q/bkd1jwd0n4MhJ/Lex8jtAu1E+V43cv4DAoGAVhNNUCjkV1da+RBwbBfw\nC30aGFAjDtGf74go00cTnKfAbFr2AdSkDpm0tDme0wGt9OH5chBp1tP7VskpzMCO\n2+KNqZXIOJTkaRcLNqsxIrcF/33AR0bPDgJ31nFriI9eeh9fJ+E2+kWeiIM+lvBW\nhEjMKYaTBIJHDX4rgcNM+so=\n-----END PRIVATE KEY-----\n",
  "client_email": "firebase-adminsdk-fbsvc@sjmc-maintenance-system.iam.gserviceaccount.com",
  "client_id": "106488492379568427896",
  "auth_uri": "https://accounts.google.com/o/oauth2/auth",
  "token_uri": "https://oauth2.googleapis.com/token",
  "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
  "client_x509_cert_url": "https://www.googleapis.com/robot/v1/metadata/x509/firebase-adminsdk-fbsvc%40sjmc-maintenance-system.iam.gserviceaccount.com",
  "universe_domain": "googleapis.com"
  };
}
function getAccessToken() {
  const serviceAccount = getServiceAccountCredentials();
  const jwtClaims = {
    iss: serviceAccount.client_email,
    scope: "https://www.googleapis.com/auth/firebase.database",
    aud: "https://oauth2.googleapis.com/token",
    exp: Math.floor(Date.now() / 1000) + 3600,
    iat: Math.floor(Date.now() / 1000)
  };
  
  const jwt = generateSignedJWT(serviceAccount.private_key, jwtClaims);
  const response = UrlFetchApp.fetch("https://oauth2.googleapis.com/token", {
    method: "post",
    payload: {
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: jwt
    }
  });
  
  return JSON.parse(response.getContentText()).access_token;
}
function generateSignedJWT(privateKey, claims) {
  const header = {
    alg: "RS256",
    typ: "JWT"
  };
  
  const pemContent = privateKey
    .replace('-----BEGIN PRIVATE KEY-----', '')
    .replace('-----END PRIVATE KEY-----', '')
    .replace(/\s/g, '');
    
  const key = Utilities.newBlob(Utilities.base64Decode(pemContent)).getBytes();
  
  const encodedHeader = Utilities.base64EncodeWebSafe(JSON.stringify(header));
  const encodedClaims = Utilities.base64EncodeWebSafe(JSON.stringify(claims));
  const signedInput = `${encodedHeader}.${encodedClaims}`;
  
  const signature = Utilities.computeRsaSha256Signature(signedInput, key);
  const encodedSignature = Utilities.base64Encode(signature);
  
  return `${signedInput}.${encodedSignature}`;
}
function getStaffDetails(staffId) {
  try {
    Logger.log("Getting staff details for ID: " + staffId);
    const url = `https://sjmc-maintenance-system-default-rtdb.firebaseio.com/staff/${staffId}.json`;
    
    const response = UrlFetchApp.fetch(url);
    
    if (response.getResponseCode() === 200) {
      const staffData = JSON.parse(response.getContentText());
      Logger.log("Found staff data: " + JSON.stringify(staffData));
      return staffData;
    }
    
    Logger.log("No staff data found for ID: " + staffId);
    return null;
  } catch (error) {
    Logger.log("Error getting staff details: " + error.toString());
    return null;
  }
}
function updateStaffDisplay(staffId) {
  try {
    const staffData = getStaffDetails(staffId);
    if (staffData) {
      return {
        name: staffData.name,
        department: staffData.department,
        email: staffData.email
      };
    }
    return {
      name: 'Unassigned',
      department: '',
      email: ''
    };
  } catch (error) {
    Logger.log("Error updating staff display:", error);
    return {
      name: 'Error loading staff details',
      department: '',
      email: ''
    };
  }
}
function getStaffDetails(staffId) {
  try {
    Logger.log("Getting staff details for ID:", staffId);
    
    const url = `https://sjmc-maintenance-system-default-rtdb.firebaseio.com/staff/${staffId}.json`;
    Logger.log("Fetching from URL:", url);
    
    const response = UrlFetchApp.fetch(url);
    Logger.log("Raw response:", response.getContentText());
    
    const staffData = JSON.parse(response.getContentText());
    
    if (staffData) {
      Logger.log("Found staff data:", JSON.stringify(staffData, null, 2));
      return {
        name: staffData.name,
        email: staffData.email,
        department: staffData.department,
        activeTickets: staffData.activeTickets || 0
      };
    }
    
    Logger.log("No staff data found");
    return null;
  } catch (error) {
    Logger.log("Error getting staff details:", error.toString());
    return null;
  }
}
