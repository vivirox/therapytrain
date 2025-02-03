// tsconfig.js
const { join } = require('path');

module.exports = {
    compilerOptions: {
        module: "commonjs",
        target: "es2020",
        sourceMap: true,
        outDir: "dist",
        strict: true,
        esModuleInterop: true,
        skipLibCheck: true,
        forceConsistentCasingInFileNames: true,
    },
    include: ["src/**/*.ts"],
    exclude: ["node_modules"],
};