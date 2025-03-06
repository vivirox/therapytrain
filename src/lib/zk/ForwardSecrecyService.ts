import { createHash, randomBytes } from "crypto";
import { SecurityAuditService } from "@/services/SecurityAuditService";
import { SupabaseClient, createClient } from "@supabase/supabase-js";

interface RatchetState {
  rootKey: Buffer;
  sendingChainKey: Buffer;
  receivingChainKey: Buffer;
  sendingRatchetKeyPair: { privateKey: Buffer; publicKey: Buffer };
  receivingRatchetPublicKey: Buffer;
  previousRatchetPublicKeys: Buffer[];
  messageNumbers: Map<string, number>;
  skippedMessageKeys: Map<string, Buffer>;
}

export class ForwardSecrecyService {
  private securityAudit: SecurityAuditService;
  private supabase: SupabaseClient;
  private ratchetStates: Map<string, RatchetState>;
  private readonly MAX_SKIP = 1000;
  private readonly HASH_ALG = "sha256";

  constructor(
    supabaseClient?: SupabaseClient,
    securityAudit?: SecurityAuditService,
  ) {
    this.securityAudit = securityAudit || new SecurityAuditService();
    if (supabaseClient) {
      this.supabase = supabaseClient;
    } else {
      if (
        !process.env.NEXT_PUBLIC_SUPABASE_URL ||
        !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
      ) {
        throw new Error("Supabase environment variables are required");
      }
      this.supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      );
    }
    this.ratchetStates = new Map();
  }

  public setSupabaseClient(supabaseClient: SupabaseClient): void {
    this.supabase = supabaseClient;
  }

  public async initializeRatchet(
    threadId: string,
    sharedSecret: Buffer,
    isInitiator: boolean,
  ): Promise<void> {
    const rootKey = await this.generateRootKey(sharedSecret);
    const ratchetKeyPair = await this.generateRatchetKeyPair();

    const state: RatchetState = {
      rootKey,
      sendingChainKey: isInitiator ? rootKey : Buffer.alloc(0),
      receivingChainKey: isInitiator ? Buffer.alloc(0) : rootKey,
      sendingRatchetKeyPair: ratchetKeyPair,
      receivingRatchetPublicKey: Buffer.alloc(0),
      previousRatchetPublicKeys: [],
      messageNumbers: new Map(),
      skippedMessageKeys: new Map(),
    };

    this.ratchetStates.set(threadId, state);

    await this.securityAudit.logEvent({
      type: "ratchet_initialized",
      threadId,
      isInitiator,
    });
  }

  public async ratchetEncrypt(
    threadId: string,
    message: Buffer,
  ): Promise<{
    ciphertext: Buffer;
    header: {
      publicKey: Buffer;
      messageNumber: number;
      previousChainLength: number;
    };
  }> {
    const state = this.ratchetStates.get(threadId);
    if (!state) throw new Error("Ratchet not initialized");

    // Generate message key and next chain key
    const { messageKey, nextChainKey } = await this.ratchetStep(
      state.sendingChainKey,
    );
    state.sendingChainKey = nextChainKey;

    // Encrypt message
    const ciphertext = await this.encrypt(messageKey, message);

    // Update state
    const messageNumber = state.messageNumbers.get(threadId) || 0;
    state.messageNumbers.set(threadId, messageNumber + 1);

    const header = {
      publicKey: await this.getPublicKey(
        state.sendingRatchetKeyPair.privateKey,
      ),
      messageNumber,
      previousChainLength: state.previousRatchetPublicKeys.length,
    };

    await this.securityAudit.logEvent({
      type: "message_encrypted",
      threadId,
      messageNumber,
    });

    return { ciphertext, header };
  }

  public async ratchetDecrypt(
    threadId: string,
    message: {
      ciphertext: Buffer;
      header: {
        publicKey: Buffer;
        messageNumber: number;
        previousChainLength: number;
      };
    },
  ): Promise<Buffer> {
    const state = this.ratchetStates.get(threadId);
    if (!state) throw new Error("Ratchet not initialized");

    // Try to decrypt with skipped message keys
    const skippedKey = this.trySkippedMessageKeys(state, message.header);
    if (skippedKey) {
      return await this.decrypt(skippedKey, message.ciphertext);
    }

    // Perform ratchet steps if needed
    if (!state.receivingRatchetPublicKey.equals(message.header.publicKey)) {
      await this.performRatchetSteps(state, message.header);
    }

    // Generate message key and next chain key
    const { messageKey, nextChainKey } = await this.ratchetStep(
      state.receivingChainKey,
    );
    state.receivingChainKey = nextChainKey;

    await this.securityAudit.logEvent({
      type: "message_decrypted",
      threadId,
      messageNumber: message.header.messageNumber,
    });

    return await this.decrypt(messageKey, message.ciphertext);
  }

  private async generateRootKey(sharedSecret: Buffer): Promise<Buffer> {
    // Use HKDF to derive root key
    const key = await window.crypto.subtle.importKey(
      "raw",
      sharedSecret,
      { name: "HKDF" },
      false,
      ["deriveBits"],
    );

    const rootKey = await window.crypto.subtle.deriveBits(
      {
        name: "HKDF",
        hash: "SHA-256",
        salt: new Uint8Array(32),
        info: new TextEncoder().encode("RootKey"),
      },
      key,
      256,
    );

    return Buffer.from(rootKey);
  }

  private async generateRatchetKeyPair(): Promise<{
    privateKey: Buffer;
    publicKey: Buffer;
  }> {
    const keyPair = await window.crypto.subtle.generateKey(
      {
        name: "ECDH",
        namedCurve: "P-256",
      },
      true,
      ["deriveKey", "deriveBits"],
    );

    const privateKeyBuffer = await window.crypto.subtle.exportKey(
      "raw",
      keyPair.privateKey,
    );
    const publicKeyBuffer = await window.crypto.subtle.exportKey(
      "raw",
      keyPair.publicKey,
    );

    return {
      privateKey: Buffer.from(privateKeyBuffer),
      publicKey: Buffer.from(publicKeyBuffer),
    };
  }

  private async ratchetStep(
    chainKey: Buffer,
  ): Promise<{ messageKey: Buffer; nextChainKey: Buffer }> {
    // Import chain key
    const key = await window.crypto.subtle.importKey(
      "raw",
      chainKey,
      { name: "HKDF" },
      false,
      ["deriveBits"],
    );

    // Derive message key
    const messageKeyBits = await window.crypto.subtle.deriveBits(
      {
        name: "HKDF",
        hash: "SHA-256",
        salt: new Uint8Array(32),
        info: new TextEncoder().encode("MessageKey"),
      },
      key,
      256,
    );

    // Derive next chain key
    const nextChainKeyBits = await window.crypto.subtle.deriveBits(
      {
        name: "HKDF",
        hash: "SHA-256",
        salt: new Uint8Array(32),
        info: new TextEncoder().encode("ChainKey"),
      },
      key,
      256,
    );

    return {
      messageKey: Buffer.from(messageKeyBits),
      nextChainKey: Buffer.from(nextChainKeyBits),
    };
  }

  private async encrypt(key: Buffer, message: Buffer): Promise<Buffer> {
    // Import key for encryption
    const cryptoKey = await window.crypto.subtle.importKey(
      "raw",
      key,
      { name: "AES-GCM" },
      false,
      ["encrypt"],
    );

    // Generate IV
    const iv = window.crypto.getRandomValues(new Uint8Array(12));

    // Encrypt
    const ciphertext = await window.crypto.subtle.encrypt(
      {
        name: "AES-GCM",
        iv,
        tagLength: 128,
      },
      cryptoKey,
      message,
    );

    // Combine IV and ciphertext
    return Buffer.concat([Buffer.from(iv), Buffer.from(ciphertext)]);
  }

  private async decrypt(key: Buffer, ciphertext: Buffer): Promise<Buffer> {
    // Import key for decryption
    const cryptoKey = await window.crypto.subtle.importKey(
      "raw",
      key,
      { name: "AES-GCM" },
      false,
      ["decrypt"],
    );

    // Split IV and ciphertext
    const iv = ciphertext.slice(0, 12);
    const encryptedData = ciphertext.slice(12);

    // Decrypt
    const plaintext = await window.crypto.subtle.decrypt(
      {
        name: "AES-GCM",
        iv,
        tagLength: 128,
      },
      cryptoKey,
      encryptedData,
    );

    return Buffer.from(plaintext);
  }

  private async getPublicKey(privateKey: Buffer): Promise<Buffer> {
    // In a real implementation, this would use proper elliptic curve cryptography
    return createHash(this.HASH_ALG).update(privateKey).digest();
  }

  private trySkippedMessageKeys(
    state: RatchetState,
    header: { publicKey: Buffer; messageNumber: number },
  ): Buffer | null {
    const key = `${header.publicKey.toString("hex")}-${header.messageNumber}`;
    const messageKey = state.skippedMessageKeys.get(key);
    if (messageKey) {
      state.skippedMessageKeys.delete(key);
      return messageKey;
    }
    return null;
  }

  private async performRatchetSteps(
    state: RatchetState,
    header: {
      publicKey: Buffer;
      messageNumber: number;
      previousChainLength: number;
    },
  ): Promise<void> {
    // Store current receiving chain key for skipped messages
    if (state.receivingChainKey.length > 0) {
      state.previousRatchetPublicKeys.push(state.receivingRatchetPublicKey);
    }

    // Import keys for DH
    const privateKey = await window.crypto.subtle.importKey(
      "raw",
      state.sendingRatchetKeyPair.privateKey,
      {
        name: "ECDH",
        namedCurve: "P-256",
      },
      true,
      ["deriveKey", "deriveBits"],
    );

    const publicKey = await window.crypto.subtle.importKey(
      "raw",
      header.publicKey,
      {
        name: "ECDH",
        namedCurve: "P-256",
      },
      true,
      [],
    );

    // Perform DH and derive new root key
    const dhResult = await window.crypto.subtle.deriveBits(
      {
        name: "ECDH",
        public: publicKey,
      },
      privateKey,
      256,
    );

    // Import current root key
    const rootKey = await window.crypto.subtle.importKey(
      "raw",
      state.rootKey,
      { name: "HKDF" },
      false,
      ["deriveBits"],
    );

    // Derive new root key and chain key
    const newKeys = await window.crypto.subtle.deriveBits(
      {
        name: "HKDF",
        hash: "SHA-256",
        salt: Buffer.from(dhResult),
        info: new TextEncoder().encode("RatchetStep"),
      },
      rootKey,
      512, // 256 bits for root key + 256 bits for chain key
    );

    // Update state
    state.rootKey = Buffer.from(newKeys.slice(0, 32));
    state.receivingChainKey = Buffer.from(newKeys.slice(32));
    state.receivingRatchetPublicKey = header.publicKey;

    // Generate new sending ratchet key pair
    state.sendingRatchetKeyPair = await this.generateRatchetKeyPair();
  }
}
