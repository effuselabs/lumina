/**
 * Cancellation Notification Email Template
 * Sent when an appointment is cancelled
 */

export interface CancellationNotificationData {
  clientName: string;
  appointmentDate: string;
  appointmentTime: string;
  serviceName: string;
  staffName: string;
  businessName: string;
  businessAddress: string;
  businessPhone?: string;
  cancellationReason?: string;
  rebookLink: string;
  businessLogoUrl?: string;
  primaryColor?: string;
}

export const cancellationNotificationHtml = (
  data: CancellationNotificationData
): string => `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Appointment Cancelled</title>
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
      background-color: #0B2B33;
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
    .content {
      padding: 40px 30px;
    }
    .greeting {
      font-size: 18px;
      color: #333333;
      margin-bottom: 20px;
    }
    .cancellation-box {
      background-color: #fff3f3;
      border-left: 4px solid #d32f2f;
      padding: 20px;
      margin: 30px 0;
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
    .reason-box {
      background-color: #f9f9f9;
      padding: 15px;
      border-radius: 6px;
      margin: 20px 0;
    }
    .button {
      display: inline-block;
      padding: 14px 32px;
      background-color: ${data.primaryColor || '#FF7A5A'};
      color: #ffffff;
      text-decoration: none;
      border-radius: 6px;
      font-weight: 600;
      margin: 20px 0;
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
      <h1 class="header-title">Appointment Cancelled</h1>
    </div>
    
    <div class="content">
      <p class="greeting">Hi ${data.clientName},</p>
      
      <p>Your appointment has been cancelled. We're sorry we won't be seeing you this time.</p>
      
      <div class="cancellation-box">
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
      
      ${
        data.cancellationReason
          ? `
      <div class="reason-box">
        <strong>Cancellation Reason:</strong><br>
        ${data.cancellationReason}
      </div>
      `
          : ''
      }
      
      <p>We'd love to see you again! Book another appointment at your convenience:</p>
      
      <center>
        <a href="${data.rebookLink}" class="button">Book Again</a>
      </center>
      
      <p style="margin-top: 30px;">
        <strong>Contact Us:</strong><br>
        ${data.businessName}<br>
        ${data.businessAddress}
        ${data.businessPhone ? `<br>Phone: ${data.businessPhone}` : ''}
      </p>
    </div>
    
    <div class="footer">
      <p>This email was sent by ${data.businessName}</p>
      <p style="margin-top: 10px;">
        Powered by <a href="https://uselumina.app" class="footer-link">Lumina</a>
      </p>
    </div>
  </div>
</body>
</html>
`;

export const cancellationNotificationText = (
  data: CancellationNotificationData
): string => `
Appointment Cancelled

Hi ${data.clientName},

Your appointment has been cancelled. We're sorry we won't be seeing you this time.

CANCELLED APPOINTMENT
---------------------
Service: ${data.serviceName}
Date: ${data.appointmentDate}
Time: ${data.appointmentTime}
Staff Member: ${data.staffName}

${
  data.cancellationReason
    ? `
CANCELLATION REASON
-------------------
${data.cancellationReason}
`
    : ''
}

BOOK AGAIN
----------
We'd love to see you again! Book another appointment: ${data.rebookLink}

CONTACT US
----------
${data.businessName}
${data.businessAddress}
${data.businessPhone ? `Phone: ${data.businessPhone}` : ''}

---
This email was sent by ${data.businessName}
Powered by Lumina - https://uselumina.app
`;
