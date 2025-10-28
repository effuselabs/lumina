/**
 * Booking Confirmation Email Template
 * Sent immediately after a client books an appointment
 */

export interface BookingConfirmationData {
  clientName: string;
  appointmentDate: string;
  appointmentTime: string;
  serviceName: string;
  servicePrice: string;
  staffName: string;
  businessName: string;
  businessAddress: string;
  businessPhone?: string;
  cancellationLink: string;
  businessLogoUrl?: string;
  primaryColor?: string;
}

export const bookingConfirmationHtml = (data: BookingConfirmationData): string => `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Booking Confirmation</title>
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
    .content {
      padding: 40px 30px;
    }
    .greeting {
      font-size: 18px;
      color: #333333;
      margin-bottom: 20px;
    }
    .confirmation-box {
      background-color: #f9f9f9;
      border-left: 4px solid ${data.primaryColor || '#FFD25A'};
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
      <h1 class="header-title">Booking Confirmed!</h1>
    </div>
    
    <div class="content">
      <p class="greeting">Hi ${data.clientName},</p>
      
      <p>Great news! Your appointment has been confirmed. We're looking forward to seeing you!</p>
      
      <div class="confirmation-box">
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
        <div class="detail-row">
          <span class="detail-label">Price</span>
          <span class="detail-value">${data.servicePrice}</span>
        </div>
      </div>
      
      <p><strong>Location:</strong><br>
      ${data.businessName}<br>
      ${data.businessAddress}
      ${data.businessPhone ? `<br>Phone: ${data.businessPhone}` : ''}</p>
      
      <p>Need to make changes? You can cancel or reschedule your appointment:</p>
      
      <center>
        <a href="${data.cancellationLink}" class="button">Manage Appointment</a>
      </center>
      
      <p style="margin-top: 30px; color: #666666; font-size: 14px;">
        Please arrive 5-10 minutes early for your appointment. If you need to cancel, please do so at least 24 hours in advance.
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

export const bookingConfirmationText = (data: BookingConfirmationData): string => `
Booking Confirmed!

Hi ${data.clientName},

Great news! Your appointment has been confirmed. We're looking forward to seeing you!

APPOINTMENT DETAILS
-------------------
Service: ${data.serviceName}
Date: ${data.appointmentDate}
Time: ${data.appointmentTime}
Staff Member: ${data.staffName}
Price: ${data.servicePrice}

LOCATION
--------
${data.businessName}
${data.businessAddress}
${data.businessPhone ? `Phone: ${data.businessPhone}` : ''}

MANAGE YOUR APPOINTMENT
-----------------------
Need to make changes? Visit: ${data.cancellationLink}

Please arrive 5-10 minutes early for your appointment. If you need to cancel, please do so at least 24 hours in advance.

---
This email was sent by ${data.businessName}
Powered by Lumina - https://uselumina.app
`;
