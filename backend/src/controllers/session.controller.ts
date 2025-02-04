import { Request, Response, NextFunction } from 'express';
import { supabase } from '../lib/supabase';
import { Session } from '../types/database.types';
import { z } from 'zod';
import { verifyProof } from 'snarkjs';
import fs from 'fs';

const startSessionSchema = z.object({
  clientId: z.string(),
  mode: z.enum(['chat', 'voice', 'video'])
});

export class SessionController {
  async startSession(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { clientId, mode } = startSessionSchema.parse(req.body);
      const { data, error } = await supabase
        .from('sessions')
        .insert({ clientId, mode })
        .select()
        .single();

      if (error) throw error;
      res.status(201).json(data);
    } catch (error) {
      next(error);
    }
  }

  async getSessions(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { data, error } = await supabase
        .from('sessions')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      res.json(data);
    } catch (error) {
      next(error);
    }
  }

  async getSession(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const { data, error } = await supabase
        .from('sessions')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      if (!data) {
        res.status(404).json({ error: 'Session not found' });
        return;
      }
      res.json(data);
    } catch (error) {
      next(error);
    }
  }

  async updateSession(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const { data, error } = await supabase
        .from('sessions')
        .update(req.body)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      if (!data) {
        res.status(404).json({ error: 'Session not found' });
        return;
      }
      res.json(data);
    } catch (error) {
      next(error);
    }
  }

  async deleteSession(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const { error } = await supabase
        .from('sessions')
        .delete()
        .eq('id', id);

      if (error) throw error;
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  }

  async signIn(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { data: { session }, error } = await supabase.auth.signInWithPassword({
        email: req.body.email,
        password: req.body.password
      });

      if (error) throw error;
      res.json(session);
    } catch (error) {
      next(error);
    }
  }

  async signUp(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { email, password } = req.body;
      const { data, error } = await supabase.auth.signUp({ email, password });
      if (error) {
        throw error;
      }
      res.status(201).json({ user: data.user });
    } catch (error) {
      next(error);
    }
  }

  async validateSessionProof(proof: any, publicSignals: string[]) {
    const vKey = JSON.parse(fs.readFileSync('build/verification_key.json', 'utf-8'));
    return await verifyProof(vKey, proof, publicSignals);
  }
}

export default SessionController;
