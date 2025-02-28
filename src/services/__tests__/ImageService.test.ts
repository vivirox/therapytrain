import { ImageService } from '../ImageService';
import { AuditService } from '../AuditService';
import { SecurityService } from '../SecurityService';
import { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import sharp from 'sharp';
import { mockClient } from 'aws-sdk-client-mock';

// Mock AWS S3 client
const s3Mock = mockClient(S3Client);

// Mock services
jest.mock('../AuditService');
jest.mock('../SecurityService');

describe('ImageService', () => {
  let imageService: ImageService;
  let mockAuditService: jest.Mocked<AuditService>;
  let mockSecurityService: jest.Mocked<SecurityService>;

  beforeEach(() => {
    // Clear all mocks
    s3Mock.reset();
    jest.clearAllMocks();

    // Create mock services
    mockAuditService = new AuditService() as jest.Mocked<AuditService>;
    mockSecurityService = new SecurityService() as jest.Mocked<SecurityService>;

    // Create image service instance
    imageService = new ImageService(
      'test-bucket',
      'cdn.test.com',
      mockAuditService,
      mockSecurityService
    );
  });

  describe('processProfilePicture', () => {
    it('should process and upload profile picture successfully', async () => {
      // Create a test image buffer
      const imageBuffer = await sharp({
        create: {
          width: 100,
          height: 100,
          channels: 4,
          background: { r: 255, g: 0, b: 0, alpha: 1 }
        }
      })
      .jpeg()
      .toBuffer();

      // Mock S3 upload
      s3Mock.on(PutObjectCommand).resolves({});

      // Process the image
      const result = await imageService.processProfilePicture('test-user', imageBuffer);

      // Verify the result structure
      expect(result).toHaveProperty('urls');
      expect(result).toHaveProperty('metadata');
      expect(result.urls).toHaveProperty('original');
      expect(result.urls).toHaveProperty('display');
      expect(result.urls).toHaveProperty('thumbnail');

      // Verify S3 uploads were called
      expect(s3Mock.calls()).toHaveLength(3); // One for each size
      
      // Verify audit log was called
      expect(mockAuditService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'PROFILE_PICTURE_UPLOAD',
          userId: 'test-user'
        })
      );
    });

    it('should reject invalid file formats', async () => {
      // Create an invalid image buffer
      const invalidBuffer = Buffer.from('not an image');

      await expect(
        imageService.processProfilePicture('test-user', invalidBuffer)
      ).rejects.toThrow('INVALID_FILE_FORMAT');
    });

    it('should reject files larger than 5MB', async () => {
      // Create a large buffer
      const largeBuffer = Buffer.alloc(6 * 1024 * 1024);

      await expect(
        imageService.processProfilePicture('test-user', largeBuffer)
      ).rejects.toThrow('FILE_TOO_LARGE');
    });

    it('should reject images with dimensions larger than 2048x2048', async () => {
      // Create a large image
      const largeImageBuffer = await sharp({
        create: {
          width: 3000,
          height: 3000,
          channels: 4,
          background: { r: 255, g: 0, b: 0, alpha: 1 }
        }
      })
      .jpeg()
      .toBuffer();

      await expect(
        imageService.processProfilePicture('test-user', largeImageBuffer)
      ).rejects.toThrow('INVALID_DIMENSIONS');
    });
  });

  describe('deleteProfilePicture', () => {
    it('should delete all sizes of profile picture', async () => {
      // Mock listUserImages to return some images
      const mockImages = [
        'users/test-user/profile/original-123.jpg',
        'users/test-user/profile/display-123.jpg',
        'users/test-user/profile/thumbnail-123.jpg'
      ];
      jest.spyOn(imageService as any, 'listUserImages').mockResolvedValue(mockImages);

      // Mock S3 delete
      s3Mock.on(DeleteObjectCommand).resolves({});

      // Delete the profile picture
      await imageService.deleteProfilePicture('test-user');

      // Verify S3 deletes were called
      expect(s3Mock.calls()).toHaveLength(3); // One for each size

      // Verify audit log was called
      expect(mockAuditService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'PROFILE_PICTURE_DELETE',
          userId: 'test-user'
        })
      );
    });

    it('should throw error if no profile picture exists', async () => {
      // Mock listUserImages to return empty array
      jest.spyOn(imageService as any, 'listUserImages').mockResolvedValue([]);

      await expect(
        imageService.deleteProfilePicture('test-user')
      ).rejects.toThrow('PROFILE_PICTURE_NOT_FOUND');
    });
  });

  describe('getProfilePicture', () => {
    it('should return profile picture URLs and metadata', async () => {
      // Mock listUserImages to return some images
      const mockImages = [
        'users/test-user/profile/original-123.jpg',
        'users/test-user/profile/display-123.jpg',
        'users/test-user/profile/thumbnail-123.jpg'
      ];
      jest.spyOn(imageService as any, 'listUserImages').mockResolvedValue(mockImages);

      // Mock S3 get object
      const mockImageBuffer = await sharp({
        create: {
          width: 100,
          height: 100,
          channels: 4,
          background: { r: 255, g: 0, b: 0, alpha: 1 }
        }
      })
      .jpeg()
      .toBuffer();

      s3Mock.on(GetObjectCommand).resolves({
        Body: {
          transformToByteArray: async () => mockImageBuffer
        },
        ContentLength: mockImageBuffer.length,
        LastModified: new Date()
      });

      // Get the profile picture
      const result = await imageService.getProfilePicture('test-user');

      // Verify the result
      expect(result).toHaveProperty('urls');
      expect(result).toHaveProperty('metadata');
      expect(result?.urls.original).toContain('cdn.test.com');
      expect(result?.urls.display).toContain('cdn.test.com');
      expect(result?.urls.thumbnail).toContain('cdn.test.com');
    });

    it('should return null if no profile picture exists', async () => {
      // Mock listUserImages to return empty array
      jest.spyOn(imageService as any, 'listUserImages').mockResolvedValue([]);

      const result = await imageService.getProfilePicture('test-user');
      expect(result).toBeNull();
    });
  });
}); 