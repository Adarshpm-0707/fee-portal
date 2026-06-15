import express from 'express';
import { getStatus } from '../whatsapp.js';

const router = express.Router();

router.get('/', (req, res) => {
  res.json({ status: getStatus() });
});

export default router;
