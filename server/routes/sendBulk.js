import express from 'express';
import { sendMessage } from '../whatsapp.js';
import { db } from '../db.js';
import { doc, getDoc, getDocs, collection, query, where, addDoc, serverTimestamp } from 'firebase/firestore';

const router = express.Router();

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

router.post('/', async (req, res) => {
  const { studentIds, type = 'reminder', schoolName = 'Student Fee Portal' } = req.body;

  if (!studentIds || !Array.isArray(studentIds) || studentIds.length === 0) {
    return res.status(400).json({ success: false, message: 'Invalid or empty student ID list.' });
  }

  if (!db) {
    return res.status(503).json({ success: false, message: 'Database connection is not configured.' });
  }

  try {
    console.log(`Starting bulk send for ${studentIds.length} students, type: ${type}...`);
    
    let sent = 0;
    let failed = 0;
    const results = [];

    for (const id of studentIds) {
      try {
        // Fetch student doc by Firestore ID
        const studentDocRef = doc(db, 'students', id);
        const studentSnap = await getDoc(studentDocRef);
        
        let student = null;
        if (studentSnap.exists()) {
          student = { id: studentSnap.id, ...studentSnap.data() };
        } else {
          // Attempt to fetch by studentId field if ID was field-based
          const q = query(collection(db, 'students'), where('studentId', '==', id));
          const qSnap = await getDocs(q);
          if (!qSnap.empty) {
            const doc = qSnap.docs[0];
            student = { id: doc.id, ...doc.data() };
          }
        }

        if (!student) {
          console.warn(`Student not found for ID: ${id}`);
          failed++;
          results.push({ studentId: id, status: 'failed', reason: 'Student record not found' });
          continue;
        }

        if (!student.contact) {
          failed++;
          results.push({ studentId: id, name: student.fullName, status: 'failed', reason: 'No contact number' });
          continue;
        }

        // Fetch fee records
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
          const unpaidRecords = feeRecords.filter(r => r.status === 'unpaid' || r.status === 'partial');
          if (unpaidRecords.length > 0) {
            shouldSend = true;
            const totalAmount = unpaidRecords.reduce((sum, r) => sum + Number(r.amount || 0), 0);
            const months = unpaidRecords.map(r => r.month).join(', ');
            
            messageText = `⚠️ Fee Reminder — ${schoolName}\n` +
                          `Hi ${student.parentName},\n` +
                          `Student: ${student.fullName} | Adm: ${student.admissionNumber || 'N/A'} | Class: ${student.class || 'N/A'}\n` +
                          `Pending: Rs.${totalAmount} for ${months}. Please pay soon.`;
          } else {
            results.push({ studentId: id, name: student.fullName, status: 'skipped', reason: 'No pending fees' });
          }
        } else if (type === 'receipt') {
          const paidRecords = feeRecords.filter(r => r.status === 'paid');
          if (paidRecords.length > 0) {
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
          } else {
            results.push({ studentId: id, name: student.fullName, status: 'skipped', reason: 'No paid fees' });
          }
        }

        if (shouldSend) {
          console.log(`Bulk sending to: ${student.fullName} (${student.contact})...`);
          await sendMessage(student.contact, messageText);
          sent++;
          results.push({ studentId: id, name: student.fullName, status: 'sent' });

          // Log notification
          await addDoc(collection(db, 'notifications'), {
            studentName: student.fullName,
            admissionNumber: student.admissionNumber || 'Pending',
            phone: student.contact,
            type: type === 'receipt' ? 'Receipt' : 'Reminder',
            status: 'Sent',
            timestamp: serverTimestamp()
          });

          // Throttle
          await delay(1000);
        }

      } catch (err) {
        console.error(`Error processing bulk item for ID ${id}:`, err);
        failed++;
        results.push({ studentId: id, status: 'failed', reason: err.message });
        
        try {
          await addDoc(collection(db, 'notifications'), {
            studentName: 'Unknown/Error',
            admissionNumber: 'N/A',
            phone: 'N/A',
            type: type === 'receipt' ? 'Receipt' : 'Reminder',
            status: 'Failed',
            timestamp: serverTimestamp()
          });
        } catch (logErr) {
          console.error('Failed to log bulk notification failure:', logErr);
        }
      }
    }

    res.json({
      success: true,
      sent,
      failed,
      results
    });

  } catch (error) {
    console.error('Error during bulk send operation:', error);
    res.status(500).json({ success: false, message: 'Bulk sending failed.', error: error.message });
  }
});

export default router;
