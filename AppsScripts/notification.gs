// notifications.gs - Automated notifications and status tracking
function checkStatusChanges() {
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
    if (!tickets) return;
    
    Object.entries(tickets).forEach(([key, ticket]) => {
      // Check for new assignments
      if (ticket.assignedTo && !ticket.notifiedAssignment) {
        handleNewAssignment(key, ticket);
      }

      // Check for overdue tickets
      if (ticket.status !== 'completed' && ticket.dueDate) {
        checkOverdueStatus(key, ticket);
      }

      // Check for inactive tickets
      if (ticket.status === 'in-progress') {
        checkInactiveTickets(key, ticket);
      }
    });
    
  } catch (error) {
    Logger.log("Error checking changes: " + error.toString());
  }
}
function handleNewAssignment(key, ticket) {
  try {
    // Get staff details from Firebase
    const staffData = getStaffDetails(ticket.assignedTo);
    if (!staffData) {
      Logger.log("No staff data found for ID: " + ticket.assignedTo);
      return;
    }
    
    // Send assignment notification with correct staff details
    sendAssignmentEmail(ticket, staffData);
    
    // Update ticket with notification status
    const updateUrl = `https://sjmc-maintenance-system-default-rtdb.firebaseio.com/tickets/${key}.json`;
    const updateData = {
      notifiedAssignment: true,
      lastNotification: new Date().toISOString(),
      assignedStaff: staffData // Store staff details with ticket
    };
    
    UrlFetchApp.fetch(updateUrl, {
      'method': 'PATCH',
      'contentType': 'application/json',
      'payload': JSON.stringify(updateData)
    });
    
    Logger.log("Assignment handled successfully for ticket: " + ticket.ticketId);
  } catch (error) {
    Logger.log("Error handling assignment: " + error);
  }
}
function checkOverdueStatus(key, ticket) {
  const today = new Date();
  const dueDate = new Date(ticket.dueDate);
  
  if (today > dueDate && !ticket.overdueNotified) {
    try {
      // Send overdue notification
      const updateUrl = `https://sjmc-maintenance-system-default-rtdb.firebaseio.com/tickets/${key}.json`;
      const updateData = {
        overdueNotified: true,
        lastNotification: new Date().toISOString(),
        status: 'overdue'
      };
      
      // Update ticket status
      UrlFetchApp.fetch(updateUrl, {
        'method': 'PATCH',
        'contentType': 'application/json',
        'payload': JSON.stringify(updateData)
      });

      // Send overdue notifications
      sendDueDateReminder(ticket, -1);
    } catch (error) {
      Logger.log("Error handling overdue ticket: " + error);
    }
  }
}
function checkInactiveTickets(key, ticket) {
  const now = new Date();
  const lastUpdated = new Date(ticket.lastUpdated);
  const daysSinceUpdate = Math.floor((now - lastUpdated) / (1000 * 60 * 60 * 24));
  
  // If ticket hasn't been updated in 3 days
  if (daysSinceUpdate >= 3 && !ticket.inactiveNotified) {
    try {
      const staffEmail = ticket.assignedTo ? `${ticket.assignedTo}@maristsj.co.za` : 'maintenance@maristsj.co.za';
      
      // Send inactive ticket reminder
      GmailApp.sendEmail(
        staffEmail,
        `Inactive Ticket Reminder - #${ticket.ticketId}`,
        `This ticket has not been updated in ${daysSinceUpdate} days. Please update the status or add a comment.`,
        {
          name: "School Maintenance System",
          cc: 'estate@maristsj.co.za'
        }
      );

      // Mark notification sent
      const updateUrl = `https://sjmc-maintenance-system-default-rtdb.firebaseio.com/tickets/${key}.json`;
      UrlFetchApp.fetch(updateUrl, {
        'method': 'PATCH',
        'contentType': 'application/json',
        'payload': JSON.stringify({
          inactiveNotified: true,
          lastNotification: new Date().toISOString()
        })
      });
    } catch (error) {
      Logger.log("Error handling inactive ticket: " + error);
    }
  }
}
function createTriggers() {
  const triggers = ScriptApp.getProjectTriggers();
  triggers.forEach(trigger => ScriptApp.deleteTrigger(trigger));
  
  // Create daily trigger for status checks
  ScriptApp.newTrigger('checkStatusChanges')
    .timeBased()
    .everyDays(1)
    .atHour(8)
    .create();
  
  // Create trigger for reminder emails
  ScriptApp.newTrigger('sendReminderEmails')
    .timeBased()
    .everyDays(1)
    .atHour(9)
    .create();
}