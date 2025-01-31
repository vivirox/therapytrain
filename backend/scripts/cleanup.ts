import * as fs from 'fs';
import * as path from 'path';

const scriptsToKeep = [
  'tutorials-db.ts',
  'cleanup.ts'
];

const scriptsDir = __dirname;

try {
  const files = fs.readdirSync(scriptsDir);
  
  files.forEach(file => {
    if (file.endsWith('.ts') && !scriptsToKeep.includes(file)) {
      const filePath = path.join(scriptsDir, file);
      fs.unlinkSync(filePath);
      console.log(`Deleted: ${file}`);
    }
  });

  console.log('\nCleanup completed successfully!');
  console.log('\nRemaining files:');
  scriptsToKeep.forEach(file => console.log(`- ${file}`));
} catch (error) {
  console.error('Error during cleanup:', error);
}
