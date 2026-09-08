/**
 * whatsappNotify.gs - WhatsApp message to the staff member who gets a job.
 *
 * Uses the Meta WhatsApp Business Cloud API directly. That is just an HTTPS
 * POST, so it runs here for free - no Cloud Functions, no Blaze plan, no card
 * on file. The earlier implementation lived in functions/index.js and could
 * never run, because the Cloud Functions API was never enabled on the project.
 *
 * This replaces the Twilio attempt, which could not have worked in production:
 * it used Twilio's shared sandbox number (every recipient has to send "join
 * <code>" first), and sent free-form text, which WhatsApp only permits within
 * 24 hours of the person messaging you. Business-initiated messages need an
 * approved template on every provider - there is no way around that.
 *
 * SETUP - Script Properties (Project Settings > Script Properties):
 *   WHATSAPP_TOKEN             permanent System User token
 *   WHATSAPP_PHONE_NUMBER_ID   from Meta > WhatsApp > API Setup
 *   WHATSAPP_TEMPLATE_NAME     optional, default "task_assigned"
 *   WHATSAPP_TEMPLATE_LANG     optional, default "en"
 *
 * Until those are set this does nothing and returns false, so assignment
 * emails carry on working. See docs/WHATSAPP_SETUP.md for the Meta side.
 */

var WHATSAPP_API_VERSION = 'v22.0';

function whatsappConfig_() {
  var props = PropertiesService.getScriptProperties();
  return {
    token: props.getProperty('WHATSAPP_TOKEN'),
    phoneNumberId: props.getProperty('WHATSAPP_PHONE_NUMBER_ID'),
    template: props.getProperty('WHATSAPP_TEMPLATE_NAME') || 'task_assigned',
    lang: props.getProperty('WHATSAPP_TEMPLATE_LANG') || 'en'
  };
}

/**
 * Template body parameters may not contain newlines, tabs, or four or more
 * consecutive spaces. Meta rejects the whole message if they do, so every
 * value is flattened and given a fallback rather than risking an empty param.
 */
function sanitizeParam_(value, fallback) {
  var text = String(value == null ? '' : value).replace(/\s+/g, ' ').trim();
  return text || fallback;
}

/** "+27 83 564 3990" -> "27835643990". Returns null if it cannot be trusted. */
function normalisePhone_(phone) {
  var digits = String(phone || '').replace(/\D/g, '');
  if (!digits) return null;
  if (digits.indexOf('0') === 0) digits = '27' + digits.slice(1); // local 0XX form
  // A South African mobile is 27 + 9 digits. Anything else is a data-entry error
  // and sending to it would either fail or reach a stranger.
  if (!/^27\d{9}$/.test(digits)) return null;
  return digits;
}

/**
 * Tell a staff member about a job they have just been given.
 * Returns true only if Meta accepted the message.
 */
function sendAssignmentWhatsApp(ticket, staffData, ticketKey) {
  var config = whatsappConfig_();

  if (!config.token || !config.phoneNumberId) {
    Logger.log('WhatsApp not configured yet - skipping (see whatsappNotify.gs).');
    return false;
  }
  if (!staffData) {
    Logger.log('WhatsApp skipped: no staff record.');
    return false;
  }
  if (staffData.notificationPreferences && staffData.notificationPreferences.whatsapp === false) {
    Logger.log('WhatsApp skipped: ' + staffData.name + ' has opted out.');
    return false;
  }

  var to = normalisePhone_(staffData.phone);
  if (!to) {
    Logger.log('WhatsApp skipped: no usable phone number for ' + (staffData.name || 'staff') +
               ' (got "' + staffData.phone + '")');
    return false;
  }

  var params = [
    sanitizeParam_(staffData.name, 'there'),
    sanitizeParam_(ticket.ticketId || ticketKey, 'a job'),
    sanitizeParam_(ticket.subject, 'Maintenance task'),
    sanitizeParam_(ticket.location, 'See the ticket for details'),
    sanitizeParam_(ticket.priority, 'medium')
  ];

  var url = 'https://graph.facebook.com/' + WHATSAPP_API_VERSION + '/' +
            config.phoneNumberId + '/messages';

  var response = UrlFetchApp.fetch(url, {
    method: 'post',
    contentType: 'application/json',
    headers: { Authorization: 'Bearer ' + config.token },
    muteHttpExceptions: true,
    payload: JSON.stringify({
      messaging_product: 'whatsapp',
      to: to,
      type: 'template',
      template: {
        name: config.template,
        language: { code: config.lang },
        components: [{
          type: 'body',
          parameters: params.map(function (text) { return { type: 'text', text: text }; })
        }]
      }
    })
  });

  var code = response.getResponseCode();
  var body = response.getContentText();
  var result = {};
  try { result = JSON.parse(body); } catch (e) { result = {}; }

  var record = {
    to: to,
    staffName: staffData.name || '',
    at: new Date().toISOString()
  };

  if (code >= 200 && code < 300 && result.messages && result.messages[0]) {
    record.status = 'sent';
    record.messageId = result.messages[0].id;
    Logger.log('WhatsApp sent to ' + staffData.name + ' (' + to + ')');
  } else {
    record.status = 'failed';
    record.error = (result.error && result.error.message) || ('HTTP ' + code + ': ' + body);
    Logger.log('WhatsApp FAILED for ' + staffData.name + ': ' + record.error);
  }

  // Write the outcome onto the ticket so a failure is visible in the data
  // rather than buried in an execution log nobody reads.
  if (ticketKey) {
    try {
      updateTicketInFirebase(ticketKey, { whatsappNotification: record });
    } catch (error) {
      Logger.log('Could not record WhatsApp result on the ticket: ' + error);
    }
  }

  return record.status === 'sent';
}

/**
 * Run this after the Meta setup to check the configuration and send yourself
 * one real message. Put your own number in first.
 */
function testWhatsAppConfig() {
  var config = whatsappConfig_();
  Logger.log('Token set: ' + !!config.token);
  Logger.log('Phone number ID set: ' + !!config.phoneNumberId);
  Logger.log('Template: ' + config.template + ' (' + config.lang + ')');

  if (!config.token || !config.phoneNumberId) {
    Logger.log('Not configured yet - set the Script Properties first.');
    return false;
  }

  var me = {
    name: 'Ayden',
    phone: '+27835643990',          // change to whoever is testing
    notificationPreferences: { whatsapp: true }
  };
  var pretendTicket = {
    ticketId: 'TEST-001',
    subject: 'Test message from the maintenance system',
    location: 'Admin Block',
    priority: 'low'
  };

  var ok = sendAssignmentWhatsApp(pretendTicket, me, null);
  Logger.log(ok ? 'Sent - check WhatsApp.' : 'Failed - see the log above.');
  return ok;
}
