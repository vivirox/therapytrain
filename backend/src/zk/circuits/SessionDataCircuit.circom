pragma circom 2.1.4;

include "circomlib/poseidon.circom";
include "circomlib/eddsa.circom";

// Circuit for proving session data integrity without revealing content
template SessionDataCircuit() {
    // Public inputs
    signal input sessionId;
    signal input timestamp;
    signal input therapistPubKey[256];

    // Private inputs
    signal private input sessionData[4]; // Hashed session data chunks
    signal private input therapistSigR8[256]; // EdDSA signature R8 point
    signal private input therapistSigS[256]; // EdDSA signature S value

    // Intermediate signals
    signal sessionHash;
    signal validSignature;

    // Hash the session data using Poseidon
    component hasher = Poseidon(4);
    for (var i = 0; i < 4; i++) {
        hasher.inputs[i] <== sessionData[i];
    }
    sessionHash <== hasher.out;

    // Verify therapist signature
    component signatureVerifier = EdDSAVerifier();
    for (var i = 0; i < 256; i++) {
        signatureVerifier.pubKey[i] <== therapistPubKey[i];
        signatureVerifier.R8[i] <== therapistSigR8[i];
        signatureVerifier.S[i] <== therapistSigS[i];
    }
    signatureVerifier.M <== sessionHash;
    validSignature <== signatureVerifier.valid;

    // Constraint: signature must be valid
    validSignature === 1;
}
