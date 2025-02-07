template SessionValidator() {
    signal input sessionHash;
    signal input secret;
    signal output validated;
    
    component hash = Poseidon(2);
    hash.inputs[0] <== sessionHash;
    hash.inputs[1] <== secret;
    validated <== hash.out;
}

component main = SessionValidator();
