import { Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthRequest } from '../middleware/auth';
import { sendSuccess, sendError } from '../utils/apiResponse';

const prisma = new PrismaClient();

export const getProfile = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      sendError(res, 'Not authenticated.', 401);
      return;
    }

    const profile = await prisma.profile.findUnique({
      where: { userId: req.user.id },
    });

    if (!profile) {
      sendError(res, 'Profile not found. Please complete your profile.', 404);
      return;
    }

    sendSuccess(res, profile);
  } catch (error) {
    console.error('Get profile error:', error);
    sendError(res, 'Failed to fetch profile.');
  }
};

export const updateProfile = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      sendError(res, 'Not authenticated.', 401);
      return;
    }

    const {
      firstName,
      lastName,
      phone,
      dateOfBirth,
      gender,
      fatherName,
      address,
      city,
      district,
      state,
      pincode,
      aadharNumber,
      panNumber,
      qualification,
      profession,
      practiceArea,
      gstNumber,
    } = req.body;

    const updateData: Record<string, unknown> = {};

    if (firstName !== undefined) updateData.firstName = firstName;
    if (lastName !== undefined) updateData.lastName = lastName;
    if (phone !== undefined) updateData.phone = phone;
    if (dateOfBirth !== undefined) updateData.dateOfBirth = new Date(dateOfBirth);
    if (gender !== undefined) updateData.gender = gender;
    if (fatherName !== undefined) updateData.fatherName = fatherName;
    if (address !== undefined) updateData.address = address;
    if (city !== undefined) updateData.city = city;
    if (district !== undefined) updateData.district = district;
    if (state !== undefined) updateData.state = state;
    if (pincode !== undefined) updateData.pincode = pincode;
    if (aadharNumber !== undefined) updateData.aadharNumber = aadharNumber;
    if (panNumber !== undefined) updateData.panNumber = panNumber;
    if (qualification !== undefined) updateData.qualification = qualification;
    if (profession !== undefined) updateData.profession = profession;
    if (practiceArea !== undefined) updateData.practiceArea = practiceArea;
    if (gstNumber !== undefined) updateData.gstNumber = gstNumber;

    const existingProfile = await prisma.profile.findUnique({
      where: { userId: req.user.id },
    });

    let profile;
    if (existingProfile) {
      profile = await prisma.profile.update({
        where: { userId: req.user.id },
        data: updateData,
      });
    } else {
      if (!firstName || !lastName || !phone) {
        sendError(res, 'First name, last name, and phone are required for new profiles.', 400);
        return;
      }
      profile = await prisma.profile.create({
        data: {
          userId: req.user.id,
          firstName,
          lastName,
          phone,
          ...updateData,
        },
      });
    }

    sendSuccess(res, profile, 'Profile updated successfully.');
  } catch (error) {
    console.error('Update profile error:', error);
    sendError(res, 'Failed to update profile.');
  }
};

export const uploadDocuments = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      sendError(res, 'Not authenticated.', 401);
      return;
    }

    const files = req.files as { [fieldname: string]: Express.Multer.File[] } | undefined;

    if (!files || Object.keys(files).length === 0) {
      sendError(res, 'No files uploaded.', 400);
      return;
    }

    const updateData: Record<string, string> = {};

    if (files.aadharDoc && files.aadharDoc[0]) {
      updateData.aadharDocUrl = `/uploads/documents/${files.aadharDoc[0].filename}`;
    }
    if (files.panDoc && files.panDoc[0]) {
      updateData.panDocUrl = `/uploads/documents/${files.panDoc[0].filename}`;
    }
    if (files.photo && files.photo[0]) {
      updateData.photoUrl = `/uploads/photos/${files.photo[0].filename}`;
    }

    const existingProfile = await prisma.profile.findUnique({
      where: { userId: req.user.id },
    });

    if (!existingProfile) {
      sendError(res, 'Please create your profile first before uploading documents.', 400);
      return;
    }

    const profile = await prisma.profile.update({
      where: { userId: req.user.id },
      data: updateData,
    });

    sendSuccess(res, profile, 'Documents uploaded successfully.');
  } catch (error) {
    console.error('Upload documents error:', error);
    sendError(res, 'Failed to upload documents.');
  }
};
