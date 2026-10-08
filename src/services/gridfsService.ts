import { ObjectId, GridFSBucketReadStream, GridFSFile } from 'mongodb';
import { Readable } from 'stream';
import { getGridFSBucket } from '../config/gridfs';

export interface SlipFileResult {
  stream: GridFSBucketReadStream;
  file: GridFSFile;
}

/**
 * Uploads an image buffer directly into the MongoDB GridFS deliverySlips bucket.
 * Image bytes are chunked and stored automatically into deliverySlips.files and deliverySlips.chunks.
 *
 * @param buffer Raw image binary buffer
 * @param filename File name for the stored slip
 * @param mimetype Content MIME type (e.g. 'image/jpeg', 'image/png')
 * @param metadata Optional metadata to store alongside the file
 * @returns The GridFS fileId (ObjectId)
 */
export const uploadSlip = async (
  buffer: Buffer,
  filename: string,
  mimetype: string,
  metadata: Record<string, any> = {}
): Promise<ObjectId> => {
  if (!buffer || buffer.length === 0) {
    throw new Error('Cannot upload empty buffer. Image data is required.');
  }

  const bucket = getGridFSBucket();

  return new Promise((resolve, reject) => {
    try {
      const uploadStream = bucket.openUploadStream(filename, {
        contentType: mimetype,
        metadata: {
          ...metadata,
          contentType: mimetype,
          uploadedAt: new Date(),
        },
      });

      const readableStream = new Readable();
      readableStream.push(buffer);
      readableStream.push(null);

      readableStream
        .pipe(uploadStream)
        .on('finish', () => {
          resolve(uploadStream.id);
        })
        .on('error', (err) => {
          console.error('[GridFS] Upload stream error:', err);
          reject(new Error(`Database error during GridFS upload: ${err.message}`));
        });
    } catch (err: any) {
      console.error('[GridFS] Initialization error during upload:', err);
      reject(new Error(`Failed to initiate GridFS upload: ${err.message}`));
    }
  });
};

/**
 * Retrieves a delivery slip image stream and its metadata from MongoDB GridFS.
 * Handles invalid file IDs, missing files, and database errors.
 *
 * @param fileId MongoDB GridFS file ID as string or ObjectId
 * @returns Object containing the download stream and file document
 */
export const getSlip = async (fileId: string | ObjectId): Promise<SlipFileResult> => {
  if (!fileId) {
    throw new Error('File ID is required.');
  }

  // Handle invalid ObjectId format
  if (typeof fileId === 'string' && !ObjectId.isValid(fileId)) {
    throw new Error(`Invalid GridFS file ID format: "${fileId}". Must be a 24-character hexadecimal string.`);
  }

  const id = typeof fileId === 'string' ? new ObjectId(fileId) : fileId;
  const bucket = getGridFSBucket();

  try {
    // Check if the file exists in deliverySlips.files
    const files = await bucket.find({ _id: id }).toArray();

    if (!files || files.length === 0) {
      throw new Error(`File not found in deliverySlips bucket for ID: "${id.toString()}".`);
    }

    const file = files[0];
    const stream = bucket.openDownloadStream(id);

    return {
      stream,
      file,
    };
  } catch (err: any) {
    if (err.message?.includes('File not found') || err.message?.includes('Invalid GridFS file ID')) {
      throw err;
    }
    console.error('[GridFS] Database error during getSlip:', err);
    throw new Error(`Database error retrieving GridFS file: ${err.message}`);
  }
};

/**
 * Deletes a delivery slip and its corresponding chunks from MongoDB GridFS.
 * Automatically cleans up deliverySlips.files and deliverySlips.chunks.
 *
 * @param fileId MongoDB GridFS file ID as string or ObjectId
 * @returns true if deletion succeeded
 */
export const deleteSlip = async (fileId: string | ObjectId): Promise<boolean> => {
  if (!fileId) {
    throw new Error('File ID is required.');
  }

  // Handle invalid ObjectId format
  if (typeof fileId === 'string' && !ObjectId.isValid(fileId)) {
    throw new Error(`Invalid GridFS file ID format: "${fileId}". Must be a 24-character hexadecimal string.`);
  }

  const id = typeof fileId === 'string' ? new ObjectId(fileId) : fileId;
  const bucket = getGridFSBucket();

  try {
    // Confirm existence before attempting deletion
    const files = await bucket.find({ _id: id }).toArray();

    if (!files || files.length === 0) {
      throw new Error(`Cannot delete: File not found in deliverySlips bucket for ID: "${id.toString()}".`);
    }

    await bucket.delete(id);
    return true;
  } catch (err: any) {
    if (err.message?.includes('File not found') || err.message?.includes('Invalid GridFS file ID')) {
      throw err;
    }
    console.error('[GridFS] Database error during deleteSlip:', err);
    throw new Error(`Database error deleting GridFS file: ${err.message}`);
  }
};

export const gridfsService = {
  uploadSlip,
  getSlip,
  deleteSlip,
};

export default gridfsService;
