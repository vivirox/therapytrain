pragma circom 2.1.4;

include "circomlib/poseidon.circom";
include "circomlib/eddsa.circom";
include "circomlib/comparators.circom";
include "circomlib/bitify.circom";
include "circomlib/multiplexer.circom";

// Enhanced circuit for comprehensive session data validation
template SessionDataCircuit() {
    // Public inputs
    signal input sessionId;
    signal input startTimestamp;
    signal input endTimestamp;
    signal input therapistPubKey[256];
    signal input therapistCredentialHash;
    signal input maxSessionDuration; // Maximum allowed session duration

    // Private inputs
    signal private input sessionData[8]; // Extended session data chunks
    signal private input therapistSigR8[256]; // EdDSA signature R8 point
    signal private input therapistSigS[256]; // EdDSA signature S value
    signal private input therapistCredential[4]; // Credential components
    signal private input metadataFlags[4]; // Session metadata flags

    // Intermediate signals
    signal sessionHash;
    signal validSignature;
    signal validDuration;
    signal validTimestamp;
    signal validCredential;
    signal metadataHash;

    // Timestamp validation components
    component timeRangeCheck = LessThan(64);
    timeRangeCheck.in[0] <== endTimestamp - startTimestamp;
    timeRangeCheck.in[1] <== maxSessionDuration;
    validDuration <== timeRangeCheck.out;

    // Current time should be after start time
    component timeOrderCheck = GreaterThan(64);
    timeOrderCheck.in[0] <== endTimestamp;
    timeOrderCheck.in[1] <== startTimestamp;
    validTimestamp <== timeOrderCheck.out;

    // Hash the expanded session data using Poseidon
    component sessionHasher = Poseidon(8);
    for (var i = 0; i < 8; i++) {
        sessionHasher.inputs[i] <== sessionData[i];
    }
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
    validCredential <== (credentialHasher.out === therapistCredentialHash);

    // Verify therapist signature
    component signatureVerifier = EdDSAVerifier();
    for (var i = 0; i < 256; i++) {
        signatureVerifier.pubKey[i] <== therapistPubKey[i];
        signatureVerifier.R8[i] <== therapistSigR8[i];
        signatureVerifier.S[i] <== therapistSigS[i];
    }

    // Create composite message for signature (session + metadata)
    component compositeHasher = Poseidon(3);
    compositeHasher.inputs[0] <== sessionHash;
    compositeHasher.inputs[1] <== metadataHash;
    compositeHasher.inputs[2] <== startTimestamp;
    
    signatureVerifier.M <== compositeHasher.out;
    validSignature <== signatureVerifier.valid;

    // Final constraints
    validSignature === 1;
    validDuration === 1;
    validTimestamp === 1;
    validCredential === 1;
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
