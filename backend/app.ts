import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import educationRoutes from './routes/education';
import authMiddleware from './middleware/authMiddleware'; // Import the auth middleware

dotenv.config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(authMiddleware); // Use the auth middleware

// Routes
app.use('/api/education', educationRoutes);

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
