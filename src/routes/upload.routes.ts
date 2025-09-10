import { Router } from 'express';
import multer from 'multer';
import { UploadController } from '@/controllers/upload.controller';
import { authenticate } from '@/middleware/auth';
import { validateFileUpload } from '@/middleware/validation';
import { uploadLimiter } from '@/middleware/rateLimiter';

const router = Router();
const uploadController = new UploadController();

// Configure multer for memory storage
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
    files: 10 // Maximum 10 files
  },
  fileFilter: (req, file, cb) => {
    const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (allowedMimeTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only JPEG, PNG, WebP, and GIF are allowed'));
    }
  }
});

/**
 * @route   POST /api/upload/image
 * @desc    Upload single image
 * @access  Private
 */
router.post('/image',
  authenticate,
  uploadLimiter,
  upload.single('file'),
  validateFileUpload,
  uploadController.uploadSingleImage
);

/**
 * @route   POST /api/upload/images
 * @desc    Upload multiple images
 * @access  Private
 */
router.post('/images',
  authenticate,
  uploadLimiter,
  upload.array('files', 10),
  validateFileUpload,
  uploadController.uploadMultipleImages
);

/**
 * @route   DELETE /api/upload/:fileId
 * @desc    Delete uploaded image
 * @access  Private
 */
router.delete('/:fileId',
  authenticate,
  uploadController.deleteImage
);

/**
 * @route   GET /api/upload/signed-url
 * @desc    Get signed upload URL for direct upload
 * @access  Private
 */
router.get('/signed-url',
  authenticate,
  uploadController.getSignedUrl
);

export default router;