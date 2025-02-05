import { AccountRecoveryService } from '../AccountRecoveryService';
import { SecurityAuditService } from '../../services/SecurityAuditService';
import bcrypt from 'bcrypt';

jest.mock('../../services/SecurityAuditService');
jest.mock('bcrypt');

describe('AccountRecoveryService', () => {
    let accountRecoveryService: AccountRecoveryService;
    let mockSecurityAuditService: jest.Mocked<SecurityAuditService>;
    const mockUserId = 'test-user-id';

    beforeEach(() => {
        mockSecurityAuditService = {
            recordAlert: jest.fn()
        } as any;

        accountRecoveryService = new AccountRecoveryService(mockSecurityAuditService);

        // Mock bcrypt functions
        (bcrypt.hash as jest.Mock).mockImplementation((value) => Promise.resolve(`hashed_${value}`));
        (bcrypt.compare as jest.Mock).mockImplementation((value, hash) =>
            Promise.resolve(hash === `hashed_${value}`)
        );

        jest.clearAllMocks();
    });

    describe('Backup Codes', () => {
        it('should generate backup codes successfully', async () => {
            const codes = await accountRecoveryService.generateBackupCodes(mockUserId);

            expect(codes).toHaveLength(10);
            expect(codes.every(code => code.length === 10)).toBe(true);
            expect(mockSecurityAuditService.recordAlert).toHaveBeenCalledWith(
                'BACKUP_CODES_GENERATED',
                'LOW',
                expect.objectContaining({
                    userId: mockUserId,
                    count: 10
                })
            );
        });

        it('should handle backup code generation errors', async () => {
            const error = new Error('Generation failed');
            (bcrypt.hash as jest.Mock).mockRejectedValueOnce(error);

            await expect(
                accountRecoveryService.generateBackupCodes(mockUserId)
            ).rejects.toThrow(error);

            expect(mockSecurityAuditService.recordAlert).toHaveBeenCalledWith(
                'BACKUP_CODE_GENERATION_ERROR',
                'HIGH',
                expect.objectContaining({
                    userId: mockUserId,
                    error: error.message
                })
            );
        });

        it('should rotate backup codes', async () => {
            const newCodes = await accountRecoveryService.rotateBackupCodes(mockUserId);

            expect(newCodes).toHaveLength(10);
            expect(mockSecurityAuditService.recordAlert).toHaveBeenCalledWith(
                'BACKUP_CODES_ROTATED',
                'LOW',
                expect.objectContaining({
                    userId: mockUserId
                })
            );
        });
    });

    describe('Security Questions', () => {
        const mockQuestions = [
            { question: 'What is your mother\'s maiden name?', answer: 'Smith' },
            { question: 'What was your first pet\'s name?', answer: 'Fluffy' }
        ];

        it('should set security questions successfully', async () => {
            await accountRecoveryService.setSecurityQuestions(mockUserId, mockQuestions);

            expect(mockSecurityAuditService.recordAlert).toHaveBeenCalledWith(
                'SECURITY_QUESTIONS_SET',
                'LOW',
                expect.objectContaining({
                    userId: mockUserId,
                    questionCount: mockQuestions.length
                })
            );
        });

        it('should handle security question errors', async () => {
            const error = new Error('Failed to set questions');
            (bcrypt.hash as jest.Mock).mockRejectedValueOnce(error);

            await expect(
                accountRecoveryService.setSecurityQuestions(mockUserId, mockQuestions)
            ).rejects.toThrow(error);

            expect(mockSecurityAuditService.recordAlert).toHaveBeenCalledWith(
                'SECURITY_QUESTIONS_ERROR',
                'HIGH',
                expect.objectContaining({
                    userId: mockUserId,
                    error: error.message
                })
            );
        });

        it('should validate security question answers', async () => {
            const storedQuestions = [
                {
                    id: '1',
                    question: 'What is your mother\'s maiden name?',
                    hashedAnswer: 'hashed_smith'
                },
                {
                    id: '2',
                    question: 'What was your first pet\'s name?',
                    hashedAnswer: 'hashed_fluffy'
                }
            ];

            const answers = [
                { questionId: '1', answer: 'smith' },
                { questionId: '2', answer: 'fluffy' }
            ];

            const isValid = await accountRecoveryService.validateSecurityQuestionAnswers(
                storedQuestions,
                answers
            );

            expect(isValid).toBe(true);
        });

        it('should reject invalid security question answers', async () => {
            const storedQuestions = [
                {
                    id: '1',
                    question: 'What is your mother\'s maiden name?',
                    hashedAnswer: 'hashed_smith'
                }
            ];

            const answers = [
                { questionId: '1', answer: 'wrong_answer' }
            ];

            const isValid = await accountRecoveryService.validateSecurityQuestionAnswers(
                storedQuestions,
                answers
            );

            expect(isValid).toBe(false);
        });
    });

    describe('Backup Code Expiry', () => {
        it('should check backup code expiry', async () => {
            const expiredCodes = await accountRecoveryService.checkBackupCodesExpiry(mockUserId);

            expect(Array.isArray(expiredCodes)).toBe(true);
            expect(mockSecurityAuditService.recordAlert).toHaveBeenCalledWith(
                'BACKUP_CODES_EXPIRY_CHECKED',
                'LOW',
                expect.objectContaining({
                    userId: mockUserId,
                    expiryDate: expect.any(Date)
                })
            );
        });

        it('should handle expiry check errors', async () => {
            const error = new Error('Failed to check expiry');
            jest.spyOn(mockSecurityAuditService, 'recordAlert')
                .mockRejectedValueOnce(error);

            await expect(
                accountRecoveryService.checkBackupCodesExpiry(mockUserId)
            ).rejects.toThrow(error);

            expect(mockSecurityAuditService.recordAlert).toHaveBeenCalledWith(
                'BACKUP_CODES_EXPIRY_CHECK_ERROR',
                'HIGH',
                expect.objectContaining({
                    userId: mockUserId,
                    error: error.message
                })
            );
        });
    });
}); 