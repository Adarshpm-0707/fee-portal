import axios from 'axios';

// Create axios instance with base URL pointing to the proxy/express server
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '', 
  headers: {
    'Content-Type': 'application/json'
  }
});

/**
 * Sends a WhatsApp notification to a single student's parent.
 * data: { phone, parentName, studentName, admissionNumber, month, amount, receiptUrl, feeRecordId, type, studentClass, schoolName }
 */
export async function sendReceipt(data) {
  try {
    const response = await api.post('/api/send-receipt', data);
    return response.data;
  } catch (error) {
    console.error('API Error in sendReceipt:', error);
    throw new Error(error.response?.data?.message || 'Failed to connect to the WhatsApp notification server.');
  }
}

/**
 * Broadcasts WhatsApp reminders or receipts to all active students.
 * type: 'reminder' or 'receipt'
 */
export async function sendToAll(type = 'reminder', schoolName = 'Student Fee Portal') {
  try {
    const response = await api.post('/api/send-all', { type, schoolName });
    return response.data;
  } catch (error) {
    console.error('API Error in sendToAll:', error);
    throw new Error(error.response?.data?.message || 'Failed to send bulk notifications.');
  }
}

/**
 * Sends notifications to a select list of student IDs.
 * studentIds: Array of student IDs
 * type: 'reminder' or 'receipt'
 */
export async function sendToBulk(studentIds, type = 'reminder', schoolName = 'Student Fee Portal') {
  try {
    const response = await api.post('/api/send-bulk', { studentIds, type, schoolName });
    return response.data;
  } catch (error) {
    console.error('API Error in sendToBulk:', error);
    throw new Error(error.response?.data?.message || 'Failed to send bulk messages.');
  }
}

/**
 * Checks if WhatsApp client is connected, connecting or disconnected
 */
export async function getWhatsAppStatus() {
  try {
    const response = await api.get('/api/whatsapp-status');
    return response.data;
  } catch (error) {
    console.error('API Error fetching WhatsApp status:', error);
    return { status: 'disconnected', error: true };
  }
}

/**
 * Fetches the QR code details from the Express server.
 */
export async function getWhatsAppQR() {
  try {
    const response = await api.get('/api/qr');
    return response.data;
  } catch (error) {
    console.error('API Error fetching WhatsApp QR code:', error);
    throw new Error(error.response?.data?.message || 'WhatsApp connection is offline. Try again later.');
  }
}
