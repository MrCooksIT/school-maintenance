/**
 * firebaseData.gs - the single set of database functions for the maintenance script.
 *
 * REPLACES simplified-firebase.gs entirely, and the duplicate copies scattered
 * across the other files. Apps Script concatenates every file and the LAST
 * definition of a function wins, so having three different getTicketsFromFirebase
 * implementations means nobody can tell which one actually runs. Delete the old
 * ones (list at the bottom of this file) or this will not take effect.
 *
 * Everything here goes through fbGet_/fbPatch_/etc in firebaseAuth.gs, so it is
 * authenticated and unaffected by the security rules.
 */

/**
 * Create a ticket.
 *
 * Falls back to an unauthenticated post if the service account is not set up.
 * The rules still allow an anonymous create as long as the payload looks like a
 * real request from a school address, and dropping a reported fault on the floor
 * would be worse than the fallback.
 */
function createTicketInFirebase(ticketData) {
  try {
    var result = fbPost_('/tickets', ticketData);
    if (result.code >= 200 && result.code < 300) {
      Logger.log('✅ Ticket created: ' + ticketData.ticketId + ' -> ' + result.json.name);
      return result.json.name;
    }
    Logger.log('❌ Authenticated create failed (' + result.code + '): ' + result.text);
  } catch (error) {
    Logger.log('⚠️ No Firebase auth available (' + error + '), falling back to anonymous create.');
  }

  try {
    var response = UrlFetchApp.fetch(FB_URL + '/tickets.json', {
      method: 'post',
      contentType: 'application/json',
      payload: JSON.stringify(ticketData),
      muteHttpExceptions: true
    });
    if (response.getResponseCode() >= 200 && response.getResponseCode() < 300) {
      var key = JSON.parse(response.getContentText()).name;
      Logger.log('✅ Ticket created anonymously: ' + ticketData.ticketId + ' -> ' + key);
      return key;
    }
    Logger.log('❌ Anonymous create failed (' + response.getResponseCode() + '): ' + response.getContentText());
    return null;
  } catch (error) {
    Logger.log('❌ Error creating ticket: ' + error);
    return null;
  }
}

/** Every ticket, keyed by Firebase key. Returns {} on failure so callers can loop safely. */
function getTicketsFromFirebase(filters) {
  try {
    var result = fbGet_('/tickets');
    if (result.code !== 200) {
      Logger.log('❌ Could not read tickets (' + result.code + '): ' + result.text);
      return {};
    }
    var tickets = result.json || {};
    Logger.log('Retrieved ' + Object.keys(tickets).length + ' tickets');
    return (filters && Object.keys(filters).length) ? applyFiltersToTickets(tickets, filters) : tickets;
  } catch (error) {
    Logger.log('❌ Error getting tickets: ' + error);
    return {};
  }
}

/** One ticket by its Firebase key. */
function getTicketFromFirebase(ticketKey) {
  try {
    var result = fbGet_('/tickets/' + ticketKey);
    if (result.code !== 200) {
      Logger.log('❌ Could not read ticket ' + ticketKey + ' (' + result.code + '): ' + result.text);
      return null;
    }
    return result.json;
  } catch (error) {
    Logger.log('❌ Error getting ticket ' + ticketKey + ': ' + error);
    return null;
  }
}

/** Merge fields into a ticket. This is what marks notifications as sent. */
function updateTicketInFirebase(ticketKey, updateData) {
  try {
    var result = fbPatch_('/tickets/' + ticketKey, updateData);
    if (result.code === 200) return true;
    Logger.log('❌ Could not update ticket ' + ticketKey + ' (' + result.code + '): ' + result.text);
    return false;
  } catch (error) {
    Logger.log('❌ Error updating ticket ' + ticketKey + ': ' + error);
    return false;
  }
}

function deleteTicketFromFirebase(ticketKey) {
  try {
    var result = fbDelete_('/tickets/' + ticketKey);
    if (result.code >= 200 && result.code < 300) return true;
    Logger.log('❌ Could not delete ticket ' + ticketKey + ' (' + result.code + ')');
    return false;
  } catch (error) {
    Logger.log('❌ Error deleting ticket ' + ticketKey + ': ' + error);
    return false;
  }
}

/** Staff record by its key. Used for assignee names and WhatsApp numbers. */
function getStaffDetails(staffId) {
  try {
    var result = fbGet_('/staff/' + staffId);
    if (result.code !== 200) {
      Logger.log('❌ Could not read staff ' + staffId + ' (' + result.code + '): ' + result.text);
      return null;
    }
    return result.json;
  } catch (error) {
    Logger.log('❌ Error getting staff details: ' + error);
    return null;
  }
}

/** Kept so existing callers keep working. */
function updateTicketDirectly(ticketKey, updateData) {
  return updateTicketInFirebase(ticketKey, updateData);
}

/** In-memory sort/limit, unchanged behaviour from the old file. */
function applyFiltersToTickets(allTickets, filters) {
  try {
    if (!allTickets || !Object.keys(allTickets).length) return {};
    var rows = Object.keys(allTickets).map(function (key) { return [key, allTickets[key]]; });

    if (filters.equalTo !== undefined && filters.orderBy) {
      rows = rows.filter(function (row) { return row[1][filters.orderBy] === filters.equalTo; });
    }

    if (filters.orderBy) {
      rows.sort(function (a, b) {
        var x = a[1][filters.orderBy] || '';
        var y = b[1][filters.orderBy] || '';
        if (typeof x === 'string' && x.indexOf('T') !== -1 && typeof y === 'string' && y.indexOf('T') !== -1) {
          return new Date(y) - new Date(x);
        }
        if (x < y) return 1;
        if (x > y) return -1;
        return 0;
      });
    }

    if (filters.limitToLast && rows.length > filters.limitToLast) {
      rows = rows.slice(0, filters.limitToLast);
    }

    var out = {};
    rows.forEach(function (row) { out[row[0]] = row[1]; });
    return out;
  } catch (error) {
    Logger.log('❌ Error applying filters: ' + error);
    return allTickets;
  }
}

/**
 * DELETE THESE OLD COPIES once this file is in place, or they may override it:
 *
 *   simplified-firebase.gs  - delete the whole file
 *
 *   code.gs                 - getTicketsFromFirebase
 *                           - getTicketsUsingServiceAccount
 *                           - getStaffDetails
 *                           - the SECOND formatDate (the file defines it twice)
 *
 *   notification-system.gs  - getTicketsFromFirebase
 *                           - getTicketFromFirebase
 *                           - getStaffDetails
 *                           - updateTicketDirectly
 *
 * Then run testFirebaseAuth(), then testStatusNotifications().
 */
