import PDFDocument from 'pdfkit'
import { formatCurrency } from './utils'

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

export async function generateReceiptPDF(data: ReceiptData): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: 50, size: 'LETTER' })
      const buffers: Buffer[] = []

      doc.on('data', buffers.push.bind(buffers))
      doc.on('end', () => {
        const pdfBuffer = Buffer.concat(buffers)
        resolve(pdfBuffer)
      })
      doc.on('error', reject)

      // Header
      doc
        .fontSize(24)
        .fillColor('#10b981')
        .text('Payment Receipt', { align: 'center' })
        .moveDown(0.5)

      doc
        .fontSize(12)
        .fillColor('#6b7280')
        .text('Thank you for your payment!', { align: 'center' })
        .moveDown(2)

      // Company Info
      doc
        .fontSize(10)
        .fillColor('#000000')
        .text('Skillyy', { align: 'left' })
        .text('no-reply@skillyy.com', { align: 'left' })
        .text('https://skillyy.com', { align: 'left' })
        .moveDown(1)

      // Transaction Details
      doc
        .fontSize(14)
        .fillColor('#000000')
        .text('Transaction Details', { underline: true })
        .moveDown(0.5)

      doc.fontSize(10)
      const details = [
        ['Transaction ID:', data.transactionId],
        ['Payment Intent:', data.paymentIntentId],
        ...(data.taskId ? [['Task ID:', data.taskId]] : []),
        ['Task:', data.taskTitle],
        ...(data.workerName ? [['Worker:', data.workerName]] : []),
        ['Date:', data.date.toLocaleString()],
        ['Status:', data.status],
      ]

      details.forEach(([label, value]) => {
        doc
          .fillColor('#374151')
          .text(label, { continued: true, width: 150 })
          .fillColor('#000000')
          .text(value || 'N/A', { width: 300, align: 'left' })
          .moveDown(0.3)
      })

      doc.moveDown(1)

      // Payment Breakdown
      doc
        .fontSize(14)
        .fillColor('#000000')
        .text('Payment Breakdown', { underline: true })
        .moveDown(0.5)

      doc.fontSize(10)
      const breakdown = [
        ['Base Amount:', formatCurrency(data.baseAmount)],
        ['Platform Fee (15%):', formatCurrency(data.platformFee)],
        ['Processing Fee:', formatCurrency(data.stripeFee)],
      ]

      breakdown.forEach(([label, value]) => {
        doc
          .fillColor('#374151')
          .text(label, { continued: true, width: 150 })
          .fillColor('#000000')
          .text(value, { width: 100, align: 'right' })
          .moveDown(0.3)
      })

      // Total
      doc.moveDown(0.5)
      doc
        .fontSize(12)
        .fillColor('#10b981')
        .text('Total:', { continued: true, width: 150 })
        .fontSize(14)
        .text(formatCurrency(data.amount), { width: 100, align: 'right' })

      doc.moveDown(2)

      // Footer
      doc
        .fontSize(8)
        .fillColor('#6b7280')
        .text('This is an automated receipt. Please keep this for your records.', { align: 'center' })
        .moveDown(0.3)
        .text('If you have any questions, please contact support at support@skillyy.com', { align: 'center' })
        .moveDown(0.3)
        .text(`© ${new Date().getFullYear()} Skillyy. All rights reserved.`, { align: 'center' })

      doc.end()
    } catch (error) {
      reject(error)
    }
  })
}


