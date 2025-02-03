import express from 'express';
import { getAllTutorials } from '../models/education';
import { Request, Response, Router } from 'express';

const router: Router = express.Router();

// Get all tutorials
router.get('/tutorials', async (_req: Request, res: Response) => {
  try {
    const tutorials = await getAllTutorials();
    res.json(tutorials);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching tutorials' });
  }
});

// Removed user progress and user skills routes

export default router;
