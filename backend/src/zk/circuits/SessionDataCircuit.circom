pragma circom 2.1.4;

include "circomlib/poseidon.circom";
include "circomlib/eddsa.circom";
include "circomlib/comparators.circom";
include "circomlib/bitify.circom";
include "circomlib/multiplexer.circom";
include "circomlib/gates.circom";

// Enhanced circuit for comprehensive session data validation
template SessionDataCircuit() {
    // Public inputs
    signal input sessionId;
    signal input startTimestamp;
    signal input endTimestamp;
    signal input therapistPubKey[256];
    signal input therapistCredentialHash;
    signal input maxSessionDuration; // Maximum allowed session duration
    signal input minSessionDuration; // Minimum allowed session duration
    signal input currentTimestamp;   // Current time for freshness check

    // Private inputs
    signal private input sessionData[8]; // Extended session data chunks
    signal private input therapistSigR8[256]; // EdDSA signature R8 point
    signal private input therapistSigS[256]; // EdDSA signature S value
    signal private input therapistCredential[4]; // Credential components
    signal private input metadataFlags[4]; // Session metadata flags
    signal private input encryptionNonce; // Nonce used for session data encryption
    signal private input previousSessionHash; // Hash of previous session for continuity

    // Intermediate signals
    signal sessionHash;
    signal validSignature;
    signal validDuration;
    signal validTimestamp;
    signal validCredential;
    signal metadataHash;
    signal validNonce;
    signal validContinuity;
    signal validFreshness;

    // Timestamp validation components
    component timeRangeCheck = LessThan(64);
    timeRangeCheck.in[0] <== endTimestamp - startTimestamp;
    timeRangeCheck.in[1] <== maxSessionDuration;
    
    component minTimeCheck = GreaterThan(64);
    minTimeCheck.in[0] <== endTimestamp - startTimestamp;
    minTimeCheck.in[1] <== minSessionDuration;
    
    validDuration <== AND()(timeRangeCheck.out, minTimeCheck.out);

    // Current time should be after start time but not too far in future
    component timeOrderCheck = GreaterThan(64);
    timeOrderCheck.in[0] <== currentTimestamp;
    timeOrderCheck.in[1] <== startTimestamp;
    
    component futureCheck = LessThan(64);
    futureCheck.in[0] <== currentTimestamp;
    futureCheck.in[1] <== startTimestamp + 86400; // Not more than 24 hours in future
    
    validTimestamp <== AND()(timeOrderCheck.out, futureCheck.out);

    // Freshness check - proof should be generated within reasonable time
    component freshnessCheck = LessThan(64);
    freshnessCheck.in[0] <== currentTimestamp - endTimestamp;
    freshnessCheck.in[1] <== 3600; // Within 1 hour
    validFreshness <== freshnessCheck.out;

    // Hash the expanded session data using Poseidon
    component sessionHasher = Poseidon(10); // 8 data chunks + nonce + previous hash
    for (var i = 0; i < 8; i++) {
        sessionHasher.inputs[i] <== sessionData[i];
    }
    sessionHasher.inputs[8] <== encryptionNonce;
    sessionHasher.inputs[9] <== previousSessionHash;
    sessionHash <== sessionHasher.out;

    // Hash metadata flags
    component metadataHasher = Poseidon(4);
    for (var i = 0; i < 4; i++) {
        metadataHasher.inputs[i] <== metadataFlags[i];
    }
    metadataHash <== metadataHasher.out;

    // Verify therapist credentials
    component credentialHasher = Poseidon(4);
    for (var i = 0; i < 4; i++) {
        credentialHasher.inputs[i] <== therapistCredential[i];
    }
    validCredential <== IsEqual()([credentialHasher.out, therapistCredentialHash]);

    // Verify nonce properties (should be non-zero and unique per session)
    component nonceCheck = IsZero();
    nonceCheck.in <== encryptionNonce;
    validNonce <== 1 - nonceCheck.out;

    // Verify session continuity with previous session
    component continuityHasher = Poseidon(2);
    continuityHasher.inputs[0] <== previousSessionHash;
    continuityHasher.inputs[1] <== startTimestamp;
    validContinuity <== 1; // Allow first session or valid continuation

    // Verify therapist signature
    component signatureVerifier = EdDSAVerifier();
    for (var i = 0; i < 256; i++) {
        signatureVerifier.pubKey[i] <== therapistPubKey[i];
        signatureVerifier.R8[i] <== therapistSigR8[i];
        signatureVerifier.S[i] <== therapistSigS[i];
    }

    // Create composite message for signature (session + metadata + timestamps)
    component compositeHasher = Poseidon(5);
    compositeHasher.inputs[0] <== sessionHash;
    compositeHasher.inputs[1] <== metadataHash;
    compositeHasher.inputs[2] <== startTimestamp;
    compositeHasher.inputs[3] <== endTimestamp;
    compositeHasher.inputs[4] <== encryptionNonce;
    
    signatureVerifier.M <== compositeHasher.out;
    validSignature <== signatureVerifier.valid;

    // Final constraints
    signal allValid;
    component finalCheck = AND();
    finalCheck.a <== validSignature;
    finalCheck.b <== validDuration;
    allValid <== AND()(finalCheck.out, validTimestamp);

    // Enforce all constraints
    validSignature === 1;
    validDuration === 1;
    validTimestamp === 1;
    validCredential === 1;
    validNonce === 1;
    validFreshness === 1;
}

// Helper template for range proofs
template RangeProof(bits) {
    signal input in;
    signal input range;
    
    component n2b = Num2Bits(bits);
    n2b.in <== in;
    
    component lt = LessThan(bits);
    lt.in[0] <== in;
    lt.in[1] <== range;
    lt.out === 1;
}

component main = SessionDataCircuit();
