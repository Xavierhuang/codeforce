import nodemailer from 'nodemailer'
import sgMail from '@sendgrid/mail'
import { formatCurrency } from './utils'

// Email configuration - Support both SendGrid API and SMTP
const useSendGrid = !!process.env.SENDGRID_API_KEY
const useSMTP = !useSendGrid && !!process.env.SMTP_USER && !!process.env.SMTP_PASSWORD

// Initialize SendGrid if API key is provided
if (useSendGrid) {
  sgMail.setApiKey(process.env.SENDGRID_API_KEY!)
}

// SMTP configuration (fallback if SendGrid not used)
const smtpConfig = {
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: process.env.SMTP_SECURE === 'true', // true for 465, false for other ports
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASSWORD,
  },
}

let transporter: nodemailer.Transporter | null = null

if (useSMTP) {
  transporter = nodemailer.createTransport(smtpConfig)
} else if (!useSendGrid) {
  console.warn('SMTP not configured. Email receipts will not be sent.')
}

const fromEmail = process.env.SENDGRID_FROM_EMAIL || process.env.SMTP_FROM_EMAIL || process.env.SMTP_USER || 'noreply@skillyy.com'
const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://skillyy.com'

interface ReceiptData {
  transactionId: string
  paymentIntentId: string
  buyerName: string
  buyerEmail: string
  workerName?: string
  taskTitle: string
  taskId?: string
  amount: number
  baseAmount: number
  platformFee: number
  stripeFee: number
  date: Date
  status: string
}

export async function sendReceiptEmail(data: ReceiptData): Promise<boolean> {
  if (!useSendGrid && !transporter) {
    console.warn('Email service not configured. Receipt not sent.')
    return false
  }

  try {
    const receiptHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #10b981; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
            .receipt-details { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; }
            .detail-row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #e5e7eb; }
            .detail-row:last-child { border-bottom: none; }
            .total { font-size: 18px; font-weight: bold; color: #10b981; }
            .footer { text-align: center; margin-top: 20px; color: #6b7280; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Payment Receipt</h1>
              <p>Thank you for your payment!</p>
            </div>
            <div class="content">
              <p>Hello ${data.buyerName},</p>
              <p>This is your receipt for your recent payment on Skillyy.</p>
              
              <div class="receipt-details">
                <h2>Transaction Details</h2>
                <div class="detail-row">
                  <span>Transaction ID:</span>
                  <span>${data.transactionId}</span>
                </div>
                <div class="detail-row">
                  <span>Payment Intent:</span>
                  <span>${data.paymentIntentId}</span>
                </div>
                ${data.taskId ? `
                <div class="detail-row">
                  <span>Task ID:</span>
                  <span><a href="${appUrl}/tasks/${data.taskId}">${data.taskId}</a></span>
                </div>
                ` : ''}
                <div class="detail-row">
                  <span>Task:</span>
                  <span>${data.taskTitle}</span>
                </div>
                ${data.workerName ? `
                <div class="detail-row">
                  <span>Worker:</span>
                  <span>${data.workerName}</span>
                </div>
                ` : ''}
                <div class="detail-row">
                  <span>Date:</span>
                  <span>${data.date.toLocaleString()}</span>
                </div>
                <div class="detail-row">
                  <span>Status:</span>
                  <span>${data.status}</span>
                </div>
              </div>

              <div class="receipt-details">
                <h2>Payment Breakdown</h2>
                <div class="detail-row">
                  <span>Base Amount:</span>
                  <span>${formatCurrency(data.baseAmount)}</span>
                </div>
                <div class="detail-row">
                  <span>Platform Fee (15%):</span>
                  <span>${formatCurrency(data.platformFee)}</span>
                </div>
                <div class="detail-row">
                  <span>Processing Fee:</span>
                  <span>${formatCurrency(data.stripeFee)}</span>
                </div>
                <div class="detail-row total">
                  <span>Total:</span>
                  <span>${formatCurrency(data.amount)}</span>
                </div>
              </div>

              ${data.taskId ? `
              <p style="margin-top: 20px;">
                <a href="${appUrl}/tasks/${data.taskId}" style="background: #10b981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
                  View Task
                </a>
              </p>
              ` : ''}

              <div class="footer">
                <p>This is an automated receipt. Please keep this for your records.</p>
                <p>If you have any questions, please contact support at support@skillyy.com</p>
                <p>&copy; ${new Date().getFullYear()} Skillyy. All rights reserved.</p>
              </div>
            </div>
          </div>
        </body>
      </html>
    `

    // Use SendGrid API if configured, otherwise use SMTP
    if (useSendGrid) {
      await sgMail.send({
        from: fromEmail,
        to: data.buyerEmail,
        subject: `Payment Receipt - ${formatCurrency(data.amount)}`,
        html: receiptHtml,
      })
    } else if (transporter) {
      await transporter.sendMail({
        from: `Skillyy <${fromEmail}>`,
        to: data.buyerEmail,
        subject: `Payment Receipt - ${formatCurrency(data.amount)}`,
        html: receiptHtml,
      })
    }

    console.log(`Receipt email sent successfully to ${data.buyerEmail}`)
    return true
  } catch (error: any) {
    console.error('Error sending receipt email:', error)
    if (error.response) {
      console.error('SendGrid error details:', error.response.body)
    }
    return false
  }
}


