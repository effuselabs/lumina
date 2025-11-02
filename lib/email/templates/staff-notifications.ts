/**
 * Staff Notification Email Templates
 * Sent to staff members about bookings and cancellations
 */

export interface StaffBookingAlertData {
  staffName: string;
  clientName: string;
  clientPhone?: string;
  clientEmail?: string;
  appointmentDate: string;
  appointmentTime: string;
  serviceName: string;
  servicePrice: string;
  specialRequests?: string;
  businessName: string;
  viewAppointmentLink: string;
  businessLogoUrl?: string;
  primaryColor?: string;
}

export interface StaffCancellationAlertData {
  staffName: string;
  clientName: string;
  appointmentDate: string;
  appointmentTime: string;
  serviceName: string;
  cancellationReason?: string;
  businessName: string;
  viewScheduleLink: string;
  businessLogoUrl?: string;
  primaryColor?: string;
}

export interface DailyBookingSummaryData {
  recipientName: string;
  date: string;
  totalAppointments: number;
  totalRevenue: string;
  appointments: Array<{
    time: string;
    clientName: string;
    serviceName: string;
    staffName: string;
    price: string;
  }>;
  businessName: string;
  viewDashboardLink: string;
  businessLogoUrl?: string;
  primaryColor?: string;
}

export const staffBookingAlertHtml = (data: StaffBookingAlertData): string => `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>New Booking Alert</title>
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
    .badge {
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
    .booking-box {
      background-color: #f0f8ff;
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
    .special-requests {
      background-color: #fff8e1;
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
      <h1 class="header-title">New Booking!</h1>
      <div class="badge">Staff Alert</div>
    </div>
    
    <div class="content">
      <p class="greeting">Hi ${data.staffName},</p>
      
      <p>You have a new appointment booking!</p>
      
      <div class="booking-box">
        <div class="detail-row">
          <span class="detail-label">Client</span>
          <span class="detail-value">${data.clientName}</span>
        </div>
        ${
          data.clientPhone
            ? `
        <div class="detail-row">
          <span class="detail-label">Phone</span>
          <span class="detail-value">${data.clientPhone}</span>
        </div>
        `
            : ''
        }
        ${
          data.clientEmail
            ? `
        <div class="detail-row">
          <span class="detail-label">Email</span>
          <span class="detail-value">${data.clientEmail}</span>
        </div>
        `
            : ''
        }
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
          <span class="detail-label">Price</span>
          <span class="detail-value">${data.servicePrice}</span>
        </div>
      </div>
      
      ${
        data.specialRequests
          ? `
      <div class="special-requests">
        <strong>Special Requests:</strong><br>
        ${data.specialRequests}
      </div>
      `
          : ''
      }
      
      <center>
        <a href="${data.viewAppointmentLink}" class="button">View Appointment</a>
      </center>
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

export const staffBookingAlertText = (data: StaffBookingAlertData): string => `
New Booking Alert!

Hi ${data.staffName},

You have a new appointment booking!

APPOINTMENT DETAILS
-------------------
Client: ${data.clientName}
${data.clientPhone ? `Phone: ${data.clientPhone}` : ''}
${data.clientEmail ? `Email: ${data.clientEmail}` : ''}
Service: ${data.serviceName}
Date: ${data.appointmentDate}
Time: ${data.appointmentTime}
Price: ${data.servicePrice}

${
  data.specialRequests
    ? `
SPECIAL REQUESTS
----------------
${data.specialRequests}
`
    : ''
}

VIEW APPOINTMENT
----------------
${data.viewAppointmentLink}

---
This email was sent by ${data.businessName}
Powered by Lumina - https://uselumina.app
`;

export const staffCancellationAlertHtml = (
  data: StaffCancellationAlertData
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
    .badge {
      display: inline-block;
      background-color: rgba(255, 255, 255, 0.1);
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
      <div class="badge">Staff Alert</div>
    </div>
    
    <div class="content">
      <p class="greeting">Hi ${data.staffName},</p>
      
      <p>An appointment has been cancelled. This time slot is now available.</p>
      
      <div class="cancellation-box">
        <div class="detail-row">
          <span class="detail-label">Client</span>
          <span class="detail-value">${data.clientName}</span>
        </div>
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
      
      <center>
        <a href="${data.viewScheduleLink}" class="button">View Schedule</a>
      </center>
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

export const staffCancellationAlertText = (
  data: StaffCancellationAlertData
): string => `
Appointment Cancelled - Staff Alert

