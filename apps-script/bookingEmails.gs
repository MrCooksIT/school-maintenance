/**
 * bookingEmails.gs - emails booking notifications from the school mailbox.
 *
 * The web app runs on the free Spark plan, so there are no Cloud Functions to
 * send mail on a database trigger. Instead this runs on a one-minute time
 * trigger, picks up any bookingNotifications entry with emailSent false, sends
 * it, and flips the flag. Delivery is therefore "within a minute of the event"
 * rather than instant.
 *
 * Paste this into the existing Apps Script project (the one with Firebase.gs -
 * it reuses getAccessToken() from there), then run setupBookingEmailTrigger()
 * once. See docs/BOOKINGS.md.
 *
 * Anyone can opt out without a code change by setting
 *   users/{uid}/notificationPreferences/email = false
 */

var FIREBASE_DB = 'https://sjmc-maintenance-system-default-rtdb.firebaseio.com';
var FROM_NAME = 'SJMC Bookings';
var APP_URL = 'https://mrcooksit.github.io/school-maintenance/#/bookings/mine';
var APPROVALS_URL = 'https://mrcooksit.github.io/school-maintenance/#/bookings/approvals';

/** Run once to install the trigger. Safe to re-run - it clears its own duplicates. */
function setupBookingEmailTrigger() {
  ScriptApp.getProjectTriggers().forEach(function (trigger) {
    if (trigger.getHandlerFunction() === 'sendPendingBookingEmails') {
      ScriptApp.deleteTrigger(trigger);
    }
  });
  ScriptApp.newTrigger('sendPendingBookingEmails')
    .timeBased()
    .everyMinutes(1)
    .create();
  Logger.log('Booking email trigger installed (every minute).');
}

function firebaseGet_(path) {
  var url = FIREBASE_DB + path + '.json?access_token=' + getAccessToken();
  var response = UrlFetchApp.fetch(url, { muteHttpExceptions: true });
  if (response.getResponseCode() !== 200) {
    throw new Error('Firebase read failed for ' + path + ': ' + response.getContentText());
  }
  var text = response.getContentText();
  return text === 'null' ? null : JSON.parse(text);
}

function firebasePatch_(path, payload) {
  var url = FIREBASE_DB + path + '.json?access_token=' + getAccessToken();
  var response = UrlFetchApp.fetch(url, {
    method: 'patch',
    contentType: 'application/json',
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  });
  if (response.getResponseCode() !== 200) {
    throw new Error('Firebase write failed for ' + path + ': ' + response.getContentText());
  }
}

var SUBJECTS = {
  booking_pending: 'Booking needs your sign-off',
  booking_approved: 'Your booking is confirmed',
  booking_declined: 'Your booking was declined',
  booking_cancelled: 'A booking was cancelled',
  booking_amended: 'A booking was moved',
  booking_updated: 'Booking details changed'
};

function buildBody_(notification, isApprover) {
  var link = isApprover ? APPROVALS_URL : APP_URL;
  return [
    '<p>' + escapeHtml_(notification.title) + '</p>',
    notification.message ? '<p><strong>' + escapeHtml_(notification.message) + '</strong></p>' : '',
    '<p><a href="' + link + '">Open the booking system</a></p>',
    '<hr>',
    '<p style="color:#888;font-size:12px">',
    'Sent automatically by the SJMC booking system. ',
    'To stop these emails, ask IT to switch them off for your account.',
    '</p>'
  ].join('');
}

function escapeHtml_(value) {
  return String(value == null ? '' : value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

/** The trigger target. Sends anything still unsent, oldest first. */
function sendPendingBookingEmails() {
  var inboxes = firebaseGet_('/bookingNotifications');
  if (!inboxes) return;

  var users = firebaseGet_('/users') || {};
  var sent = 0;
  var skipped = 0;

  Object.keys(inboxes).forEach(function (uid) {
    var user = users[uid];
    if (!user || !user.email) {
      skipped++;
      return;
    }

    // Per-user opt out, no code change needed.
    if (user.notificationPreferences && user.notificationPreferences.email === false) {
      skipped++;
      return;
    }

    var notifications = inboxes[uid] || {};
    Object.keys(notifications).forEach(function (id) {
      var notification = notifications[id];
      if (!notification || notification.emailSent) return;

      // Do not email out a backlog if the trigger has been off for a while.
      var age = Date.now() - new Date(notification.createdAt).getTime();
      if (!(age < 24 * 60 * 60 * 1000)) {
        firebasePatch_('/bookingNotifications/' + uid + '/' + id, { emailSent: true, emailSkipped: 'too old' });
        skipped++;
        return;
      }

      var isApprover = notification.type === 'booking_pending' || notification.type === 'booking_updated';

      try {
        MailApp.sendEmail({
          to: user.email,
          subject: SUBJECTS[notification.type] || 'SJMC booking update',
          htmlBody: buildBody_(notification, isApprover),
          name: FROM_NAME
        });
        firebasePatch_('/bookingNotifications/' + uid + '/' + id, {
          emailSent: true,
          emailSentAt: new Date().toISOString()
        });
        sent++;
      } catch (error) {
        // Leave emailSent false so the next run retries.
        Logger.log('Email failed for ' + user.email + ': ' + error);
      }
    });
  });

  if (sent || skipped) Logger.log('Booking emails sent: ' + sent + ', skipped: ' + skipped);
}
