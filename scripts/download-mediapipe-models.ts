import fs from 'fs';
import path from 'path';
import https from 'https';

const MODELS_DIR = path.join(process.cwd(), 'public', 'models', 'mediapipe');
const MODEL_URL = 'https://storage.googleapis.com/mediapipe-models/gesture_recognizer/gesture_recognizer/float16/latest/gesture_recognizer.task';

async function downloadFile(url: string, dest: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);
    https.get(url, (response) => {
      response.pipe(file);
      file.on('finish', () => {
        file.close();
        resolve();
      });
    }).on('error', (err) => {
      fs.unlink(dest, () => {});
      reject(err);
    });
  });
}

async function main() {
  // Create models directory if it doesn't exist
  if (!fs.existsSync(MODELS_DIR)) {
    fs.mkdirSync(MODELS_DIR, { recursive: true });
  }

  console.log('Downloading MediaPipe gesture recognition model...');
  
  const modelPath = path.join(MODELS_DIR, 'gesture_recognizer.task');
  
  try {
    await downloadFile(MODEL_URL, modelPath);
    console.log('✓ Downloaded gesture recognition model');
  } catch (error) {
    console.error('✗ Failed to download gesture recognition model:', error);
    process.exit(1);
  }

  console.log('All models downloaded successfully!');
}

main().catch(console.error); 