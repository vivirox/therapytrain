import { createMocks } from 'node-mocks-http';
import handler from '../users/[userId]/profile-picture';
import { ImageService } from '@/services/ImageService';
import sharp from 'sharp';


// Mock ImageService
jest.mock('@/services/ImageService');
const MockImageService = ImageService as jest.MockedClass<typeof ImageService>;

describe('/api/users/[userId]/profile-picture', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/users/[userId]/profile-picture', () => {
    it('should return profile picture data', async () => {
      // Mock profile picture data
      const mockProfilePicture = {
        urls: {
          original: 'https://cdn.test.com/original.jpg',
          display: 'https://cdn.test.com/display.jpg',
          thumbnail: 'https://cdn.test.com/thumbnail.jpg'
        },
        metadata: {
          width: 1024,
          height: 1024,
          format: 'jpeg',
          size: 1024 * 1024,
          updatedAt: new Date()
        }
      };
      MockImageService.prototype.getProfilePicture.mockResolvedValue(mockProfilePicture);

      const { req, res } = createMocks({
        method: 'GET',
        query: { userId: 'test-user' }
      });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(200);
      expect(JSON.parse(res._getData())).toEqual(mockProfilePicture);
    });

    it('should return 404 when profile picture not found', async () => {
      MockImageService.prototype.getProfilePicture.mockResolvedValue(null);

      const { req, res } = createMocks({
        method: 'GET',
        query: { userId: 'test-user' }
      });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(404);
      expect(JSON.parse(res._getData())).toEqual({
        code: 'PROFILE_PICTURE_NOT_FOUND',
        message: 'Profile picture not found'
      });
    });
  });

  describe('POST /api/users/[userId]/profile-picture', () => {
    it('should upload profile picture successfully', async () => {
      // Create test image
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

      // Mock successful upload
      const mockResult = {
        urls: {
          original: 'https://cdn.test.com/original.jpg',
          display: 'https://cdn.test.com/display.jpg',
          thumbnail: 'https://cdn.test.com/thumbnail.jpg'
        },
        metadata: {
          width: 100,
          height: 100,
          format: 'jpeg',
          size: imageBuffer.length,
          updatedAt: new Date()
        }
      };
      MockImageService.prototype.processProfilePicture.mockResolvedValue(mockResult);

      const { req, res } = createMocks({
        method: 'POST',
        query: { userId: 'test-user' },
        headers: {
          'content-type': 'multipart/form-data; boundary=---boundary'
        }
      });

      // Add file to request
      req.file = {
        buffer: imageBuffer,
        mimetype: 'image/jpeg',
        originalname: 'test.jpg'
      };

      await handler(req, res);

      expect(res._getStatusCode()).toBe(200);
      expect(JSON.parse(res._getData())).toEqual(mockResult);
    });

    it('should return 400 for invalid file format', async () => {
      MockImageService.prototype.processProfilePicture.mockRejectedValue(
        new Error('INVALID_FILE_FORMAT')
      );

      const { req, res } = createMocks({
        method: 'POST',
        query: { userId: 'test-user' },
        headers: {
          'content-type': 'multipart/form-data; boundary=---boundary'
        }
      });

      req.file = {
        buffer: Buffer.from('not an image'),
        mimetype: 'image/jpeg',
        originalname: 'test.jpg'
      };

      await handler(req, res);

      expect(res._getStatusCode()).toBe(400);
      expect(JSON.parse(res._getData())).toEqual({
        code: 'INVALID_FILE_FORMAT',
        message: 'Only JPEG, PNG and WebP images are allowed'
      });
    });
  });

  describe('DELETE /api/users/[userId]/profile-picture', () => {
    it('should delete profile picture successfully', async () => {
      const { req, res } = createMocks({
        method: 'DELETE',
        query: { userId: 'test-user' }
      });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(204);
      expect(MockImageService.prototype.deleteProfilePicture).toHaveBeenCalledWith('test-user');
    });

    it('should return 404 when profile picture not found', async () => {
      MockImageService.prototype.deleteProfilePicture.mockRejectedValue(
        new Error('PROFILE_PICTURE_NOT_FOUND')
      );

      const { req, res } = createMocks({
        method: 'DELETE',
        query: { userId: 'test-user' }
      });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(404);
      expect(JSON.parse(res._getData())).toEqual({
        code: 'PROFILE_PICTURE_NOT_FOUND',
        message: 'Profile picture not found'
      });
    });
  });
});