/**
 * maintenanceTools.gs - the occasional clean-up jobs, fixed.
 *
 * These replace a set of functions that could not run at all: they called
 * getTicketsDirect, deleteTicketDirect, comprehensiveDuplicateCleanup and
 * getFirebaseAuthToken, none of which exist in the project. One of them called
 * firebase.firestore.FieldValue.arrayUnion - a Firestore API, in a Realtime
 * Database project - which threw the moment it found anything to do.
 *
 * Everything here is authenticated (via firebaseAuth.gs) and DRY RUN BY DEFAULT.
 * Nothing is ever hard-deleted without first being copied to an archive node,
 * so a mistake is recoverable.
 *
 * Run these by hand from the editor when you need them. None are on a trigger,
 * and none should be - a job that deletes tickets should never run unattended.
 */

// Two tickets only count as duplicates if raised within this of each other.
// Without a window, a fault reported in March and again in September looks like
// a duplicate purely because the subject matches.
var DUPLICATE_WINDOW_DAYS = 7;

// ---------------------------------------------------------------------------
// Duplicate tickets
// ---------------------------------------------------------------------------

/**
 * Find tickets with the same subject from the same person, raised close together.
 *
 *   findDuplicateTickets()       - report only, changes nothing
 *   findDuplicateTickets(false)  - actually mark them
 *
 * Duplicates are MARKED, never deleted, so the team can see the grouping and
 * decide for themselves.
 */
function findDuplicateTickets(dryRun) {
  dryRun = (dryRun !== false);
  Logger.log(dryRun ? 'Duplicate scan (dry run - nothing will change)' : 'Duplicate scan (LIVE)');

  var tickets = getTicketsFromFirebase();
  var keys = Object.keys(tickets);
  if (!keys.length) {
    Logger.log('No tickets found - run testFirebaseAuth() first.');
    return { groups: 0, marked: 0 };
  }

  // Group by normalised subject + requester email.
  var groups = {};
  keys.forEach(function (key) {
    var ticket = tickets[key];
    if (!ticket || !ticket.subject || !ticket.requester || !ticket.requester.email) return;
    if (ticket.isDuplicate) return; // already handled
    var groupKey = String(ticket.subject).toLowerCase().trim() + '|' +
                   String(ticket.requester.email).toLowerCase();
    if (!groups[groupKey]) groups[groupKey] = [];
    groups[groupKey].push({ key: key, ticket: ticket, createdAt: new Date(ticket.createdAt || 0) });
  });

  var windowMs = DUPLICATE_WINDOW_DAYS * 24 * 60 * 60 * 1000;
  var groupsFound = 0;
  var marked = 0;

  Object.keys(groups).forEach(function (groupKey) {
    var group = groups[groupKey];
    if (group.length < 2) return;

    group.sort(function (a, b) { return b.createdAt - a.createdAt; });

    var primary = group[0];
    var duplicates = [];

    for (var i = 1; i < group.length; i++) {
      if ((primary.createdAt - group[i].createdAt) <= windowMs) {
        duplicates.push(group[i]);
      } else {
        // Far enough apart to be a genuine repeat report - start a new primary.
        primary = group[i];
      }
    }

    if (!duplicates.length) return;
    groupsFound++;

    Logger.log('');
    Logger.log('Group: ' + groupKey);
    Logger.log('  keep: ' + (primary.ticket.ticketId || primary.key) + '  (' + primary.ticket.createdAt + ')');

    duplicates.forEach(function (dup) {
      Logger.log('  dup:  ' + (dup.ticket.ticketId || dup.key) + '  (' + dup.ticket.createdAt + ')' +
                 (dryRun ? '  [would mark]' : ''));
      if (!dryRun && markTicketAsDuplicate_(dup.key, dup.ticket, primary.key)) marked++;
    });
  });

  Logger.log('');
  Logger.log('Groups with duplicates: ' + groupsFound + ', marked: ' + marked);
  if (dryRun && groupsFound) Logger.log('To apply: findDuplicateTickets(false)');
  return { groups: groupsFound, marked: marked };
}

/**
 * Mark one ticket as a duplicate of another. Preserves everything.
 *
 * The old version tried firebase.firestore.FieldValue.arrayUnion() to append to
 * statusHistory. That is a Firestore API and does not exist here. The Realtime
 * Database has no append operation, so: read, push, write the array back.
 */
