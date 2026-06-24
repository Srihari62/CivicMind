/**
 * @file src/features/reports/services/notification.service.ts
 * @description Notification service abstraction.
 * Provides placeholders for FCM notification integrations.
 */

export class NotificationService {
  /**
   * Notifies an officer when they are assigned to a report.
   */
  public static async notifyOfficerAssigned(
    officerId: string,
    reportId: string
  ): Promise<void> {
    console.info(
      `[Notification Service] Officer ${officerId} notified of assignment to report ${reportId}`
    );
  }

  /**
   * Notifies a citizen when the status of their report changes.
   */
  public static async notifyCitizenStatusChanged(
    citizenId: string,
    reportId: string,
    newStatus: string
  ): Promise<void> {
    console.info(
      `[Notification Service] Citizen ${citizenId} notified: Report ${reportId} is now ${newStatus}`
    );
  }

  /**
   * Notifies the admin when automatic assignment fails for a report.
   */
  public static async notifyAdminAssignmentFailed(
    reportId: string,
    department: string
  ): Promise<void> {
    console.info(
      `[Notification Service] Administrator notified: Automatic assignment failed for report ${reportId} (Department: ${department})`
    );
  }
}
export default NotificationService;
