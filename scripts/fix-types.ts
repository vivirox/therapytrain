import * as ts from 'typescript';
import * as fs from 'fs';
import * as path from 'path';
import { glob } from 'glob';
import chalk from 'chalk';

interface MigrationStatus {
    timestamp: string;
    results: {
        strict: string[];
        nonStrict: string[];
    };
}

function readTsConfig(configPath: string = 'tsconfig.json'): ts.CompilerOptions {
    const configFile = ts.readConfigFile(configPath, ts.sys.readFile);
    if (configFile.error) {
        throw new Error(`Error reading tsconfig.json: ${configFile.error.messageText}`);
    }
    
    const parsedConfig = ts.parseJsonConfigFileContent(
        configFile.config,
        {
            fileExists: ts.sys.fileExists,
            readFile: ts.sys.readFile,
            readDirectory: ts.sys.readDirectory,
            useCaseSensitiveFileNames: true
        },
        path.dirname(configPath)
    );

    if (parsedConfig.errors.length) {
        throw new Error(`Error parsing tsconfig.json: ${parsedConfig.errors[0].messageText}`);
    }

    return parsedConfig.options;
}

function findTypeScriptFiles(dir: string): string[] {
    const files: string[] = [];
    
    function walk(currentDir: string) {
        const entries = fs.readdirSync(currentDir, { withFileTypes: true });
        
        for (const entry of entries) {
            const fullPath = path.join(currentDir, entry.name);
            
            if (entry.isDirectory() && !entry.name.startsWith('node_modules') && !entry.name.startsWith('.')) {
                walk(fullPath);
            } else if (entry.isFile() && /\.(ts|tsx)$/.test(entry.name)) {
                files.push(fullPath);
            }
        }
    }
    
    walk(dir);
    return files;
}

