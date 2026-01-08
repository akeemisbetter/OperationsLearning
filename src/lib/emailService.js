import { supabase } from './supabase'

// Email templates
const templates = {
  enrollment: (learnerName, sessionTopic, sessionDate, trainerName) => ({
    subject: `You've been enrolled in: ${sessionTopic}`,
    body: `
Hi ${learnerName},

You have been enrolled in a training session.

Training: ${sessionTopic}
Date: ${sessionDate}
Trainer: ${trainerName}

Please log in to the HRP Learning Hub to view more details about this training.

Best regards,
HRP Learning Team
    `.trim()
  }),

  cancellation: (learnerName, sessionTopic, sessionDate, reason) => ({
    subject: `Training Cancelled: ${sessionTopic}`,
    body: `
Hi ${learnerName},

We regret to inform you that the following training has been cancelled:

Training: ${sessionTopic}
Original Date: ${sessionDate}
${reason ? `Reason: ${reason}` : ''}

We apologize for any inconvenience. Please contact your trainer for more information.

Best regards,
HRP Learning Team
    `.trim()
  }),

  reschedule: (learnerName, sessionTopic, oldDate, newDate, trainerName) => ({
    subject: `Training Rescheduled: ${sessionTopic}`,
    body: `
Hi ${learnerName},

The following training has been rescheduled:

Training: ${sessionTopic}
Previous Date: ${oldDate}
New Date: ${newDate}
Trainer: ${trainerName}

Please update your calendar accordingly.

Best regards,
HRP Learning Team
    `.trim()
  }),

  message: (learnerName, sessionTopic, trainerName, isPrivate) => ({
    subject: `New message from ${trainerName}: ${sessionTopic}`,
    body: `
Hi ${learnerName},

You have received a new ${isPrivate ? 'private ' : ''}message from ${trainerName} regarding your training: ${sessionTopic}

Please log in to the HRP Learning Hub to view the message.

Best regards,
HRP Learning Team
    `.trim()
  }),

  certificate: (learnerName, sessionTopic, certificateNumber) => ({
    subject: `Congratulations! Certificate Issued: ${sessionTopic}`,
    body: `
Hi ${learnerName},

Congratulations on completing your training!

Training: ${sessionTopic}
Certificate Number: ${certificateNumber}

You can download your certificate from the HRP Learning Hub.

Best regards,
HRP Learning Team
    `.trim()
  })
}

// Log notification to database (for future email sending via Edge Function or external service)
export const sendNotification = async (recipientEmail, recipientName, type, templateData, sessionId) => {
  let template
  
  switch (type) {
    case 'enrollment':
      template = templates.enrollment(
        templateData.learnerName,
        templateData.sessionTopic,
        templateData.sessionDate,
        templateData.trainerName
      )
      break
    case 'cancellation':
      template = templates.cancellation(
        templateData.learnerName,
        templateData.sessionTopic,
        templateData.sessionDate,
        templateData.reason
      )
      break
    case 'reschedule':
      template = templates.reschedule(
        templateData.learnerName,
        templateData.sessionTopic,
        templateData.oldDate,
        templateData.newDate,
        templateData.trainerName
      )
      break
    case 'message':
      template = templates.message(
        templateData.learnerName,
        templateData.sessionTopic,
        templateData.trainerName,
        templateData.isPrivate
      )
      break
    case 'certificate':
      template = templates.certificate(
        templateData.learnerName,
        templateData.sessionTopic,
        templateData.certificateNumber
      )
      break
    default:
      console.error('Unknown notification type:', type)
      return { error: 'Unknown notification type' }
  }

  try {
    const { data, error } = await supabase
      .from('notification_logs')
      .insert({
        recipient_email: recipientEmail,
        recipient_name: recipientName,
        notification_type: type,
        subject: template.subject,
        body: template.body,
        related_session_id: sessionId,
        status: 'pending'
      })
      .select()
      .single()

    if (error) throw error

    // In production, you would trigger an Edge Function or webhook here
    // to actually send the email via SendGrid, Resend, etc.
    console.log('Notification logged:', data)

    return { data, error: null }
  } catch (error) {
    console.error('Error logging notification:', error)
    return { data: null, error }
  }
}

// Batch send notifications
export const sendBatchNotifications = async (recipients, type, templateDataFn, sessionId) => {
  const results = []
  
  for (const recipient of recipients) {
    const templateData = templateDataFn(recipient)
    const result = await sendNotification(
      recipient.email,
      recipient.name,
      type,
      templateData,
      sessionId
    )
    results.push(result)
  }
  
  return results
}
