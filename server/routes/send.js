import express from 'express';
import { sendMessage } from '../whatsapp.js';
import { db } from '../db.js';
import { doc, updateDoc, addDoc, collection, serverTimestamp } from 'firebase/firestore';

const router = express.Router();

router.post('/', async (req, res) => {
  const {
    phone,
    parentName,
    studentName,
    admissionNumber,
    month,
    amount,
    receiptUrl,
    feeRecordId,
    type = 'receipt', // 'receipt' or 'reminder'
    studentClass = '',
    schoolName = 'Student Fee Portal'
  } = req.body;

  if (!phone || !parentName || !studentName) {
    return res.status(400).json({ success: false, message: 'Missing required recipient details.' });
  }

  // 1. Format message using template
  let messageText = '';
  if (type === 'receipt') {
    messageText = `🎓 Fee Receipt — ${schoolName}\n` +
                  `Hi ${parentName},\n` +
                  `Student: ${studentName} | Adm: ${admissionNumber || 'N/A'}\n` +
                  `Month: ${month} | Paid: Rs.${amount}\n` +
                  `Receipt: ${receiptUrl || 'No receipt URL provided'} Thank you! ✅`;
  } else {
    messageText = `⚠️ Fee Reminder — ${schoolName}\n` +
                  `Hi ${parentName},\n` +
                  `Student: ${studentName} | Adm: ${admissionNumber || 'N/A'} | Class: ${studentClass || 'N/A'}\n` +
                  `Pending: Rs.${amount} for ${month}. Please pay soon.`;
  }

  try {
    // 2. Dispatch WhatsApp message
    console.log(`Sending individual message (${type}) to ${phone}...`);
    await sendMessage(phone, messageText);

    // 3. Update Firestore if db is active and record ID exists
    let updatedInDb = false;
    if (db && feeRecordId && type === 'receipt') {
      try {
        const feeDocRef = doc(db, 'feeRecords', feeRecordId);
        await updateDoc(feeDocRef, {
          whatsappSent: true,
          whatsappSentAt: serverTimestamp()
        });
        updatedInDb = true;
      } catch (err) {
        console.error('Error updating feeRecord whatsappSent status in Firestore:', err);
      }
    }

    // 4. Log notification to Firestore
    if (db) {
      try {
        await addDoc(collection(db, 'notifications'), {
          studentName,
          admissionNumber: admissionNumber || 'Pending',
          phone,
          type: type === 'receipt' ? 'Receipt' : 'Reminder',
          status: 'Sent',
          timestamp: serverTimestamp()
        });
      } catch (err) {
        console.error('Error adding log to notifications collection:', err);
      }
    }

    res.json({
      success: true,
      message: `WhatsApp ${type} sent successfully.`,
      updatedInDb
    });

  } catch (error) {
    console.error('Error sending WhatsApp message:', error);
    
    // Log failure to Firestore
    if (db) {
      try {
        await addDoc(collection(db, 'notifications'), {
          studentName,
          admissionNumber: admissionNumber || 'Pending',
          phone,
          type: type === 'receipt' ? 'Receipt' : 'Reminder',
          status: 'Failed',
          timestamp: serverTimestamp()
        });
      } catch (err) {
        console.error('Error saving notification failure:', err);
      }
    }

    res.status(500).json({
      success: false,
      message: 'Failed to send WhatsApp message.',
      error: error.message
    });
  }
});

export default router;
