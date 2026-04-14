import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';
import { config } from '../config';

interface CertificateData {
  memberName: string;
  membershipId: string;
  approvedDate: Date;
  expiryDate: Date;
  membershipType: string;
}

export const generateCertificate = async (
  data: CertificateData
): Promise<string> => {
  const uploadsDir = path.resolve(config.uploadDir, 'certificates');
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }

  const fileName = `certificate-${data.membershipId}.pdf`;
  const filePath = path.join(uploadsDir, fileName);

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: 'A4',
      layout: 'landscape',
      margins: { top: 50, bottom: 50, left: 50, right: 50 },
    });

    const stream = fs.createWriteStream(filePath);
    doc.pipe(stream);

    const pageWidth = doc.page.width;
    const pageHeight = doc.page.height;

    // Outer border
    doc
      .rect(30, 30, pageWidth - 60, pageHeight - 60)
      .lineWidth(3)
      .stroke('#1a365d');

    // Inner border
    doc
      .rect(40, 40, pageWidth - 80, pageHeight - 80)
      .lineWidth(1)
      .stroke('#2b6cb0');

    // Decorative corner elements
    const cornerSize = 20;
    const corners = [
      { x: 45, y: 45 },
      { x: pageWidth - 45 - cornerSize, y: 45 },
      { x: 45, y: pageHeight - 45 - cornerSize },
      { x: pageWidth - 45 - cornerSize, y: pageHeight - 45 - cornerSize },
    ];

    corners.forEach((corner) => {
      doc
        .rect(corner.x, corner.y, cornerSize, cornerSize)
        .lineWidth(1)
        .stroke('#2b6cb0');
    });

    // Header - Organization name
    doc
      .font('Helvetica-Bold')
      .fontSize(28)
      .fillColor('#1a365d')
      .text('FEDERATION OF TAX PRACTITIONERS OF INDIA', 0, 80, {
        align: 'center',
        width: pageWidth,
      });

    // Decorative line
    const lineY = 120;
    doc
      .moveTo(pageWidth / 2 - 200, lineY)
      .lineTo(pageWidth / 2 + 200, lineY)
      .lineWidth(2)
      .stroke('#c6a94e');

    // Certificate title
    doc
      .font('Helvetica-Bold')
      .fontSize(36)
      .fillColor('#c6a94e')
      .text('CERTIFICATE OF MEMBERSHIP', 0, 140, {
        align: 'center',
        width: pageWidth,
      });

    // Subtitle
    doc
      .font('Helvetica')
      .fontSize(14)
      .fillColor('#4a5568')
      .text('This is to certify that', 0, 200, {
        align: 'center',
        width: pageWidth,
      });

    // Member name
    doc
      .font('Helvetica-Bold')
      .fontSize(30)
      .fillColor('#1a365d')
      .text(data.memberName, 0, 230, {
        align: 'center',
        width: pageWidth,
      });

    // Underline for name
    const nameWidth = doc.widthOfString(data.memberName);
    const nameX = (pageWidth - nameWidth) / 2;
    doc
      .moveTo(nameX, 268)
      .lineTo(nameX + nameWidth, 268)
      .lineWidth(1)
      .stroke('#1a365d');

    // Membership details
    doc
      .font('Helvetica')
      .fontSize(14)
      .fillColor('#4a5568')
      .text(
        `is a registered member of the Federation of Tax Practitioners of India`,
        0,
        290,
        { align: 'center', width: pageWidth }
      );

    doc
      .font('Helvetica')
      .fontSize(14)
      .fillColor('#4a5568')
      .text(
        `with Membership Type: ${data.membershipType}`,
        0,
        315,
        { align: 'center', width: pageWidth }
      );

    // Membership ID
    doc
      .font('Helvetica-Bold')
      .fontSize(16)
      .fillColor('#2b6cb0')
      .text(`Membership ID: ${data.membershipId}`, 0, 350, {
        align: 'center',
        width: pageWidth,
      });

    // Dates
    const approvedDateStr = data.approvedDate.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    });
    const expiryDateStr = data.expiryDate.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    });

    doc
      .font('Helvetica')
      .fontSize(12)
      .fillColor('#4a5568')
      .text(`Date of Issue: ${approvedDateStr}`, 100, 400)
      .text(`Valid Until: ${expiryDateStr}`, pageWidth - 300, 400);

    // Decorative line before footer
    doc
      .moveTo(pageWidth / 2 - 200, 440)
      .lineTo(pageWidth / 2 + 200, 440)
      .lineWidth(1)
      .stroke('#c6a94e');

    // Footer signatures
    doc
      .font('Helvetica')
      .fontSize(10)
      .fillColor('#4a5568')
      .text('_________________________', 120, 470)
      .text('President', 160, 490)
      .text('_________________________', pageWidth - 300, 470)
      .text('Secretary', pageWidth - 255, 490);

    // Bottom note
    doc
      .font('Helvetica')
      .fontSize(8)
      .fillColor('#a0aec0')
      .text(
        'This is a digitally generated certificate. Verify at www.ftpi.org',
        0,
        520,
        { align: 'center', width: pageWidth }
      );

    doc.end();

    stream.on('finish', () => {
      resolve(`/uploads/certificates/${fileName}`);
    });

    stream.on('error', (err) => {
      reject(err);
    });
  });
};
