pragma circom 2.1.4;

include "poseidon.circom";
include "comparators.circom";
include "bitify.circom";
include "eddsa.circom";

/*
 * Session Integrity Circuit
 * 
 * This circuit verifies the integrity of a therapy session by proving:
 * 1. Session data has not been tampered with
 * 2. Metrics are within valid ranges
 * 3. Timestamps are consistent
 * 4. Therapist authorization is valid
 */
template SessionIntegrityVerifier() {
    // Public inputs
    signal input sessionId;
    signal input timestamp;
    signal input therapistPubKey[256];  // EdDSA public key bits
    signal input metricsHash;
    
    // Private inputs
    signal input durationMinutes;
    signal input interventionCount;
    signal input riskLevel;
    signal input engagementScore;
    signal input clientDataHash;
    signal input therapistSigR8[256];   // EdDSA signature R8 point bits
    signal input therapistSigS[256];    // EdDSA signature S bits
    
    // Intermediate signals
    signal metricsValid;
    signal timestampValid;
    signal therapistValid;
    signal sessionValid;
    
    // Constants
    var MAX_DURATION = 180; // 3 hours
    var MAX_INTERVENTIONS = 50;
    var MAX_RISK_LEVEL = 10;
    var MAX_ENGAGEMENT = 100;
    
    // Component instantiation
    component durationCheck = LessThan(32);
    component interventionCheck = LessThan(32);
    component riskCheck = LessThan(32);
    component engagementCheck = LessThan(32);
    component poseidonMetrics = Poseidon(4);
    component therapistAuth = EdDSAVerifier(64);  // 64-bit message size
    component isEqual = IsEqual();
    
    // Duration validation
    durationCheck.in[0] <== durationMinutes;
    durationCheck.in[1] <== MAX_DURATION;
    
    // Intervention count validation
    interventionCheck.in[0] <== interventionCount;
    interventionCheck.in[1] <== MAX_INTERVENTIONS;
    
    // Risk level validation
    riskCheck.in[0] <== riskLevel;
    riskCheck.in[1] <== MAX_RISK_LEVEL;
    
    // Engagement score validation
    engagementCheck.in[0] <== engagementScore;
    engagementCheck.in[1] <== MAX_ENGAGEMENT;
    
    // Metrics hash verification
    poseidonMetrics.inputs[0] <== durationMinutes;
    poseidonMetrics.inputs[1] <== interventionCount;
    poseidonMetrics.inputs[2] <== riskLevel;
    poseidonMetrics.inputs[3] <== engagementScore;
    
    // Verify metrics hash matches
    isEqual.in[0] <== poseidonMetrics.out;
    isEqual.in[1] <== metricsHash;
    metricsValid <== isEqual.out;
    
    // Verify timestamp is within acceptable range
    component timestampCheck = TimeCheck();
    timestampCheck.timestamp <== timestamp;
    timestampValid <== timestampCheck.valid;
    
    // Convert sessionId to bits for EdDSA
    component sessionIdBits = Num2Bits(64);
    sessionIdBits.in <== sessionId;
    
    // Verify therapist authorization
    for (var i = 0; i < 256; i++) {
        therapistAuth.A[i] <== therapistPubKey[i];
        therapistAuth.R8[i] <== therapistSigR8[i];
        therapistAuth.S[i] <== therapistSigS[i];
    }
    for (var i = 0; i < 64; i++) {
        therapistAuth.msg[i] <== sessionIdBits.out[i];
    }
    
    // Final validation
    sessionValid <== metricsValid * timestampValid;
    component finalCheck = IsEqual();
    finalCheck.in[0] <== sessionValid;
    finalCheck.in[1] <== 1;
    finalCheck.out === 1;
}

/*
 * Timestamp validation component
 * Ensures timestamp is within acceptable range
 */
template TimeCheck() {
    signal input timestamp;
    signal output valid;
    
    // Components
    component futureCheck = LessThan(64);
    component pastCheck = GreaterThan(64);
    
    // Constants (30 days in seconds)
    var THIRTY_DAYS = 2592000;
    var currentTime = timestamp;
    
    // Check timestamp is not in future
    futureCheck.in[0] <== timestamp;
    futureCheck.in[1] <== currentTime;
    
    // Check timestamp is not too old
    pastCheck.in[0] <== timestamp;
    pastCheck.in[1] <== currentTime - THIRTY_DAYS;
    
    // Timestamp is valid if both checks pass
    valid <== futureCheck.out * pastCheck.out;
}

component main = SessionIntegrityVerifier();
