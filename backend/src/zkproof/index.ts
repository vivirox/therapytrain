import { ProofGenerationInput, ProofOutput, ZKUtils } from '@/zk/types';
import { Worker } from 'worker_threads';
import path from 'path';
import crypto from 'crypto';

export interface SessionData {
    id: string;
    messages: Array<{
        content: string;
        role: string;
        timestamp: number;
    }>;
    metadata: {
        therapistId: string;
        clientId: string;
        startTime: number;
        endTime?: number;
    };
}

export interface ProofData {
    sessionId: string;
    proofHex: string;
    publicInputs: string[];
    timestamp: number;
    metadata?: Record<string, any>;
}

export class ZKProofService {
    private static instance: ZKProofService;
    private readonly workers: Worker[] = [];
    private readonly maxWorkers = 4;
    private readonly taskQueue: Array<{
        input: ProofGenerationInput;
        resolve: (result: ProofOutput) => void;
        reject: (error: Error) => void;
    }> = [];

    private constructor() {
        for (let i = 0; i < this.maxWorkers; i++) {
            this.workers.push(new Worker(path.join(__dirname, 'workers', 'proof.worker.js')));
        }

        this.workers.forEach(worker => {
            worker.on('message', ({ result, error, taskId }) => {
                if (error) {
                    this.handleWorkerError(taskId, new Error(error));
                } else {
                    this.handleWorkerSuccess(taskId, result);
                }
            });

            worker.on('error', error => {
                console.error('Worker error:', error);
            });
        });
    }

    public static getInstance(): ZKProofService {
        if (!ZKProofService.instance) {
            ZKProofService.instance = new ZKProofService();
        }
        return ZKProofService.instance;
    }

    public async generateProof(input: ProofGenerationInput): Promise<ProofOutput> {
        return new Promise((resolve, reject) => {
            const taskId = crypto.randomBytes(16).toString('hex');
            this.taskQueue.push({ input, resolve, reject });
            this.processNextTask();
        });
    }

    public async verifyProof(proof: ProofOutput): Promise<boolean> {
        // Implement proof verification logic
        return true;
    }

    private processNextTask(): void {
        if (this.taskQueue.length === 0) return;

        const availableWorker = this.workers.find(worker => 
            worker.threadId && !worker.threadId.toString().includes('busy')
        );

        if (!availableWorker) return;

        const task = this.taskQueue.shift();
        if (!task) return;

        availableWorker.postMessage({
            input: task.input,
            taskId: crypto.randomBytes(16).toString('hex')
        });
    }

    private handleWorkerSuccess(taskId: string, result: ProofOutput): void {
        const taskIndex = this.taskQueue.findIndex(task => task.input.metadata.sessionId === taskId);
        if (taskIndex === -1) return;

        const task = this.taskQueue[taskIndex];
        task.resolve(result);
        this.taskQueue.splice(taskIndex, 1);
        this.processNextTask();
    }

    private handleWorkerError(taskId: string, error: Error): void {
        const taskIndex = this.taskQueue.findIndex(task => task.input.metadata.sessionId === taskId);
        if (taskIndex === -1) return;

        const task = this.taskQueue[taskIndex];
        task.reject(error);
        this.taskQueue.splice(taskIndex, 1);
        this.processNextTask();
    }
}

export const zkProofService = ZKProofService.getInstance(); 