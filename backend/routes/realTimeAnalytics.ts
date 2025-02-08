import express, { Request, Response, NextFunction } from 'express';
import { Router, Request, Response, NextFunction } from "express";

const router: Router = express.Router();
// Endpoint has been removed due to errors
router.post('/', (req, res) => {
    res.status(400).json({ message: 'This endpoint has been removed due to errors.' });
});
export default router;
