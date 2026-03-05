import { extname } from 'path';
import { existsSync, mkdirSync } from 'fs';
import { v4 as uuidv4 } from 'uuid';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const multer = require('multer');

/**
 * Creates a Multer diskStorage configuration that stores files
 * in ./uploads/{subdirectory}/ with UUID-based filenames,
 * preserving the original file extension.
 *
 * The destination directory is created automatically if it does not exist.
 */
export function createMulterStorage(subdirectory: string) {
  const destination = `./uploads/${subdirectory}`;

  // Ensure the upload directory exists
  if (!existsSync(destination)) {
    mkdirSync(destination, { recursive: true });
  }

  return multer.diskStorage({
    destination,
    filename: (_req: any, file: Express.Multer.File, cb: any) => {
      const uniqueName = `${uuidv4()}${extname(file.originalname)}`;
      cb(null, uniqueName);
    },
  });
}

/**
 * Multer file filter that only accepts common image file types:
 * jpg, jpeg, png, gif, webp.
 *
 * Rejects other file types with a descriptive error message.
 */
export const imageFileFilter = (
  _req: any,
  file: Express.Multer.File,
  cb: any,
) => {
  const allowedExtensions = /\.(jpg|jpeg|png|gif|webp)$/i;

  if (!allowedExtensions.test(extname(file.originalname))) {
    return cb(
      new Error('Only image files (jpg, jpeg, png, gif, webp) are allowed'),
      false,
    );
  }

  cb(null, true);
};
