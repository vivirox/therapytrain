import sharp from 'sharp';
import { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { AuditService } from './AuditService';
import { SecurityService } from './SecurityService';
import { createHash } from 'crypto';

interface ImageMetadata {
  width: number;
  height: number;
  format: string;
  size: number;
  updatedAt: Date;
}

interface ImageUrls {
  original: string;
  display: string;
  thumbnail: string;
}

interface ProcessedImage {
  urls: ImageUrls;
  metadata: ImageMetadata;
}

export class ImageService {
  private s3Client: S3Client;
  private auditService: AuditService;
  private securityService: SecurityService;
  private readonly bucketName: string;
  private readonly cdnDomain: string;

  constructor(
    bucketName: string,
    cdnDomain: string,
    auditService: AuditService,
    securityService: SecurityService
  ) {
    this.bucketName = bucketName;
    this.cdnDomain = cdnDomain;
    this.auditService = auditService;
    this.securityService = securityService;

    this.s3Client = new S3Client({
      region: process.env.AWS_REGION || 'us-east-1',
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!
      }
    });
  }

  /**
   * Process and store a profile picture
   * @param userId User ID
   * @param imageBuffer Raw image buffer
   * @returns ProcessedImage object with URLs and metadata
   */
  async processProfilePicture(userId: string, imageBuffer: Buffer): Promise<ProcessedImage> {
    // Validate image
    const image = sharp(imageBuffer);
    const metadata = await image.metadata();

    if (!metadata.format || !['jpeg', 'png', 'webp'].includes(metadata.format)) {
      throw new Error('INVALID_FILE_FORMAT');
    }

    if (!metadata.width || !metadata.height) {
      throw new Error('MALFORMED_IMAGE');
    }

    if (metadata.width > 2048 || metadata.height > 2048) {
      throw new Error('INVALID_DIMENSIONS');
    }

    if (imageBuffer.length > 5 * 1024 * 1024) { // 5MB
      throw new Error('FILE_TOO_LARGE');
    }

    // Generate unique hash for the image
    const hash = createHash('sha256').update(imageBuffer).digest('hex');

    // Process images for different sizes
    const [original, display, thumbnail] = await Promise.all([
      this.processAndUpload(userId, imageBuffer, 'original', metadata.format, hash),
      this.processAndUpload(userId, imageBuffer, 'display', metadata.format, hash, 500),
      this.processAndUpload(userId, imageBuffer, 'thumbnail', metadata.format, hash, 150)
    ]);

    // Audit the upload
    await this.auditService.log({
      action: 'PROFILE_PICTURE_UPLOAD',
      userId,
      details: {
        imageHash: hash,
        originalSize: imageBuffer.length,
        format: metadata.format
      }
    });

    return {
      urls: {
        original: original.url,
        display: display.url,
        thumbnail: thumbnail.url
      },
      metadata: {
        width: metadata.width,
        height: metadata.height,
        format: metadata.format,
        size: imageBuffer.length,
        updatedAt: new Date()
      }
    };
  }

  /**
   * Process image to specific size and upload to S3
   */
  private async processAndUpload(
    userId: string,
    imageBuffer: Buffer,
    size: 'original' | 'display' | 'thumbnail',
    format: string,
    hash: string,
    dimension?: number
  ): Promise<{ url: string }> {
    let processedBuffer = imageBuffer;

    if (dimension) {
      processedBuffer = await sharp(imageBuffer)
        .resize(dimension, dimension, {
          fit: 'cover',
          position: 'centre'
        })
        .toFormat(format as keyof sharp.FormatEnum)
        .toBuffer();
    }

    const key = `users/${userId}/profile/${size}-${hash}.${format}`;
    
    await this.s3Client.send(new PutObjectCommand({
      Bucket: this.bucketName,
      Key: key,
      Body: processedBuffer,
      ContentType: `image/${format}`,
      CacheControl: 'public, max-age=31536000', // 1 year
      Metadata: {
        userId,
        imageHash: hash,
        size
      }
    }));

    return {
      url: `https://${this.cdnDomain}/${key}`
    };
  }

  /**
   * Delete a user's profile picture
   */
  async deleteProfilePicture(userId: string): Promise<void> {
    const sizes = ['original', 'display', 'thumbnail'];
    
    // Get existing images for the user
    const existingImages = await this.listUserImages(userId);
    
    if (existingImages.length === 0) {
      throw new Error('PROFILE_PICTURE_NOT_FOUND');
    }

    // Delete all sizes
    await Promise.all(
      existingImages.map(key =>
        this.s3Client.send(new DeleteObjectCommand({
          Bucket: this.bucketName,
          Key: key
        }))
      )
    );

    // Audit the deletion
    await this.auditService.log({
      action: 'PROFILE_PICTURE_DELETE',
      userId,
      details: {
        deletedImages: existingImages
      }
    });
  }

  /**
   * List all profile picture objects for a user
   */
  private async listUserImages(userId: string): Promise<string[]> {
    const prefix = `users/${userId}/profile/`;
    
    // Use S3 ListObjectsV2 command to find all objects with the prefix
    // Implementation omitted for brevity
    // This would return an array of S3 object keys
    
    return [];
  }

  /**
   * Get profile picture URLs and metadata
   */
  async getProfilePicture(userId: string): Promise<ProcessedImage | null> {
    const existingImages = await this.listUserImages(userId);
    
    if (existingImages.length === 0) {
      return null;
    }

    // Find the original image to get metadata
    const originalKey = existingImages.find(key => key.includes('original-'));
    if (!originalKey) {
      return null;
    }

    // Get metadata from the original image
    const originalObject = await this.s3Client.send(new GetObjectCommand({
      Bucket: this.bucketName,
      Key: originalKey
    }));

    const metadata = await sharp(await originalObject.Body?.transformToByteArray()).metadata();

    return {
      urls: {
        original: `https://${this.cdnDomain}/${originalKey}`,
        display: `https://${this.cdnDomain}/${originalKey.replace('original-', 'display-')}`,
        thumbnail: `https://${this.cdnDomain}/${originalKey.replace('original-', 'thumbnail-')}`
      },
      metadata: {
        width: metadata.width!,
        height: metadata.height!,
        format: metadata.format!,
        size: Number(originalObject.ContentLength),
        updatedAt: originalObject.LastModified || new Date()
      }
    };
  }
} 