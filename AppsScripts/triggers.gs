// triggers.gs
function setupMaintenanceSystemTriggers() {
  // First, clear any existing triggers
  const triggers = ScriptApp.getProjectTriggers();
  triggers.forEach(trigger => ScriptApp.deleteTrigger(trigger));
  
  // Set up email processing trigger (runs every 5 minutes)
  ScriptApp.newTrigger('onNewEmail')
    .timeBased()
    .everyMinutes(5)
    .create();
  
  // Daily status check (runs at 8 AM)
  ScriptApp.newTrigger('checkStatusChanges')
    .timeBased()
    .everyDays(1)
    .atHour(8)
    .create();
  
  // Daily reminder emails (runs at 9 AM)
  ScriptApp.newTrigger('sendReminderEmails')
    .timeBased()
    .everyDays(1)
    .atHour(9)
    .create();
    
  // Cleanup duplicate tickets (runs at midnight)
  ScriptApp.newTrigger('cleanupDuplicateTickets')
    .timeBased()
    .everyDays(1)
    .atHour(0)
    .create();
}