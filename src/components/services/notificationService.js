// src/services/notificationService.js
import { ref, push } from 'firebase/database';
import { database } from '@/config/firebase';

/**
 * Simplified notification service with only essential functionality
 */
const NotificationService = {
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
   * Send a simple notification about a paused ticket
   * @param {Object} ticketData The ticket data
   * @param {string} reason The pause reason
   * @param {string} category The pause category
   * @returns {Promise<boolean>} Success status
   */
  async sendSimplePauseNotification(ticketData, reason, category) {
    try {
      // Determine who should be notified
      const recipients = [];
      
      // For procurement, notify estate manager
      if (category === 'procurement') {
        recipients.push({
          role: 'estate_manager',
          id: 'estate_manager'
        });
      }
      
      // Always notify supervisor
      recipients.push({
        role: 'supervisor',
        id: 'supervisor'
      });
      
      // Create a notification for each recipient
      for (const recipient of recipients) {
        await this.createNotification({
          userId: recipient.id,
          userRole: recipient.role,
          title: 'Ticket Paused',
          message: `Ticket #${ticketData.ticketId} has been paused: ${reason}`,
          type: 'ticket_paused',
          ticketId: ticketData.id,
          ticketNumber: ticketData.ticketId,
          createdAt: new Date().toISOString(),
          read: false
        });
      }
      
      return true;
    } catch (error) {
      console.error('Error sending pause notification:', error);
      return false;
    }
  }
};

export default NotificationService;