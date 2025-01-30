import express from 'express';
import { createTutorial, getAllTutorials } from '../models/education';

const router = express.Router();

// Get all tutorials
router.get('/tutorials', async (_req, res) => {
  try {
    const tutorials = await getAllTutorials();
    res.json(tutorials);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching tutorials' });
  }
});

// Get user's progress (to be implemented with Supabase)
// Get user's skills (to be implemented with Supabase)

export default router;
