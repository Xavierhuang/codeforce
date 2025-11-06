import twilio from 'twilio'

const accountSid = process.env.TWILIO_ACCOUNT_SID
const authToken = process.env.TWILIO_AUTH_TOKEN
const twilioPhoneNumber = process.env.TWILIO_PHONE_NUMBER

let twilioClient: twilio.Twilio | null = null

if (accountSid && authToken) {
  twilioClient = twilio(accountSid, authToken)
}

export async function sendSMS(to: string, message: string): Promise<boolean> {
  if (!twilioClient || !twilioPhoneNumber) {
    console.warn('Twilio not configured. SMS not sent.')
    return false
  }

  try {
    await twilioClient.messages.create({
      body: message,
      from: twilioPhoneNumber,
      to: to,
    })
    return true
  } catch (error: any) {
    console.error('Error sending SMS:', error)
    return false
  }
}

export async function sendTaskBookingNotification(
  developerPhone: string,
  taskTitle: string,
  clientName: string,
  scheduledAt?: Date
) {
  const scheduledText = scheduledAt
    ? ` scheduled for ${scheduledAt.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      })}`
    : ''

  const message = `New Task Booked! You've been assigned to "${taskTitle}" by ${clientName}${scheduledText}. Check your dashboard for details. - CodeForce`

  return await sendSMS(developerPhone, message)
}


