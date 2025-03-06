import { SecureBackupService } from "../SecureBackupService";
import { SecurityAuditService } from "../SecurityAuditService";
import { HIPAACompliantAuditService } from "../HIPAACompliantAuditService";
import {
  EncryptionKeyRotationService,
  KeyPurpose,
} from "../EncryptionKeyRotationService";
import * as fs from "fs/promises";
import * as path from "path";
import os from "os";
jest.mock("./SecurityAuditService");
jest.mock("./HIPAACompliantAuditService");
jest.mock("./EncryptionKeyRotationService");
describe("SecureBackupService", () => {
  let backupService: SecureBackupService;
  let mockSecurityAuditService: jest.Mocked<SecurityAuditService>;
  let mockHipaaAuditService: jest.Mocked<HIPAACompliantAuditService>;
  let mockKeyRotationService: jest.Mocked<EncryptionKeyRotationService>;
  let tempDir: string;
  let testDataDir: string;
  beforeEach(async () => {
    mockSecurityAuditService = {
      recordAlert: jest.fn().mockResolvedValue(undefined),
    } as any;
    mockHipaaAuditService = {
      logEvent: jest.fn().mockResolvedValue("test-event-id"),
    } as any;
    mockKeyRotationService = {
      getActiveKey: jest.fn().mockResolvedValue({
        id: "test-key",
        algorithm: "aes-256-gcm",
        keyMaterial: Buffer.from("test-key-material"),
        iv: Buffer.from("test-iv"),
      }),
      getKey: jest.fn().mockResolvedValue({
        id: "test-key",
        algorithm: "aes-256-gcm",
        keyMaterial: Buffer.from("test-key-material"),
        iv: Buffer.from("test-iv"),
      }),
    } as any;
    // Create temporary directories
    tempDir = path.join(
      os.tmpdir(),
      "backup-test-" + Math.random().toString(36).slice(2),
    );
    testDataDir = path.join(tempDir, "test-data");
    await fs.mkdir(tempDir, { recursive: true });
    await fs.mkdir(testDataDir, { recursive: true });
    backupService = new SecureBackupService(
      mockSecurityAuditService,
      mockHipaaAuditService,
      mockKeyRotationService,
      tempDir,
    );
    await backupService.initialize();
  });
  afterEach(async () => {
    await backupService.cleanup();
    // Clean up temporary directories
    await fs.rm(tempDir, { recursive: true, force: true });
  });
  describe("Initialization", () => {
    it("should create required directories", async () => {
      const backupPath = path.join(tempDir);
      const metadataPath = path.join(tempDir, "metadata");
      const tempPath = path.join(tempDir, "temp");
      const [backupExists, metadataExists, tempExists] = await Promise.all([
        fs
          .stat(backupPath)
          .then(() => true)
          .catch(() => false),
        fs
          .stat(metadataPath)
          .then(() => true)
          .catch(() => false),
        fs
          .stat(tempPath)
          .then(() => true)
          .catch(() => false),
      ]);
      expect(backupExists).toBe(true);
      expect(metadataExists).toBe(true);
      expect(tempExists).toBe(true);
    });
    it("should create data type directories", async () => {
      const phiPath = path.join(tempDir, "PHI");
      const auditPath = path.join(tempDir, "AUDIT_LOGS");
      const configPath = path.join(tempDir, "SYSTEM_CONFIG");
      const [phiExists, auditExists, configExists] = await Promise.all([
        fs
          .stat(phiPath)
          .then(() => true)
          .catch(() => false),
        fs
          .stat(auditPath)
          .then(() => true)
          .catch(() => false),
        fs
          .stat(configPath)
          .then(() => true)
          .catch(() => false),
      ]);
      expect(phiExists).toBe(true);
      expect(auditExists).toBe(true);
      expect(configExists).toBe(true);
    });
    it("should handle initialization errors", async () => {
      jest
        .spyOn(fs, "mkdir")
        .mockRejectedValueOnce(new Error("Directory creation failed"));
      await expect(backupService.initialize()).rejects.toThrow();
      expect(mockSecurityAuditService.recordAlert).toHaveBeenCalledWith(
        "BACKUP_SERVICE_INIT_ERROR",
        "HIGH",
        expect.any(Object),
      );
    });
  });
  describe("Backup Creation", () => {
    it("should create encrypted and compressed backup", async () => {
      // Create test file
      const testFile = path.join(testDataDir, "test.txt");
      await fs.writeFile(testFile, "test data".repeat(1000)); // Create some sizeable data
      const metadata = await backupService.createBackup("PHI", testFile);
      expect(metadata.id).toBeDefined();
      expect(metadata.encryptionKeyId).toBeDefined();
      expect(metadata.compressionRatio).toBeGreaterThan(1);
      expect(metadata.hash).toBeDefined();
      expect(metadata.verificationStatus).toBe("SUCCESS");
      // Verify backup file exists
      const backupPath = path.join(
        tempDir,
        "PHI",
        `backup-${metadata.id}-${metadata.timestamp.toISOString()}.bak`,
      );
      const exists = await fs
        .stat(backupPath)
        .then(() => true)
        .catch(() => false);
      expect(exists).toBe(true);
      expect(mockHipaaAuditService.logEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: "SYSTEM_OPERATION",
          action: {
            type: "CREATE",
            status: "SUCCESS",
          },
        }),
      );
    });
    it("should handle backup creation errors", async () => {
      jest.spyOn(fs, "stat").mockRejectedValueOnce(new Error("File not found"));
      await expect(
        backupService.createBackup("PHI", "nonexistent.txt"),
      ).rejects.toThrow();
      expect(mockSecurityAuditService.recordAlert).toHaveBeenCalledWith(
        "BACKUP_CREATE_ERROR",
        "HIGH",
        expect.any(Object),
      );
    });
    it("should reject invalid data types", async () => {
      await expect(
        backupService.createBackup("INVALID_TYPE", "test.txt"),
      ).rejects.toThrow("No backup configuration found");
    });
  });
  describe("Backup Verification", () => {
    it("should verify backup successfully", async () => {
      // Create test file and backup
      const testFile = path.join(testDataDir, "test.txt");
      await fs.writeFile(testFile, "test data");
      const metadata = await backupService.createBackup("PHI", testFile);
      const result = await backupService.verifyBackup(metadata.id);
      expect(result.isValid).toBe(true);
      expect(result.details.hashMatch).toBe(true);
      expect(result.details.sizeMatch).toBe(true);
      expect(result.details.decryptionSuccess).toBe(true);
      expect(mockHipaaAuditService.logEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: "SYSTEM_OPERATION",
          action: {
            type: "UPDATE",
            status: "SUCCESS",
          },
        }),
      );
    });
    it("should detect corrupted backups", async () => {
      // Create test file and backup
      const testFile = path.join(testDataDir, "test.txt");
      await fs.writeFile(testFile, "test data");
      const metadata = await backupService.createBackup("PHI", testFile);
      // Corrupt the backup file
      const backupPath = path.join(
        tempDir,
        "PHI",
        `backup-${metadata.id}-${metadata.timestamp.toISOString()}.bak`,
      );
      await fs.appendFile(backupPath, "corruption");
      const result = await backupService.verifyBackup(metadata.id);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain("Backup hash mismatch");
    });
    it("should handle verification errors", async () => {
      jest.spyOn(fs, "stat").mockRejectedValueOnce(new Error("File not found"));
      await expect(
        backupService.verifyBackup("nonexistent-id"),
      ).rejects.toThrow();
      expect(mockSecurityAuditService.recordAlert).toHaveBeenCalledWith(
        "BACKUP_VERIFY_ERROR",
        "HIGH",
        expect.any(Object),
      );
    });
  });
  describe("Restoration Testing", () => {
    it("should test restoration successfully", async () => {
      // Create test file and backup
      const testFile = path.join(testDataDir, "test.txt");
      await fs.writeFile(testFile, "test data");
      const metadata = await backupService.createBackup("PHI", testFile);
      const restorationPath = path.join(testDataDir, "restored.txt");
      await backupService.testRestoration(metadata.id, restorationPath);
      // Verify restored file
      const originalContent = await fs.readFile(testFile, "utf-8");
      const restoredContent = await fs.readFile(restorationPath, "utf-8");
      expect(restoredContent).toBe(originalContent);
      expect(mockHipaaAuditService.logEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: "SYSTEM_OPERATION",
          action: {
            type: "UPDATE",
            status: "SUCCESS",
          },
        }),
      );
    });
    it("should handle restoration errors", async () => {
      jest.spyOn(fs, "stat").mockRejectedValueOnce(new Error("File not found"));
      await expect(
        backupService.testRestoration("nonexistent-id", "restored.txt"),
      ).rejects.toThrow();
      expect(mockSecurityAuditService.recordAlert).toHaveBeenCalledWith(
        "BACKUP_RESTORE_TEST_ERROR",
        "HIGH",
        expect.any(Object),
      );
    });
    it("should detect size mismatches during restoration", async () => {
      // Create test file and backup
      const testFile = path.join(testDataDir, "test.txt");
      await fs.writeFile(testFile, "test data");
      const metadata = await backupService.createBackup("PHI", testFile);
      // Mock stats to return wrong size
      jest.spyOn(fs, "stat").mockResolvedValueOnce({
        size: 999999,
      } as any);
      const restorationPath = path.join(testDataDir, "restored.txt");
      await expect(
        backupService.testRestoration(metadata.id, restorationPath),
      ).rejects.toThrow("Restored file size mismatch");
    });
  });
  describe("Cleanup", () => {
    it("should clear schedules and temp files", async () => {
      // Create some temp files
      const tempFile = path.join(tempDir, "temp", "test.tmp");
      await fs.writeFile(tempFile, "test data");
      await backupService.cleanup();
      // Verify temp directory is empty
      const tempFiles = await fs.readdir(path.join(tempDir, "temp"));
      expect(tempFiles).toHaveLength(0);
      expect(mockSecurityAuditService.recordAlert).not.toHaveBeenCalled();
    });
    it("should handle cleanup errors", async () => {
      jest.spyOn(fs, "rm").mockRejectedValueOnce(new Error("Cleanup failed"));
      await expect(backupService.cleanup()).rejects.toThrow();
      expect(mockSecurityAuditService.recordAlert).toHaveBeenCalledWith(
        "BACKUP_SERVICE_CLEANUP_ERROR",
        "HIGH",
        expect.any(Object),
      );
    });
  });
});
