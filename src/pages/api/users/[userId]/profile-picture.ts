import { NextApiRequest, NextApiResponse } from 'next';
import { createRouter } from 'next-connect';
import { createServerClient } from '@supabase/ssr';
import { ImageService } from '@/services/ImageService';
import { AuditService } from '@/services/AuditService';
import { SecurityService } from '@/services/SecurityService';
import { Fields, Files, File, IncomingForm } from 'formidable';

// Create API router
const router = createRouter<NextApiRequest, NextApiResponse>();

// Auth middleware
router.use(async (req, res, next) => {
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return req.cookies[name];
        },
        set(name: string, value: string, options: any) {
          res.setHeader('Set-Cookie', `${name}=${value}`);
        },
        remove(name: string, options: any) {
          res.setHeader('Set-Cookie', `${name}=; Max-Age=0`);
        },
      },
    }
  );
  const { data: { session }, error } = await supabase.auth.getSession();
  
  if (error || !session) {
    return res.status(401).json({
      code: 'UNAUTHORIZED',
      message: 'Authentication required'
    });
  }
  next();
});

// Function to parse the form data
async function parseFormData(req: NextApiRequest): Promise<{ fields: Fields; files: Files }> {
  return new Promise((resolve, reject) => {
    const form = new IncomingForm({
      maxFileSize: 5 * 1024 * 1024, // 5MB
    });

    form.parse(req, (err: any, fields: any, files: any) => {
      if (err) {
        reject(err);
        return;
      }
      resolve({ fields, files });
    });
  });
}

// Initialize services
const imageService = new ImageService(
  process.env.AWS_S3_BUCKET_NAME!,
  process.env.CDN_DOMAIN!,
  AuditService.getInstance(),
  SecurityService.getInstance()
);

// GET /api/users/[userId]/profile-picture
router.get(async (req, res) => {
  try {
    const { userId } = req.query;
    const profilePicture = await imageService.getProfilePicture(userId as string);

    if (!profilePicture) {
      return res.status(404).json({
        code: 'PROFILE_PICTURE_NOT_FOUND',
        message: 'Profile picture not found'
      });
    }

    res.json(profilePicture);
  } catch (error) {
    console.error('Error getting profile picture:', error);
    res.status(500).json({
      code: 'INTERNAL_SERVER_ERROR',
      message: 'An error occurred while getting the profile picture'
    });
  }
});

// POST /api/users/[userId]/profile-picture
router.post(async (req, res) => {
  try {
    const { files } = await parseFormData(req);

    const imageFile = files.image as Array<File>;
    if (!imageFile || imageFile.length === 0) {
      return res.status(400).json({
        code: 'MISSING_FILE',
        message: 'No image file provided'
      });
    }

    const { userId } = req.query;
    const file = imageFile[0];
    const fs = require('fs/promises');
    const buffer = await fs.readFile(file.filepath);

    const result = await imageService.processProfilePicture(userId as string, buffer);
    res.json(result);
  } catch (error: any) {
    if (error.message.includes('maxFileSize')) {
      return res.status(400).json({
        code: 'FILE_TOO_LARGE',
        message: 'Image exceeds maximum size of 5MB'
      });
    }

    const errorMap: Record<string, { status: number; code: string; message: string }> = {
      'INVALID_FILE_FORMAT': { status: 400, code: 'INVALID_FILE_FORMAT', message: 'Only JPEG, PNG and WebP images are allowed' },
      'INVALID_DIMENSIONS': { status: 400, code: 'INVALID_DIMENSIONS', message: 'Image dimensions exceed 2048x2048 pixels' },
      'MALFORMED_IMAGE': { status: 400, code: 'MALFORMED_IMAGE', message: 'The uploaded file is not a valid image' },
    };

    const errorInfo = errorMap[error.message];
    if (errorInfo) {
      return res.status(errorInfo.status).json({
        code: errorInfo.code,
        message: errorInfo.message
      });
    }

    console.error('Error uploading profile picture:', error);
    res.status(500).json({
      code: 'INTERNAL_SERVER_ERROR',
      message: 'An error occurred while uploading the profile picture'
    });
  }
});

// DELETE /api/users/[userId]/profile-picture
router.delete(async (req, res) => {
  try {
    const { userId } = req.query;
    await imageService.deleteProfilePicture(userId as string);
    res.status(204).end();
  } catch (error: any) {
    if (error.message === 'PROFILE_PICTURE_NOT_FOUND') {
      return res.status(404).json({
        code: 'PROFILE_PICTURE_NOT_FOUND',
        message: 'Profile picture not found'
      });
    }
    console.error('Error deleting profile picture:', error);
    res.status(500).json({
      code: 'INTERNAL_SERVER_ERROR',
      message: 'An error occurred while deleting the profile picture'
    });
  }
});

// Export the handler
export default router.handler({
  onError: (err: Error, req, res) => {
    console.error('Unhandled error:', err);
    res.status(500).json({
      code: 'INTERNAL_SERVER_ERROR',
      message: 'An unexpected error occurred'
    });
  }
});

// Configure Next.js to handle file uploads
export const config = {
  api: {
    bodyParser: false
  }
};
