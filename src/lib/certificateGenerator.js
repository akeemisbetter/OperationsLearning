import { jsPDF } from 'jspdf'

export const generateCertificate = (data) => {
  const {
    learnerName,
    sessionTopic,
    trainerName,
    completionDate,
    certificateNumber,
    clientName
  } = data

  // Create PDF in landscape
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4'
  })

  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()

  // Background color
  doc.setFillColor(250, 250, 252)
  doc.rect(0, 0, pageWidth, pageHeight, 'F')

  // Border
  doc.setDrawColor(59, 130, 246)
  doc.setLineWidth(3)
  doc.rect(10, 10, pageWidth - 20, pageHeight - 20)

  // Inner border
  doc.setDrawColor(147, 197, 253)
  doc.setLineWidth(1)
  doc.rect(15, 15, pageWidth - 30, pageHeight - 30)

  // Decorative corners
  doc.setFillColor(59, 130, 246)
  doc.circle(20, 20, 3, 'F')
  doc.circle(pageWidth - 20, 20, 3, 'F')
  doc.circle(20, pageHeight - 20, 3, 'F')
  doc.circle(pageWidth - 20, pageHeight - 20, 3, 'F')

  // Header
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(14)
  doc.setTextColor(100, 116, 139)
  doc.text('HRP LEARNING HUB', pageWidth / 2, 35, { align: 'center' })

  // Title
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(36)
  doc.setTextColor(30, 41, 59)
  doc.text('CERTIFICATE', pageWidth / 2, 55, { align: 'center' })

  doc.setFontSize(18)
  doc.setTextColor(59, 130, 246)
  doc.text('OF COMPLETION', pageWidth / 2, 65, { align: 'center' })

  // Decorative line
  doc.setDrawColor(59, 130, 246)
  doc.setLineWidth(0.5)
  doc.line(pageWidth / 2 - 50, 72, pageWidth / 2 + 50, 72)

  // "This certifies that"
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(12)
  doc.setTextColor(100, 116, 139)
  doc.text('This is to certify that', pageWidth / 2, 85, { align: 'center' })

  // Learner name
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(28)
  doc.setTextColor(30, 41, 59)
  doc.text(learnerName, pageWidth / 2, 100, { align: 'center' })

  // Underline for name
  const nameWidth = doc.getTextWidth(learnerName)
  doc.setDrawColor(59, 130, 246)
  doc.setLineWidth(0.5)
  doc.line(pageWidth / 2 - nameWidth / 2 - 10, 104, pageWidth / 2 + nameWidth / 2 + 10, 104)

  // "has successfully completed"
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(12)
  doc.setTextColor(100, 116, 139)
  doc.text('has successfully completed the training program', pageWidth / 2, 115, { align: 'center' })

  // Course name
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(20)
  doc.setTextColor(59, 130, 246)
  doc.text(sessionTopic, pageWidth / 2, 130, { align: 'center' })

  // Client
  if (clientName) {
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(12)
    doc.setTextColor(100, 116, 139)
    doc.text(`Client: ${clientName}`, pageWidth / 2, 142, { align: 'center' })
  }

  // Date and trainer info
  const bottomY = pageHeight - 45

  // Date section
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  doc.setTextColor(100, 116, 139)
  doc.text('Completion Date', pageWidth / 4, bottomY, { align: 'center' })
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(12)
  doc.setTextColor(30, 41, 59)
  doc.text(completionDate, pageWidth / 4, bottomY + 8, { align: 'center' })

  // Trainer section
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  doc.setTextColor(100, 116, 139)
  doc.text('Trainer', pageWidth / 2, bottomY, { align: 'center' })
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(12)
  doc.setTextColor(30, 41, 59)
  doc.text(trainerName, pageWidth / 2, bottomY + 8, { align: 'center' })

  // Certificate number
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  doc.setTextColor(100, 116, 139)
  doc.text('Certificate No.', (pageWidth / 4) * 3, bottomY, { align: 'center' })
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(12)
  doc.setTextColor(30, 41, 59)
  doc.text(certificateNumber, (pageWidth / 4) * 3, bottomY + 8, { align: 'center' })

  return doc
}

export const downloadCertificate = (data) => {
  const doc = generateCertificate(data)
  doc.save(`Certificate_${data.learnerName.replace(/\s+/g, '_')}_${data.certificateNumber}.pdf`)
}

export const getCertificateBlob = (data) => {
  const doc = generateCertificate(data)
  return doc.output('blob')
}
