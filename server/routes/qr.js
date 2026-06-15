import express from 'express';
import { getQR } from '../whatsapp.js';
import qrCode from 'qrcode';

const router = express.Router();

router.get('/', async (req, res) => {
  const qrString = getQR();
  if (!qrString) {
    return res.json({ 
      success: false, 
      qr: null,
      message: 'WhatsApp Web is initializing. Generating QR code...' 
    });
  }

  try {
    const qrDataUrl = await qrCode.toDataURL(qrString);
    res.json({ 
      success: true, 
      qr: qrString,
      qrDataUrl: qrDataUrl 
    });
  } catch (error) {
    console.error('Error generating QR image:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to render QR code image.', 
      error: error.message 
    });
  }
});

export default router;
