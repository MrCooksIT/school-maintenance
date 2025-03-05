// src/services/notificationService.js
import { ref, push, get, update } from 'firebase/database';
import { database } from '@/config/firebase';

/**
 * Service to handle sending notifications to users
 */
const NotificationService = {
  /**
   * Send a notification related to a paused ticket
   * @param {Object} ticketData The ticket data
   * @param {Object} pauseData The pause reason data
   * @param {string} staffId ID of the staff member who paused the ticket
   * @returns {Promise<boolean>} Success status
   */
  async sendPauseNotification(ticketData, pauseData, staffId) {
    try {
      if (!ticketData || !pauseData) {
        console.error('Missing ticket or pause data for notification');
        return false;
      }

      // Get staff details
      const staffRef = ref(database, `staff/${staffId}`);
      const staffSnapshot = await get(staffRef);
      const staffData = staffSnapshot.exists() ? staffSnapshot.val() : null;
      const staffName = staffData ? staffData.name : 'A staff member';

      // Determine recipients based on pause reason
      const recipients = [];

      // Always notify supervisor if requested
      if (pauseData.notifySupervisor) {
        recipients.push({
          role: 'supervisor',
          id: 'supervisor',  // You'd use actual supervisor ID in production
        });
      }

      // For procurement-related pauses, always notify estate manager
      if (pauseData.category === 'procurement') {
        recipients.push({
          role: 'estate_manager',
          id: 'estate_manager',  // You'd use actual estate manager ID in production
        });
      }

      // For budget approval, notify finance team
      if (pauseData.reasonCode === 'budget_approval') {
        recipients.push({
          role: 'finance',
          id: 'finance_manager',  // You'd use actual finance manager ID in production
        });
      }

      // Create notification for each recipient
      for (const recipient of recipients) {
        await this.createNotification({
          userId: recipient.id,
          userRole: recipient.role,
          title: 'Ticket Paused',
          message: `Ticket #${ticketData.ticketId} has been paused by ${staffName} - ${pauseData.reason}`,
          type: 'ticket_paused',
          ticketId: ticketData.id,
          ticketNumber: ticketData.ticketId,
          priority: ticketData.priority,
          pauseReason: pauseData.reason,
          pauseCategory: pauseData.category,
          estimatedDuration: pauseData.estimatedDuration,
          createdAt: new Date().toISOString(),
          read: false
        });
      }

      // Add notification info to ticket history
      const ticketHistoryRef = ref(database, `tickets/${ticketData.id}/statusHistory`);
      await push(ticketHistoryRef, {
        status: 'paused',
        timestamp: new Date().toISOString(),
        by: staffId,
        reason: pauseData.reason,
        notificationsSent: recipients.length > 0 ? recipients.map(r => r.role).join(', ') : 'None'
      });

      // Update ticket with pause information
      const ticketRef = ref(database, `tickets/${ticketData.id}`);
      await update(ticketRef, {
        pauseReason: pauseData.reason,
        pauseData: pauseData,
        lastUpdated: new Date().toISOString(),
        notificationsSent: true
      });

      return true;
    } catch (error) {
      console.error('Error sending pause notification:', error);
      return false;
    }
  },

  /**
   * Create a notification in the database
   * @param {Object} notificationData The notification data
   * @returns {Promise<string|null>} The notification ID or null on error
   */
  async createNotification(notificationData) {
    try {
      const notificationsRef = ref(database, 'notifications');
      const newNotificationRef = await push(notificationsRef, notificationData);
      return newNotificationRef.key;
    } catch (error) {
      console.error('Error creating notification:', error);
      return null;
    }
  },

  /**
   * Get all notifications for a user
   * @param {string} userId The user ID
   * @returns {Promise<Array>} Array of notifications
   */
  async getUserNotifications(userId) {
    try {
      const notificationsRef = ref(database, 'notifications');
      const snapshot = await get(notificationsRef);
      
      if (!snapshot.exists()) {
        return [];
      }

      // Filter notifications for this user and sort by date (newest first)
      return Object.entries(snapshot.val())
        .filter(([_, notification]) => notification.userId === userId)
        .map(([id, data]) => ({
          id,
          ...data
        }))
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    } catch (error) {
      console.error('Error getting user notifications:', error);
      return [];
    }
  },

  /**
   * Mark a notification as read
   * @param {string} notificationId The notification ID
   * @returns {Promise<boolean>} Success status
   */
  async markNotificationAsRead(notificationId) {
    try {
      const notificationRef = ref(database, `notifications/${notificationId}`);
      await update(notificationRef, {
        read: true,
        readAt: new Date().toISOString()
      });
      return true;
    } catch (error) {
      console.error('Error marking notification as read:', error);
      return false;
    }
  }
};

export default NotificationService;