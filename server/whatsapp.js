import pkg from 'whatsapp-web.js';
import fs from 'fs';
import path from 'path';

const { Client, LocalAuth } = pkg;
const authPath = path.resolve('.wwebjs_auth');

let client = null;
let qrCodeData = null;
let connectionStatus = 'disconnected'; // 'disconnected', 'connecting', 'ready'
let isInitializing = false;

console.log('Initializing WhatsApp Client...');

export async function initializeClient() {
  if (isInitializing) {
    console.log('WhatsApp Client initialization already in progress...');
    return;
  }
  isInitializing = true;
  connectionStatus = 'connecting';
  qrCodeData = null;

  try {
    client = new Client({
      authStrategy: new LocalAuth({
        dataPath: '.wwebjs_auth'
      }),
      webVersionCache: {
        type: 'remote',
        remotePath: 'https://raw.githubusercontent.com/wppconnect-team/wa-version/main/html/2.2412.54.html'
      },
      puppeteer: {
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--no-first-run',
          '--no-zygote',
          '--disable-gpu'
        ]
      }
    });

    // Setup event listeners
    client.on('qr', (qr) => {
      qrCodeData = qr;
      connectionStatus = 'disconnected';
      console.log('WhatsApp QR Code generated. Ready to scan.');
    });

    client.on('ready', () => {
      qrCodeData = null;
      connectionStatus = 'ready';
      console.log('WhatsApp client is ready and connected!');
    });

    client.on('authenticated', () => {
      console.log('WhatsApp client successfully authenticated.');
    });

    client.on('auth_failure', async (msg) => {
      console.error('WhatsApp authentication failure:', msg);
      connectionStatus = 'disconnected';
      qrCodeData = null;
      await handleFailureAndRestart(true); // Always clear session on authentication failure
    });

    client.on('disconnected', async (reason) => {
      console.log('WhatsApp client disconnected:', reason);
      connectionStatus = 'disconnected';
      qrCodeData = null;
      
      // If disconnected due to logout, delete session folder so a new QR is generated.
      // Otherwise, try to restart and restore session.
      const shouldDeleteSession = (reason === 'LOGOUT' || reason === 'navigation');
      await handleFailureAndRestart(shouldDeleteSession);
    });

    await client.initialize();
  } catch (err) {
    console.error('Error during WhatsApp client initialization:', err);
    connectionStatus = 'disconnected';
    isInitializing = false;
    await handleFailureAndRestart(true);
  } finally {
    isInitializing = false;
  }
}

async function handleFailureAndRestart(clearSession = false) {
  console.log(`Cleaning up and restarting WhatsApp client (clearSession: ${clearSession})...`);
  
  if (client) {
    try {
      console.log('Destroying current client instance...');
      await client.destroy();
    } catch (destroyErr) {
      console.error('Error destroying client:', destroyErr);
    }
    client = null;
  }

  if (clearSession) {
    try {
      if (fs.existsSync(authPath)) {
        console.log(`Clearing session directory at: ${authPath}`);
        // Give a short delay to ensure file locks are released by OS/puppeteer
        await new Promise(resolve => setTimeout(resolve, 1500));
        fs.rmSync(authPath, { recursive: true, force: true });
        console.log('Session directory successfully cleared.');
      }
    } catch (rmErr) {
      console.error('Error deleting session directory (might be locked by OS):', rmErr);
    }
  }

  // Schedule a restart
  setTimeout(() => {
    initializeClient().catch(err => {
      console.error('Failed to restart client after failure:', err);
    });
  }, 2000);
}

// Initial load
initializeClient().catch(err => {
  console.error('Error during initial WhatsApp client load:', err);
});


/**
 * Format phone number to standard WhatsApp format (e.g., 919876543210@c.us)
 */
export function formatPhoneNumber(phone) {
  if (!phone) return null;
  // Strip all non-numeric characters
  let cleaned = phone.toString().replace(/\D/g, '');
  
  // If it's a 10-digit number, prepend 91 (default Indian country code)
  if (cleaned.length === 10) {
    cleaned = '91' + cleaned;
  }
  
  // Append WhatsApp domain
  if (!cleaned.endsWith('@c.us')) {
    cleaned = cleaned + '@c.us';
  }
  
  return cleaned;
}

export function getStatus() {
  return connectionStatus;
}

export function getQR() {
  return qrCodeData;
}

export async function sendMessage(phone, message) {
  const formattedPhone = formatPhoneNumber(phone);
  if (!formattedPhone) {
    throw new Error('Invalid phone number provided.');
  }
  
  if (connectionStatus !== 'ready') {
    throw new Error(`WhatsApp client is not ready. Current status: ${connectionStatus}`);
  }
  
  const response = await client.sendMessage(formattedPhone, message);
  return response;
}

export { client };
