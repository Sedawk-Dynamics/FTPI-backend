import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { config } from '../config';
import { Request } from 'express';

const uploadsDir = path.resolve(config.uploadDir);

// Ensure upload directories exist
const dirs = ['documents', 'photos', 'news', 'events', 'certificates'];
dirs.forEach((dir) => {
  const fullPath = path.join(uploadsDir, dir);
  if (!fs.existsSync(fullPath)) {
    fs.mkdirSync(fullPath, { recursive: true });
  }
});

const storage = multer.diskStorage({
  destination: (req: Request, file, cb) => {
    let subDir = 'documents';
    if (file.fieldname === 'photo') {
      subDir = 'photos';
    } else if (file.fieldname === 'newsImage') {
      subDir = 'news';
    } else if (file.fieldname === 'eventImage') {
      subDir = 'events';
    }
    cb(null, path.join(uploadsDir, subDir));
  },
  filename: (req: Request, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    const ext = path.extname(file.originalname);
    cb(null, `${file.fieldname}-${uniqueSuffix}${ext}`);
  },
});

const fileFilter = (
  req: Request,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback
) => {
  const allowedImageTypes = ['image/jpeg', 'image/png', 'image/jpg', 'image/webp'];
  const allowedDocTypes = [
    ...allowedImageTypes,
    'application/pdf',
  ];

  if (file.fieldname === 'photo') {
    if (allowedImageTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only JPEG, PNG, and WebP images are allowed for photos.'));
    }
  } else if (
    file.fieldname === 'aadhar' ||
    file.fieldname === 'aadharDoc' ||
    file.fieldname === 'pan' ||
    file.fieldname === 'panDoc'
  ) {
    if (allowedDocTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only JPEG, PNG, WebP, and PDF files are allowed for documents.'));
    }
  } else if (
    file.fieldname === 'newsImage' ||
    file.fieldname === 'eventImage'
  ) {
    if (allowedImageTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only JPEG, PNG, and WebP images are allowed.'));
    }
  } else {
    cb(null, true);
  }
};

export const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
  },
});

export const uploadDocuments = upload.fields([
  { name: 'aadharDoc', maxCount: 1 },
  { name: 'panDoc', maxCount: 1 },
  { name: 'photo', maxCount: 1 },
]);

export const uploadMembershipDocs = upload.fields([
  { name: 'aadhar', maxCount: 1 },
  { name: 'pan', maxCount: 1 },
  { name: 'photo', maxCount: 1 },
]);

export const uploadNewsImage = upload.single('newsImage');
export const uploadEventImage = upload.single('eventImage');
