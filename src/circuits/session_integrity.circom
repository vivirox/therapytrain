pragma circom 2.0.0;

include "../../node_modules/circomlib/circuits/comparators.circom";
include "../../node_modules/circomlib/circuits/poseidon.circom";

template SessionIntegrityCheck() {
    // Public inputs
    signal input sessionId;
    signal input timestamp;
    signal input durationMinutes;
    
    // Private inputs (these remain hidden)
    signal input clientDataHash;
    signal input metricsHash;
    signal input therapistId;
    
    // Output signals
    signal output validSession;
    signal output integrityHash;
    
    // Components
    component hasher = Poseidon(6);
    component durationCheck = LessThan(32);
    
    // Check if duration is within acceptable range (1-120 minutes)
    durationCheck.in[0] <== durationMinutes;
    durationCheck.in[1] <== 120;
    
    // Calculate integrity hash using Poseidon
    hasher.inputs[0] <== sessionId;
    hasher.inputs[1] <== timestamp;
    hasher.inputs[2] <== durationMinutes;
    hasher.inputs[3] <== clientDataHash;
    hasher.inputs[4] <== metricsHash;
    hasher.inputs[5] <== therapistId;
    
    // Session is valid if duration check passes
    validSession <== durationCheck.out;
    
    // Output the integrity hash
    integrityHash <== hasher.out;
}

component main = SessionIntegrityCheck();
