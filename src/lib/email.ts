// Email notification utilities
// In a production app, you would integrate with services like SendGrid, AWS SES, or Nodemailer

export interface EmailNotification {
  to: string;
  subject: string;
  body: string;
  html?: string;
}

export const sendEmailNotification = async (notification: EmailNotification): Promise<boolean> => {
  try {
    // Call our API route to send the email
    const response = await fetch('/api/send-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(notification),
    });

    const result = await response.json();
    return result.success;
  } catch (error) {
    console.error('Failed to send email notification:', error);
    return false;
  }
};

export const createMeetingReminderEmail = (
  attendeeEmail: string,
  meetingTitle: string,
  startTime: string,
  endTime: string,
  description?: string
): EmailNotification => {
  const startDate = new Date(startTime);
  const endDate = new Date(endTime);
  
  const subject = `Meeting Reminder: ${meetingTitle}`;
  
  const body = `
Hello,

This is a reminder that you have a meeting scheduled:

Meeting: ${meetingTitle}
Date: ${startDate.toLocaleDateString('en-US', { 
  weekday: 'long', 
  year: 'numeric', 
  month: 'long', 
  day: 'numeric' 
})}
Time: ${startDate.toLocaleTimeString('en-US', { 
  hour: 'numeric', 
  minute: '2-digit', 
  hour12: true 
})} - ${endDate.toLocaleTimeString('en-US', { 
  hour: 'numeric', 
  minute: '2-digit', 
  hour12: true 
})}
${description ? `Description: ${description}` : ''}

Please join the meeting on time.

Best regards,
SyncroSpace Team
  `.trim();

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #333;">Meeting Reminder</h2>
      <p>Hello,</p>
      <p>This is a reminder that you have a meeting scheduled:</p>
      
      <div style="background-color: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <h3 style="margin-top: 0; color: #2563eb;">${meetingTitle}</h3>
        <p><strong>Date:</strong> ${startDate.toLocaleDateString('en-US', { 
          weekday: 'long', 
          year: 'numeric', 
          month: 'long', 
          day: 'numeric' 
        })}</p>
        <p><strong>Time:</strong> ${startDate.toLocaleTimeString('en-US', { 
          hour: 'numeric', 
          minute: '2-digit', 
          hour12: true 
        })} - ${endDate.toLocaleTimeString('en-US', { 
          hour: 'numeric', 
          minute: '2-digit', 
          hour12: true 
        })}</p>
        ${description ? `<p><strong>Description:</strong> ${description}</p>` : ''}
      </div>
      
      <p>Please join the meeting on time.</p>
      <p>Best regards,<br>SyncroSpace Team</p>
    </div>
  `;

  return {
    to: attendeeEmail,
    subject,
    body,
    html,
  };
};

export const createMeetingInvitationEmail = (
  attendeeEmail: string,
  meetingTitle: string,
  startTime: string,
  endTime: string,
  inviterName: string,
  description?: string
): EmailNotification => {
  const startDate = new Date(startTime);
  const endDate = new Date(endTime);
  
  const subject = `Meeting Invitation: ${meetingTitle}`;
  
  const body = `
Hello,

You have been invited to a meeting:

Meeting: ${meetingTitle}
Date: ${startDate.toLocaleDateString('en-US', { 
  weekday: 'long', 
  year: 'numeric', 
  month: 'long', 
  day: 'numeric' 
})}
Time: ${startDate.toLocaleTimeString('en-US', { 
  hour: 'numeric', 
  minute: '2-digit', 
  hour12: true 
})} - ${endDate.toLocaleTimeString('en-US', { 
  hour: 'numeric', 
  minute: '2-digit', 
  hour12: true 
})}
Invited by: ${inviterName}
${description ? `Description: ${description}` : ''}

Please add this to your calendar.

Best regards,
SyncroSpace Team
  `.trim();

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #333;">Meeting Invitation</h2>
      <p>Hello,</p>
      <p>You have been invited to a meeting:</p>
      
      <div style="background-color: #e0f2fe; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #0284c7;">
        <h3 style="margin-top: 0; color: #0284c7;">${meetingTitle}</h3>
        <p><strong>Date:</strong> ${startDate.toLocaleDateString('en-US', { 
          weekday: 'long', 
          year: 'numeric', 
          month: 'long', 
          day: 'numeric' 
        })}</p>
        <p><strong>Time:</strong> ${startDate.toLocaleTimeString('en-US', { 
          hour: 'numeric', 
          minute: '2-digit', 
          hour12: true 
        })} - ${endDate.toLocaleTimeString('en-US', { 
          hour: 'numeric', 
          minute: '2-digit', 
          hour12: true 
        })}</p>
        <p><strong>Invited by:</strong> ${inviterName}</p>
        ${description ? `<p><strong>Description:</strong> ${description}</p>` : ''}
      </div>
      
      <p>Please add this to your calendar.</p>
      <p>Best regards,<br>SyncroSpace Team</p>
    </div>
  `;

  return {
    to: attendeeEmail,
    subject,
    body,
    html,
  };
};