Hi ${data.staffName},

An appointment has been cancelled. This time slot is now available.

CANCELLED APPOINTMENT
---------------------
Client: ${data.clientName}
Service: ${data.serviceName}
Date: ${data.appointmentDate}
Time: ${data.appointmentTime}

${
  data.cancellationReason
    ? `
CANCELLATION REASON
-------------------
${data.cancellationReason}
`
    : ''
}

VIEW SCHEDULE
-------------
${data.viewScheduleLink}

---
This email was sent by ${data.businessName}
Powered by Lumina - https://uselumina.app
`;

export const dailyBookingSummaryHtml = (
  data: DailyBookingSummaryData
): string => `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Daily Booking Summary</title>
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
    .stats-row {
      display: flex;
      justify-content: space-around;
      margin-top: 20px;
    }
    .stat-box {
      background-color: rgba(255, 255, 255, 0.2);
      padding: 15px 25px;
      border-radius: 8px;
      text-align: center;
    }
    .stat-value {
      font-size: 32px;
      font-weight: 700;
      color: #ffffff;
      margin: 0;
    }
    .stat-label {
      font-size: 14px;
      color: rgba(255, 255, 255, 0.9);
      margin: 5px 0 0 0;
    }
    .content {
      padding: 40px 30px;
    }
    .greeting {
      font-size: 18px;
      color: #333333;
      margin-bottom: 20px;
    }
    .appointment-list {
      margin: 30px 0;
    }
    .appointment-item {
      background-color: #f9f9f9;
      padding: 15px;
      margin-bottom: 10px;
      border-radius: 6px;
      border-left: 4px solid ${data.primaryColor || '#FFD25A'};
    }
    .appointment-time {
      font-weight: 700;
      color: ${data.primaryColor || '#FF7A5A'};
      font-size: 16px;
    }
    .appointment-details {
      margin-top: 8px;
      color: #666666;
      font-size: 14px;
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
      .stats-row {
        flex-direction: column;
      }
      .stat-box {
        margin-bottom: 10px;
      }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      ${data.businessLogoUrl ? `<img src="${data.businessLogoUrl}" alt="${data.businessName}" class="logo">` : ''}
      <h1 class="header-title">Daily Booking Summary</h1>
      <p style="color: rgba(255, 255, 255, 0.9); margin: 10px 0 0 0;">${data.date}</p>
      
      <div class="stats-row">
        <div class="stat-box">
          <p class="stat-value">${data.totalAppointments}</p>
          <p class="stat-label">Appointments</p>
        </div>
        <div class="stat-box">
          <p class="stat-value">${data.totalRevenue}</p>
          <p class="stat-label">Revenue</p>
        </div>
      </div>
    </div>
    
    <div class="content">
      <p class="greeting">Hi ${data.recipientName},</p>
      
      <p>Here's your daily booking summary for ${data.date}.</p>
      
      <div class="appointment-list">
        ${data.appointments
          .map(
            (apt) => `
        <div class="appointment-item">
          <div class="appointment-time">${apt.time}</div>
          <div class="appointment-details">
            <strong>${apt.clientName}</strong> • ${apt.serviceName}<br>
            Staff: ${apt.staffName} • ${apt.price}
          </div>
        </div>
        `
          )
          .join('')}
      </div>
      
      <center>
        <a href="${data.viewDashboardLink}" class="button">View Dashboard</a>
      </center>
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

export const dailyBookingSummaryText = (
  data: DailyBookingSummaryData
): string => `
Daily Booking Summary - ${data.date}

Hi ${data.recipientName},

Here's your daily booking summary for ${data.date}.

SUMMARY
-------
Total Appointments: ${data.totalAppointments}
Total Revenue: ${data.totalRevenue}

APPOINTMENTS
------------
${data.appointments
  .map(
    (apt) =>
      `${apt.time} - ${apt.clientName}
  Service: ${apt.serviceName}
  Staff: ${apt.staffName}
  Price: ${apt.price}`
  )
  .join('\n\n')}

VIEW DASHBOARD
--------------
${data.viewDashboardLink}

---
This email was sent by ${data.businessName}
Powered by Lumina - https://uselumina.app
`;
