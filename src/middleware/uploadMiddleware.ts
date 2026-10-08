import multer, { FileFilterCallback } from 'multer';
import path from 'path';
import { Request, Response, NextFunction } from 'express';
import env from '../config/env';

// Allowed MIME types and extensions
export const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
export const ALLOWED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp'];

// Enforce MAX_UPLOAD_SIZE (defaults to 5242880 bytes / 5 MB)
export const MAX_UPLOAD_SIZE = Number(process.env.MAX_UPLOAD_SIZE || env.MAX_UPLOAD_SIZE) || 5242880;

// Hold files in RAM buffer temporarily - NEVER save to disk or local uploads directory
const memoryStorage = multer.memoryStorage();

const fileFilter = (
  _req: Request,
  file: Express.Multer.File,
  cb: FileFilterCallback
) => {
  const extension = path.extname(file.originalname).toLowerCase();
  const mimetype = file.mimetype.toLowerCase();

  // Validate extension
  if (!ALLOWED_EXTENSIONS.includes(extension)) {
    return cb(
      new Error(
        `Unsupported file extension: "${extension}". Allowed extensions: JPG, JPEG, PNG, WEBP.`
      )
    );
  }

  // Validate MIME type
  if (!ALLOWED_MIME_TYPES.includes(mimetype)) {
    return cb(
      new Error(
        `Unsupported MIME type: "${mimetype}". Allowed types: image/jpeg, image/png, image/webp.`
      )
    );
  }

  cb(null, true);
};

export const multerUpload = multer({
  storage: memoryStorage,
  limits: {
    fileSize: MAX_UPLOAD_SIZE,
  },
  fileFilter,
});

/**
 * Middleware handling delivery slip image upload with clean error formatting.
 * Supports field names 'slip' and 'slipImage'.
 */
export const uploadSlipMiddleware = (fieldNames: string | string[] = ['slip', 'slipImage']) => {
  const fields = Array.isArray(fieldNames)
    ? fieldNames.map((name) => ({ name, maxCount: 1 }))
    : [{ name: fieldNames, maxCount: 1 }];

  const uploadFields = multerUpload.fields(fields);

  return (req: Request, res: Response, next: NextFunction) => {
    uploadFields(req, res, (err: any) => {
      if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return res.status(400).json({
            success: false,
            message: `Oversized file: File exceeds the maximum allowed size of 5MB (${MAX_UPLOAD_SIZE} bytes).`,
            code: 'LIMIT_FILE_SIZE',
          });
        }
        return res.status(400).json({
          success: false,
          message: `Upload error: ${err.message}`,
          code: err.code,
        });
      }

      if (err) {
        return res.status(400).json({
          success: false,
          message: err.message || 'File upload validation error.',
        });
      }

      // Map to req.file if uploaded via fields
      const filesMap = req.files as { [fieldname: string]: Express.Multer.File[] } | undefined;
      if (filesMap) {
        if (filesMap.slip && filesMap.slip[0]) {
          req.file = filesMap.slip[0];
        } else if (filesMap.slipImage && filesMap.slipImage[0]) {
          req.file = filesMap.slipImage[0];
        }
      }

      return next();
    });
  };
};

export const requireUploadedFile = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  if (!req.file || !req.file.buffer || req.file.buffer.length === 0) {
    return res.status(400).json({
      success: false,
      message: 'Missing file: An image file is required for delivery slip proof.',
    });
  }
  return next();
};

export default {
  multerUpload,
  uploadSlipMiddleware,
  requireUploadedFile,
  ALLOWED_EXTENSIONS,
  ALLOWED_MIME_TYPES,
  MAX_UPLOAD_SIZE,
};
