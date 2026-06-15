import { jsPDF } from 'jspdf';
import { storage, isFirebaseConfigured } from './firebase.js';
import { ref, uploadString, getDownloadURL } from 'firebase/storage';

// Cache the jsPDF class to avoid re-loading the module every time
let _jsPDFCached = null;

/**
 * Generates a high-quality PDF receipt document synchronously.
 * Returns the jsPDF instance, base64 string and generated receipt number.
 * NOTE: This is a synchronous pure function — it runs instantly in-memory
 * with no network calls. Do NOT add any await or setTimeout here.
 */
export function generateReceipt(student, feeRecord, adminName = 'Administrator') {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  // A4 Page is 210mm wide x 297mm high
  
  // Theme styling colors
  const primaryColor = [30, 58, 95]; // #1E3A5F - Deep dark blue

  // 1. Draw elegant double border around page
  doc.setDrawColor(30, 58, 95);
  doc.setLineWidth(0.5);
  doc.rect(10, 10, 190, 277); // outer border
  doc.rect(11.2, 11.2, 187.6, 274.6); // inner border

  // 2. Draw Header
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(22);
  doc.setTextColor(30, 58, 95);
  doc.text('ST. AUGUSTINE HIGH SCHOOL', 105, 26, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(113, 128, 150);
  doc.text('Affiliation No: 2025/FEES | Sector 15, Knowledge Park, Central District', 105, 32, { align: 'center' });
  doc.text('Contact: +91 98765 43210 | Email: billing@staugustine.edu.in', 105, 37, { align: 'center' });

  // 3. Horizontal Divider
  doc.setDrawColor(204, 214, 224);
  doc.line(16, 43, 194, 43);

  // 4. Receipt Title Banner
  doc.setFillColor(30, 58, 95);
  doc.rect(16, 48, 178, 11, 'F');
  
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(255, 255, 255);
  doc.text('OFFICIAL FEE RECEIPT', 105, 55, { align: 'center' });

  // 5. Basic Info (Receipt #, Date)
  const receiptNo = feeRecord.receiptId || `REC-${feeRecord.year || 2025}-${String(Math.floor(100000 + Math.random() * 900000))}`;
  const payDate = feeRecord.paymentDate 
    ? new Date(feeRecord.paymentDate).toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
      })
    : new Date().toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
      });

  doc.setFontSize(10);
  doc.setTextColor(30, 58, 95);
  doc.text(`Receipt Number: ${receiptNo}`, 20, 68);
  doc.text(`Date of Payment: ${payDate}`, 140, 68);

  // 6. Student & Parent Information Block (Grid layout in gray card)
  doc.setFillColor(248, 250, 252);
  doc.rect(16, 74, 178, 48, 'F');
  doc.setDrawColor(226, 232, 240);
  doc.rect(16, 74, 178, 48);

  // Grid vertical separator
  doc.line(105, 74, 105, 122);

  // Left side - Student Details
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(30, 58, 95);
  doc.text('STUDENT INFORMATION', 22, 82);
  doc.setDrawColor(30, 58, 95);
  doc.line(22, 84, 98, 84);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(74, 85, 104);
  doc.text(`Student Name :  ${student.fullName}`, 22, 91);
  doc.text(`Student ID       :  ${student.studentId}`, 22, 98);
  doc.text(`Admission No :  ${student.admissionNumber || 'Pending Admission'}`, 22, 105);
  doc.text(`Class/Grade   :  Class ${student.class}`, 22, 112);

  // Right side - Parent Details
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 58, 95);
  doc.text('PARENT & TRANSACTION', 111, 82);
  doc.line(111, 84, 187, 84);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(74, 85, 104);
  doc.text(`Guardian Name:  ${student.parentName}`, 111, 91);
  doc.text(`WhatsApp No  :  +91 ${student.contact}`, 111, 98);
  doc.text(`Payment Mode :  ${feeRecord.paymentMode || 'Online'}`, 111, 105);
  doc.text(`City/Location   :  ${student.location || 'N/A'}`, 111, 112);

  // 7. Ledger Table Header
  doc.setFillColor(30, 58, 95);
  doc.rect(16, 134, 178, 8, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(255, 255, 255);
  doc.text('Description of Particulars', 22, 139.5);
  doc.text('Amount (INR)', 155, 139.5);

  // Ledger Table Content Area
  doc.setDrawColor(226, 232, 240);
  doc.rect(16, 142, 178, 30);
  doc.line(146, 142, 146, 172); // vertical division

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(74, 85, 104);
  doc.text(`Academic Tuition Fee — Month of ${feeRecord.month} ${feeRecord.year}`, 22, 152);
  doc.text(`Rs. ${Number(feeRecord.amount).toFixed(2)}`, 152, 152);

  // 8. Total Amount Area
  doc.setFillColor(241, 245, 249);
  doc.rect(16, 172, 178, 9, 'F');
  doc.rect(16, 172, 178, 9);
  doc.line(146, 172, 146, 181); // vertical division

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 58, 95);
  doc.text('TOTAL PAID AMOUNT', 22, 177.5);
  doc.text(`Rs. ${Number(feeRecord.amount).toFixed(2)}`, 152, 177.5);

  // 9. Info notes
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(8.5);
  doc.setTextColor(148, 163, 184);
  doc.text('Note: This is an electronically generated document. No physical signature is required.', 16, 192);

  // 10. Verification Signatures
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(74, 85, 104);
  doc.text(`Issued by: ${adminName}`, 20, 224);
  doc.text('Verified Portal Administrator', 20, 229);

  doc.line(135, 224, 188, 224);
  doc.text('Authorized School Signature', 142, 229);

  // Footer slogan
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(9.5);
  doc.setTextColor(148, 163, 184);
  doc.text('"In Pursuit of Excellence"', 105, 266, { align: 'center' });

  // Get PDF data uri string to split and extract base64
  const dataUri = doc.output('datauristring');
  const base64String = dataUri.split(',')[1];

  return { 
    doc, 
    base64String, 
    receiptNo 
  };
}

/**
 * Triggers an instant browser download of the PDF without any network calls.
 * Use this for the parent portal download — no Firebase storage needed.
 */
export function downloadReceiptLocally(student, feeRecord, adminName = 'School Accounts Department') {
  const { doc } = generateReceipt(student, feeRecord, adminName);
  const safeName = student.fullName.replace(/\s+/g, '_');
  doc.save(`Receipt_${safeName}_${feeRecord.month}_${feeRecord.year || ''}.pdf`);
}

/**
 * Uploads PDF receipt to Firebase Storage and returns the public download link.
 * Optimized: uses the pre-generated base64 string passed in to avoid re-generation.
 */
export async function uploadReceiptToStorage(base64, studentId, month) {
  if (!isFirebaseConfigured) {
    console.warn('Firebase storage is unconfigured. Returning mock URL.');
    // No artificial delay — return immediately in mock mode
    return `https://demo-storage-bucket.com/receipts/${studentId}_${month}_receipt.pdf`;
  }

  try {
    const fileRef = ref(storage, `receipts/${studentId}/${studentId}_${month}_${Date.now()}.pdf`);
    // Upload base64 string directly — faster than converting to Blob first
    await uploadString(fileRef, base64, 'base64', {
      contentType: 'application/pdf'
    });
    const downloadUrl = await getDownloadURL(fileRef);
    return downloadUrl;
  } catch (error) {
    console.error('Failed uploading PDF to Firebase storage:', error);
    throw error;
  }
}
