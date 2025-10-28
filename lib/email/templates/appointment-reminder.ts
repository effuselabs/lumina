/**
 * Appointment Reminder Email Templates
 * Sent 24 hours and 2 hours before appointments
 */

export interface AppointmentReminderData {
  clientName: string;
  appointmentDate: string;
  appointmentTime: string;
  serviceName: string;
  staffName: string;
  businessName: string;
  businessAddress: string;
  businessPhone?: string;
  rescheduleLink: string;
  cancellationLink: string;
  reminderType: '24h' | '2h';
  businessLogoUrl?: string;
  primaryColor?: string;
}

export const appointmentReminderHtml = (data: AppointmentReminderData): string => {
  const timeframe = data.reminderType === '24h' ? '24 hours' : '2 hours';
  const urgency = data.reminderType === '2h' ? 'soon' : 'tomorrow';
  
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Appointment Reminder</title>
  <style>
    body {
      margin: 0;
      padding: 0;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      background-color: #f5f5f5;
      line-height: 1.6;
    }
    .container {
      max-width: 600px;
      margin: 0 auto;
      background-color: #ffffff;
    }
    .header {
      background: linear-gradient(135deg, ${data.primaryColor || '#FFD25A'} 0%, ${data.primaryColor || '#FF7A5A'} 100%);
      padding: 40px 20px;
      text-align: center;
    }
    .logo {
      max-width: 150px;
      height: auto;
      margin-bottom: 20px;
    }
    .header-title {
      color: #ffffff;
      font-size: 28px;
      font-weight: 600;
      margin: 0;
    }
    .reminder-badge {
      display: inline-block;
      background-color: rgba(255, 255, 255, 0.2);
      color: #ffffff;
      padding: 8px 16px;
      border-radius: 20px;
      font-size: 14px;
      margin-top: 10px;
    }
    .content {
      padding: 40px 30px;
    }
    .greeting {
      font-size: 18px;
      color: #333333;
      margin-bottom: 20px;
    }
    .reminder-box {
      background-color: #fff8e1;
      border: 2px solid ${data.primaryColor || '#FFD25A'};
      border-radius: 8px;
      padding: 25px;
      margin: 30px 0;
      text-align: center;
    }
    .reminder-time {
      font-size: 24px;
      font-weight: 700;
      color: #FF7A5A;
      margin-bottom: 10px;
    }
    .detail-row {
      display: flex;
      justify-content: space-between;
      padding: 12px 0;
      border-bottom: 1px solid #e0e0e0;
    }
    .detail-row:last-child {
      border-bottom: none;
    }
    .detail-label {
      font-weight: 600;
      color: #666666;
    }
    .detail-value {
      color: #333333;
      text-align: right;
    }
    .button-group {
      margin: 30px 0;
      text-align: center;
    }
    .button {
      display: inline-block;
      padding: 14px 28px;
      margin: 5px;
      text-decoration: none;
      border-radius: 6px;
      font-weight: 600;
      font-size: 14px;
    }
    .button-primary {
      background-color: ${data.primaryColor || '#FF7A5A'};
      color: #ffffff;
    }
    .button-secondary {
      background-color: #ffffff;
      color: ${data.primaryColor || '#FF7A5A'};
      border: 2px solid ${data.primaryColor || '#FF7A5A'};
    }
    .footer {
      background-color: #0B2B33;
      color: #ffffff;
      padding: 30px;
      text-align: center;
      font-size: 14px;
    }
    .footer-link {
      color: #FFD25A;
      text-decoration: none;
    }
    @media only screen and (max-width: 600px) {
      .content {
        padding: 30px 20px;
      }
      .button {
        display: block;
        margin: 10px 0;
      }
      .detail-row {
        flex-direction: column;
      }
      .detail-value {
        text-align: left;
        margin-top: 5px;
      }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      ${data.businessLogoUrl ? `<img src="${data.businessLogoUrl}" alt="${data.businessName}" class="logo">` : ''}
      <h1 class="header-title">Appointment Reminder</h1>
      <div class="reminder-badge">Coming up ${urgency}!</div>
    </div>
    
    <div class="content">
      <p class="greeting">Hi ${data.clientName},</p>
      
      <p>This is a friendly reminder about your upcoming appointment.</p>
      
      <div class="reminder-box">
        <div class="reminder-time">In ${timeframe}</div>
        <p style="margin: 0; color: #666666;">Don't forget your appointment!</p>
      </div>
      
      <div style="margin: 30px 0;">
        <div class="detail-row">
          <span class="detail-label">Service</span>
          <span class="detail-value">${data.serviceName}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Date</span>
          <span class="detail-value">${data.appointmentDate}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Time</span>
          <span class="detail-value">${data.appointmentTime}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Staff Member</span>
          <span class="detail-value">${data.staffName}</span>
        </div>
      </div>
      
      <p><strong>Location:</strong><br>
      ${data.businessName}<br>
      ${data.businessAddress}
      ${data.businessPhone ? `<br>Phone: ${data.businessPhone}` : ''}</p>
      
      <div class="button-group">
        <a href="${data.rescheduleLink}" class="button button-secondary">Reschedule</a>
        <a href="${data.cancellationLink}" class="button button-secondary">Cancel</a>
      </div>
      
      <p style="margin-top: 30px; color: #666666; font-size: 14px;">
        Please arrive 5-10 minutes early. If you need to cancel, please do so as soon as possible.
      </p>
    </div>
    
    <div class="footer">
      <p>This email was sent by ${data.businessName}</p>
      <p style="margin-top: 10px;">
        Powered by <a href="https://uselumina.app" class="footer-link">Lumina</a>
      </p>
      <p style="margin-top: 15px; font-size: 12px;">
        <a href="{{{unsubscribeLink}}}" class="footer-link">Unsubscribe from reminders</a>
      </p>
    </div>
  </div>
</body>
</html>
`;
};

export const appointmentReminderText = (data: AppointmentReminderData): string => {
  const timeframe = data.reminderType === '24h' ? '24 hours' : '2 hours';
  const urgency = data.reminderType === '2h' ? 'soon' : 'tomorrow';
  
  return `
Appointment Reminder - Coming up ${urgency}!

Hi ${data.clientName},

This is a friendly reminder about your upcoming appointment in ${timeframe}.

APPOINTMENT DETAILS
-------------------
Service: ${data.serviceName}
Date: ${data.appointmentDate}
Time: ${data.appointmentTime}
Staff Member: ${data.staffName}

LOCATION
--------
${data.businessName}
${data.businessAddress}
${data.businessPhone ? `Phone: ${data.businessPhone}` : ''}

NEED TO MAKE CHANGES?
---------------------
Reschedule: ${data.rescheduleLink}
Cancel: ${data.cancellationLink}

Please arrive 5-10 minutes early. If you need to cancel, please do so as soon as possible.

---
This email was sent by ${data.businessName}
Powered by Lumina - https://uselumina.app

Unsubscribe from reminders: {{{unsubscribeLink}}}
`;
};
