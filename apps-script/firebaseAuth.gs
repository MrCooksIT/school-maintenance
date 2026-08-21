/**
 * firebaseAuth.gs - authenticated access to the Realtime Database.
 *
 * The database used to allow anonymous reads and writes, so the script never
 * needed a token. It is now locked down: only admins and maintenance staff can
 * read tickets, and only they can update one. A service-account token bypasses
 * the rules entirely, which is what a trusted back-end job should be doing
 * anyway.
 *
 * SETUP (once):
 *   1. Firebase console -> Project settings -> Service accounts -> Generate new
 *      private key. This gives you a JSON file.
 *   2. Apps Script -> Project Settings -> Script Properties -> Add:
 *        name:  FIREBASE_SERVICE_ACCOUNT
 *        value: paste the entire contents of that JSON file
 *   3. Run testFirebaseAuth() and check the log says OK.
 *
 * Keep the key in Script Properties, never in the code. The old key that was
 * pasted into Firebase.gs should be revoked in the Firebase console once this
 * is working - anyone who has ever seen that file has full admin on the project.
 */

var FB_URL = 'https://sjmc-maintenance-system-default-rtdb.firebaseio.com';

/** OAuth token for the service account, cached until shortly before it expires. */
function getFirebaseToken_() {
  var cache = CacheService.getScriptCache();
  var cached = cache.get('FB_TOKEN');
  if (cached) return cached;

  var raw = PropertiesService.getScriptProperties().getProperty('FIREBASE_SERVICE_ACCOUNT');
  if (!raw) {
    throw new Error('FIREBASE_SERVICE_ACCOUNT script property is not set - see firebaseAuth.gs');
  }

  var account = JSON.parse(raw);
  var now = Math.floor(Date.now() / 1000);
  var claims = {
    iss: account.client_email,
    scope: 'https://www.googleapis.com/auth/firebase.database https://www.googleapis.com/auth/userinfo.email',
    aud: 'https://oauth2.googleapis.com/token',
    exp: now + 3600,
    iat: now
  };

  var header = Utilities.base64EncodeWebSafe(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  var body = Utilities.base64EncodeWebSafe(JSON.stringify(claims));
  var signature = Utilities.computeRsaSha256Signature(header + '.' + body, account.private_key);
  var jwt = header + '.' + body + '.' + Utilities.base64EncodeWebSafe(signature);

  var response = UrlFetchApp.fetch('https://oauth2.googleapis.com/token', {
    method: 'post',
    payload: {
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt
    },
    muteHttpExceptions: true
  });

  var result = JSON.parse(response.getContentText());
  if (!result.access_token) {
    throw new Error('Could not get a Firebase token: ' + response.getContentText());
  }

  // Expires in an hour; re-fetch a little early.
  cache.put('FB_TOKEN', result.access_token, 3000);
  return result.access_token;
}

/**
 * One authenticated call against the database.
 * Returns { code, text, json }. Never throws on an HTTP error - callers check code.
 */
function fbFetch_(path, options) {
  options = options || {};
  var params = {
    method: options.method || 'get',
    muteHttpExceptions: true,
    headers: { Authorization: 'Bearer ' + getFirebaseToken_() }
  };
  if (options.payload !== undefined) {
    params.contentType = 'application/json';
    params.payload = JSON.stringify(options.payload);
  }

  var response = UrlFetchApp.fetch(FB_URL + path + '.json', params);
  var text = response.getContentText();
  var json = null;
  try { json = text && text !== 'null' ? JSON.parse(text) : null; } catch (e) { json = null; }

  return { code: response.getResponseCode(), text: text, json: json };
}

function fbGet_(path) { return fbFetch_(path, { method: 'get' }); }
function fbPost_(path, payload) { return fbFetch_(path, { method: 'post', payload: payload }); }
function fbPatch_(path, payload) { return fbFetch_(path, { method: 'patch', payload: payload }); }
function fbPut_(path, payload) { return fbFetch_(path, { method: 'put', payload: payload }); }
function fbDelete_(path) { return fbFetch_(path, { method: 'delete' }); }

/** Run this after setup to confirm the token works. */
function testFirebaseAuth() {
  try {
    var read = fbGet_('/tickets');
    Logger.log('Read /tickets -> HTTP ' + read.code +
      (read.code === 200 ? ' (' + Object.keys(read.json || {}).length + ' tickets) OK' : ' FAILED: ' + read.text));

    var staff = fbGet_('/staff');
    Logger.log('Read /staff -> HTTP ' + staff.code + (staff.code === 200 ? ' OK' : ' FAILED: ' + staff.text));

    if (read.code === 200 && staff.code === 200) {
      Logger.log('✅ Firebase authentication is working.');
      return true;
    }
    Logger.log('❌ Authentication is not working yet.');
    return false;
  } catch (error) {
    Logger.log('❌ ' + error);
    return false;
  }
}