function fixTypes(filePath: string) {
    const source = fs.readFileSync(filePath, 'utf-8');
    let fixes = [];

    // Fix JSX closing tags
    const jsxClosingTagFixes = source.replace(
        /<(\w+)[^>]*>\s*<\/\w+><\/\1>/g,
        (match, tag) => `<${tag}></${tag}>`
    ).replace(
        /<Route[^>]*element=\{<([^>]+)>[^<]*<\/\2><\/Route>\}\/>/g,
        (match, component) => `<Route element={<${component} />} />`
    ).replace(
        /<(\w+)[^>]*>\s*<\/[^>]+><\/\1>/g,
        (match, tag) => `<${tag}></${tag}>`
    ).replace(
        /<Route[^>]*><\/Route>\}\/>/g,
        '<Route />'
    ).replace(
        /<Loading[^>]*><\/Suspense>/g,
        '<Loading />'
    ).replace(
        /<VolumeX[^>]*><\/Volume>/g,
        '<VolumeX />'
    ).replace(
        /<select[^>]*><\/select>/g,
        '<select />'
    ).replace(
        /<div[^>]*><\/div>/g,
        '<div />'
    );

    // Fix React.FC syntax for function components
    const reactFcFixes = jsxClosingTagFixes.replace(
        /function\s+(\w+)\s*:\s*React\.FC(?:<[^>]+>)?\s*=\s*\(/g,
        'const $1: React.FC = ('
    ).replace(
        /const\s+(\w+)\s*:\s*React\.FC(?:<[^>]+>)?\s*=\s*\(\{([^}]+)\}\s*\)\s*=>\s*{/g,
        'const $1: React.FC = ({$2}) => {'
    ).replace(
        /function\s+(\w+)\s*:\s*React\.FC(?:<[^>]+>)?\s*=\s*\(\{([^}]+)\}\s*\)\s*{/g,
        'const $1: React.FC = ({$2}) => {'
    ).replace(
        /const\s+(\w+)\s*:\s*React\.FC(?:<[^>]+>)?\s*=\s*\(\)\s*{/g,
        'const $1: React.FC = () => {'
    ).replace(
        /function\s+(\w+)\s*:\s*React\.FC(?:<[^>]+>)?\s*=\s*\(\)\s*{/g,
        'const $1: React.FC = () => {'
    ).replace(
        /:\s*React\.HTMLAttributes<HTMLDivElement>\)\s*{/g,
        ': React.HTMLAttributes<HTMLDivElement>) => {'
    ).replace(
        /:\s*ThemeProviderProps\)\s*{/g,
        ': ThemeProviderProps) => {'
    ).replace(
        /const\s+(\w+)\s*:\s*React\.FC\s*=\s*\(\{\s*([^}]+)\s*\}\)\s*{/g,
        'const $1: React.FC = ({$2}) => {'
    );

    // Fix event handler types
    const eventHandlerFixes = reactFcFixes.replace(
        /on(?:Click|Change|Select|CheckedChange|ValueChange|Progress)\s*:\s*\([^)]+\)\s*=>\s*void/g,
        (match) => {
            const eventType = match.match(/on(\w+)/)[1].toLowerCase();
            let eventTypeStr = 'MouseEvent';
            if (eventType === 'change' || eventType === 'valuechange') {
                eventTypeStr = 'ChangeEvent';
            } else if (eventType === 'checkedchange') {
                return 'onCheckedChange: (checked: boolean) => void';
            } else if (eventType === 'valuechange') {
                return 'onValueChange: (value: string) => void';
            } else if (eventType === 'progress') {
                return 'onProgress: (progress: number) => void';
            }
            return `on${eventType}: (event: React.${eventTypeStr}<HTMLElement>) => void`;
        }
    ).replace(
        /api\.on\("reInit",\s*\([^)]+\)\s*=>\s*void\)/g,
        'api.on("reInit", (event: React.MouseEvent<HTMLElement>) => { })'
    ).replace(
        /api\.on\("select",\s*\([^)]+\)\s*=>\s*void\)/g,
        'api.on("select", (event: React.MouseEvent<HTMLElement>) => { })'
    ).replace(
        /api\?\.off\("select",\s*\([^)]+\)\s*=>\s*void\)/g,
        'api?.off("select", (event: React.MouseEvent<HTMLElement>) => { })'
    );

    // Fix map callback types
    const mapCallbackFixes = eventHandlerFixes.replace(
        /\.map\(([^)]+)\):\s*unknown\s*=>/g,
        '.map(($1) =>'
    ).replace(
        /\.map\(([^)]+)\s*=>\s*\{/g,
        '.map(($1) => {'
    ).replace(
        /\.map\(([^)]+)\):\s*unknown\s*=>\s*\(/g,
        '.map(($1) => ('
    );

    // Fix Route elements
    const routeFixes = mapCallbackFixes.replace(
        /<Route\s+path="([^"]+)"\s+element=\{<([^>]+)>\s*<\/\2>\s*<\/Route>\}\s*\/>/g,
        '<Route path="$1" element={<$2 />} />'
    );

    // Fix icon component closing tags
    const iconComponents = ['Share2', 'Volume2', 'VolumeX', 'Volume', 'BarChart2', 'BarChart'];
    let iconFixes = routeFixes;
    iconComponents.forEach(icon => {
        iconFixes = iconFixes.replace(
            new RegExp(`<${icon}([^>]*)></[A-Za-z]+>`, 'g'),
            `<${icon}$1></${icon}>`
        );
    });

    // Fix primitive component closing tags
    const primitiveComponents = [
        'CommandPrimitive.Input',
        'ContextMenuPrimitive.Content',
        'DropdownMenuPrimitive.Content',
        'MenubarPrimitive.Content',
        'NavigationMenuPrimitive.Viewport',
        'PopoverPrimitive.Content',
        'ProgressPrimitive.Indicator',
        'ScrollAreaPrimitive.Corner',
        'ScrollAreaPrimitive.ScrollAreaThumb',
        'SliderPrimitive.Range',
        'SliderPrimitive.Thumb',
        'SwitchPrimitives.Thumb'
    ];
    let primitiveFixes = iconFixes;
    primitiveComponents.forEach(component => {
        primitiveFixes = primitiveFixes.replace(
            new RegExp(`<${component}([^>]*)></[A-Za-z.]+>`, 'g'),
            `<${component}$1></${component}>`
        );
    });

    // Fix component props
    const propsFixes = primitiveFixes.replace(
        />\s*=\s*\(\{\s*config,\s*onprogress:\s*\([^)]+\)\s*=>\s*void,\s*onComplete\s*\}\)\s*=>\s*{/g,
        '> = ({ config, onProgress, onComplete }) => {'
    ).replace(
        />\s*=\s*\(\{\s*config,\s*onProgress:\s*\([^)]+\)\s*=>\s*void,\s*onComplete\s*\}\)\s*=>\s*{/g,
        '> = ({ config, onProgress, onComplete }) => {'
    ).replace(
        /oncheckedchange:\s*\([^)]+\)\s*=>\s*void/g,
        'onCheckedChange: (checked: boolean) => void'
    ).replace(
        /onvaluechange:\s*\([^)]+\)\s*=>\s*void/g,
        'onValueChange: (value: string) => void'
    );

    // Apply all fixes in reverse order to maintain line numbers
    if (source !== propsFixes) {
        fixes.push({
            start: 0,
            end: source.length,
            text: propsFixes
        });
    }

    return fixes;
}

// Main function to process files
async function main() {
    console.log('Starting type fixes...');
    const tsFiles = await glob('src/**/*.{ts,tsx}');
    console.log(`Found ${tsFiles.length} TypeScript files`);

    let totalFixed = 0;
    let filesFixed = 0;

    for (const file of tsFiles) {
        const fixes = fixTypes(file);
        if (fixes.length > 0) {
            const source = fs.readFileSync(file, 'utf-8');
            let newSource = source;
            fixes.reverse().forEach(fix => {
                newSource = newSource.slice(0, fix.start) + fix.text + newSource.slice(fix.end);
            });
            fs.writeFileSync(file, newSource);
            console.log(`Fixed ${fixes.length} type issues in ${file}`);
            totalFixed += fixes.length;
            filesFixed++;
        }
    }

    console.log(`\nFixed ${totalFixed} type issues in ${filesFixed} files`);
    console.log('Migration status updated\n');
}

main().catch(error => {
    console.error('Error:', error);
    process.exit(1);
});
