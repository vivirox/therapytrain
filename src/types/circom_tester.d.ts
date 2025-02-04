declare module 'circom_tester' {
    export interface CircuitTester {
        loadConstraints(): Promise<void>;
        loadSymbols(): Promise<void>;
        assertOut(witness: any, expected: any): void;
        calculateWitness(input: any, sanityCheck?: boolean): Promise<any>;
        checkConstraints(witness: any): Promise<void>;
    }

    export const wasm: {
        (path: string): Promise<CircuitTester>;
    };

    export const c: {
        (path: string): Promise<CircuitTester>;
    };
}
