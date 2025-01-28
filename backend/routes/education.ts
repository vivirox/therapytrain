import express from 'express';
import { Tutorial, UserProgress, Skill } from '../models/education';

const router = express.Router();

// Get all tutorials
router.get('/tutorials', async (req, res) => {
  try {
    const tutorials = await Tutorial.find();
    res.json(tutorials);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching tutorials' });
  }
});

// Get user's progress
router.get('/progress/:userId', async (req, res) => {
  try {
    const progress = await UserProgress.find({ userId: req.params.userId })
      .populate('tutorialId');
    res.json(progress);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching user progress' });
  }
});

// Update user's progress
router.post('/progress', async (req, res) => {
  try {
    const { userId, tutorialId, progress, completed } = req.body;
    const userProgress = await UserProgress.findOneAndUpdate(
      { userId, tutorialId },
      { progress, completed, lastAccessed: new Date() },
      { upsert: true, new: true }
    );
    res.json(userProgress);
  } catch (error) {
    res.status(500).json({ message: 'Error updating progress' });
  }
});

// Get user's skills
router.get('/skills/:userId', async (req, res) => {
  try {
    const skills = await Skill.find({ userId: req.params.userId });
    res.json(skills);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching skills' });
  }
});

// Update user's skill
router.post('/skills', async (req, res) => {
  try {
    const { userId, skillName, proficiency } = req.body;
    const skill = await Skill.findOneAndUpdate(
      { userId, skillName },
      { proficiency, lastUpdated: new Date() },
      { upsert: true, new: true }
    );
    res.json(skill);
  } catch (error) {
    res.status(500).json({ message: 'Error updating skill' });
  }
});

export default router;
