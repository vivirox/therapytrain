import express from 'express';

const router = express.Router();

// Endpoint has been removed due to errors
router.post('/', (req, res) => {
  res.status(400).json({ message: 'This endpoint has been removed due to errors.' });
});

export default router;
