import express from 'express';
import { sendMessage } from '../whatsapp.js';
import { db } from '../db.js';
import { collection, getDocs, query, where, addDoc, serverTimestamp } from 'firebase/firestore';

const router = express.Router();

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

router.post('/', async (req, res) => {
  const { type = 'reminder', schoolName = 'Student Fee Portal' } = req.body;

  if (!db) {
    return res.status(503).json({ success: false, message: 'Database connection is not configured.' });
  }

  try {
    console.log(`Starting broadcast for all students, type: ${type}...`);
    
    // 1. Fetch all active students
    const studentsSnapshot = await getDocs(
      query(collection(db, 'students'), where('status', '==', 'active'))
    );
    
    const students = [];
    studentsSnapshot.forEach(doc => {
      students.push({ id: doc.id, ...doc.data() });
    });

    if (students.length === 0) {
      return res.json({ success: true, total: 0, sent: 0, failed: 0, message: 'No active students found.' });
    }

    let sent = 0;
    let failed = 0;

    // We process sequentially with a delay to prevent spam flagging
    for (const student of students) {
      try {
        if (!student.contact) {
          failed++;
          continue;
        }

        // Fetch fee records for this student to customize the message
        const feeRecordsSnapshot = await getDocs(
          query(collection(db, 'feeRecords'), where('studentId', '==', student.studentId || student.id))
        );
        
        const feeRecords = [];
        feeRecordsSnapshot.forEach(doc => {
          feeRecords.push({ id: doc.id, ...doc.data() });
        });

        let shouldSend = false;
        let messageText = '';

        if (type === 'reminder') {
          // Find unpaid/partial records
          const unpaidRecords = feeRecords.filter(r => r.status === 'unpaid' || r.status === 'partial');
          if (unpaidRecords.length > 0) {
            shouldSend = true;
            const totalAmount = unpaidRecords.reduce((sum, r) => sum + Number(r.amount || 0), 0);
            const months = unpaidRecords.map(r => r.month).join(', ');
            
            messageText = `⚠️ Fee Reminder — ${schoolName}\n` +
                          `Hi ${student.parentName},\n` +
                          `Student: ${student.fullName} | Adm: ${student.admissionNumber || 'N/A'} | Class: ${student.class || 'N/A'}\n` +
                          `Pending: Rs.${totalAmount} for ${months}. Please pay soon.`;
          }
        } else if (type === 'receipt') {
          // Find paid records in the current month (or recently marked paid)
          const paidRecords = feeRecords.filter(r => r.status === 'paid');
          if (paidRecords.length > 0) {
            // Send receipt for the latest paid record
            const latestPaid = paidRecords.sort((a, b) => {
              const dateA = a.paymentDate?.seconds || 0;
              const dateB = b.paymentDate?.seconds || 0;
              return dateB - dateA;
            })[0];
            
            if (latestPaid) {
              shouldSend = true;
              messageText = `🎓 Fee Receipt — ${schoolName}\n` +
                            `Hi ${student.parentName},\n` +
                            `Student: ${student.fullName} | Adm: ${student.admissionNumber || 'N/A'}\n` +
                            `Month: ${latestPaid.month} | Paid: Rs.${latestPaid.amount}\n` +
                            `Receipt: ${latestPaid.receiptUrl || 'Receipt available in Portal'} Thank you! ✅`;
            }
          }
        }

        if (shouldSend) {
          console.log(`Broadcasting: sending to ${student.fullName} (${student.contact})...`);
          await sendMessage(student.contact, messageText);
          sent++;

          // Log notification status
          await addDoc(collection(db, 'notifications'), {
            studentName: student.fullName,
            admissionNumber: student.admissionNumber || 'Pending',
            phone: student.contact,
            type: type === 'receipt' ? 'Receipt' : 'Reminder',
            status: 'Sent',
            timestamp: serverTimestamp()
          });

          // Wait 1000ms between messages to avoid WhatsApp bans
          await delay(1000);
        }
      } catch (err) {
        console.error(`Failed to send message to ${student.fullName}:`, err);
        failed++;
        
        try {
          await addDoc(collection(db, 'notifications'), {
            studentName: student.fullName,
            admissionNumber: student.admissionNumber || 'Pending',
            phone: student.contact || 'N/A',
            type: type === 'receipt' ? 'Receipt' : 'Reminder',
            status: 'Failed',
            timestamp: serverTimestamp()
          });
        } catch (logErr) {
          console.error('Failed to log notification failure:', logErr);
        }
      }
    }

    res.json({
      success: true,
      total: students.length,
      sent,
      failed,
      message: `Broadcast finished. Sent: ${sent}, Failed: ${failed}`
    });

  } catch (error) {
    console.error('Error during broadcast all:', error);
    res.status(500).json({ success: false, message: 'Broadcast failed.', error: error.message });
  }
});

export default router;
