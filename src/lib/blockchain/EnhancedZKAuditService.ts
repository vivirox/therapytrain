import { createHash } from "crypto";
import * as Sentry from "@sentry/node";
import { MerkleTree } from "./MerkleTree";
import { BlockchainAuditService } from "./BlockchainAuditService";
import { ZKOperation, OperationRecord } from "./types";

export class EnhancedZKAuditService {
  private operationRecords: Map<string, OperationRecord>;
  private blockchainAudit: BlockchainAuditService;

  constructor(blockchainAudit: BlockchainAuditService) {
    this.operationRecords = new Map();
    this.blockchainAudit = blockchainAudit;
  }

  public async addOperation(operation: ZKOperation): Promise<void> {
    this.operationRecords.set(operation.id, {
      operation,
      verificationStatus: 'PENDING'
    });
    await this.blockchainAudit.addOperation(operation);
    await this.verifyProof(operation.id);
  }

  public async verifyProof(operationId: string): Promise<boolean> {
    try {
      // Get the operation record
      const record = this.operationRecords.get(operationId);
      if (!record) {
        console.error(`No record found for operation: ${operationId}`);
        return false;
      }

      // Get the proof from the blockchain
      let proof = await this.blockchainAudit.getAuditProof(operationId);
      if (!proof) {
        // If no proof is found and operation is pending, wait for it to be mined
        if (record.verificationStatus === "PENDING") {
          await this.blockchainAudit.mineBlock();
          // Try getting the proof again after mining
          const minedProof = await this.blockchainAudit.getAuditProof(operationId);
          if (!minedProof) {
            console.error(`No proof available for operation after mining: ${operationId}`);
            return false;
          }
          proof = minedProof;
        } else {
          console.error(`No proof available for operation: ${operationId}`);
          return false;
        }
      }

      // Verify the operation hash matches the proof leaf
      const operationHash = this.hashOperation(record.operation);
      console.log(`Verifying proof for operation: ${operationId}`);
      console.log(`Operation hash: ${operationHash}`);
      console.log(`Proof leaf: ${proof.leaf}`);

      if (operationHash !== proof.leaf) {
        console.error("Hash mismatch - operation tampered");
        record.verificationStatus = 'FAILED';
        return false;
      }

      // Verify the Merkle proof
      const isValid = MerkleTree.verifyProof(proof);
      console.log(`Merkle proof verification: ${isValid}`);

      if (!isValid) {
        console.error(`Invalid Merkle proof for operation: ${operationId}`);
        console.error("Proof:", JSON.stringify(proof, null, 2));
        Sentry.captureException(new Error("Invalid Merkle proof"), {
          extra: {
            operationId,
            proof,
            operationHash,
          },
        });
        record.verificationStatus = 'FAILED';
        return false;
      }

      record.verificationStatus = 'VERIFIED';
      return true;
    } catch (error) {
      console.error(`Error verifying proof for operation ${operationId}:`, error);
      Sentry.captureException(error, {
        extra: {
          operationId,
        },
      });
      const record = this.operationRecords.get(operationId);
      if (record) {
        record.verificationStatus = 'FAILED';
      }
      return false;
    }
  }

  private hashOperation(operation: ZKOperation): string {
    return createHash("sha256").update(JSON.stringify(operation)).digest("hex");
  }
}