function markTicketAsDuplicate_(duplicateKey, duplicateTicket, primaryKey) {
  var history = duplicateTicket.statusHistory || [];
  if (!(history instanceof Array)) history = [];

  history.push({
    status: 'duplicate',
    timestamp: new Date().toISOString(),
    by: 'system',
    note: 'Marked as duplicate of ' + primaryKey
  });

  var ok = updateTicketInFirebase(duplicateKey, {
    status: 'duplicate',
    isDuplicate: true,
    duplicateOf: primaryKey,
    skipNotifications: true, // do not email the requester about this
    lastUpdated: new Date().toISOString(),
    statusHistory: history
  });

  if (!ok) Logger.log('  could not mark ' + duplicateKey);
  return ok;
}

// ---------------------------------------------------------------------------
// System-noise tickets (Google failure notices that became tickets)
// ---------------------------------------------------------------------------

/**
 * Find tickets created from Google Apps Script failure emails.
 *
 *   findSystemNoiseTickets()       - report only
 *   findSystemNoiseTickets(false)  - archive, then remove
 *
 * shouldSkipEmail() now blocks these at the source, so this is only needed to
 * clear out ones created before that filter existed.
 */
function findSystemNoiseTickets(dryRun) {
  dryRun = (dryRun !== false);
  Logger.log(dryRun ? 'System-noise scan (dry run)' : 'System-noise scan (LIVE - will archive and remove)');

  var tickets = getTicketsFromFirebase();
  var keys = Object.keys(tickets);
  if (!keys.length) {
    Logger.log('No tickets found - run testFirebaseAuth() first.');
    return { found: 0, removed: 0 };
  }

  var noise = keys.filter(function (key) {
    var ticket = tickets[key];
    if (!ticket) return false;
    var email = String((ticket.requester && ticket.requester.email) || '').toLowerCase();
    var subject = String(ticket.subject || '').toLowerCase();
    return email.indexOf('noreply-apps-script') !== -1 ||
           email === 'noreply-apps-scripts-notifications@google.com' ||
           subject.indexOf('summary of failures for google apps script') !== -1;
  });

  Logger.log('Found ' + noise.length + ' of ' + keys.length + ' tickets that look like system noise.');

  var removed = 0;
  noise.forEach(function (key, index) {
    var ticket = tickets[key];
    Logger.log((index + 1) + '. ' + (ticket.ticketId || key) + ' | ' + ticket.subject +
               (dryRun ? '  [would remove]' : ''));
    if (!dryRun && archiveAndRemoveTicket_(key, ticket, 'system noise')) removed++;
  });

  Logger.log('');
  Logger.log('Removed: ' + removed);
  if (dryRun && noise.length) Logger.log('To apply: findSystemNoiseTickets(false)');
  return { found: noise.length, removed: removed };
}

/** Copy a ticket to archived_tickets, then remove it. Never deletes outright. */
function archiveAndRemoveTicket_(ticketKey, ticket, reason) {
  ticket.removedAt = new Date().toISOString();
  ticket.removedReason = reason;

  var archive = fbPut_('/archived_tickets/' + ticketKey, ticket);
  if (archive.code < 200 || archive.code >= 300) {
    Logger.log('  could not archive ' + ticketKey + ' - leaving it alone. ' + archive.text);
    return false;
  }

  if (!deleteTicketFromFirebase(ticketKey)) {
    Logger.log('  archived but could not remove ' + ticketKey);
    return false;
  }
  return true;
}

// ---------------------------------------------------------------------------
// Duplicate detection at intake
// ---------------------------------------------------------------------------

/**
 * Has this person already reported this, recently?
 *
 * Replaces the copy in email-processor.gs, which did an unauthenticated GET and
 * so always returned false once the database was locked down - meaning every
 * repeat email silently created another ticket.
 */
function checkForExistingTicket(senderEmail, subject) {
  try {
    var tickets = getTicketsFromFirebase();
    var cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - DUPLICATE_WINDOW_DAYS);

    var keys = Object.keys(tickets);
    for (var i = 0; i < keys.length; i++) {
      var ticket = tickets[keys[i]];
      if (!ticket || !ticket.requester || !ticket.subject) continue;
      if (String(ticket.requester.email).toLowerCase() !== String(senderEmail).toLowerCase()) continue;
      if (new Date(ticket.createdAt || 0) < cutoff) continue;
      if (isSimilarSubject(ticket.subject, subject)) return true;
    }
    return false;
  } catch (error) {
    Logger.log('Error checking for existing ticket: ' + error);
    return false; // never block a genuine report because this check failed
  }
}
