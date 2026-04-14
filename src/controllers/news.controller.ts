import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthRequest } from '../middleware/auth';
import { sendSuccess, sendError } from '../utils/apiResponse';

const prisma = new PrismaClient();

export const createNews = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { title, content, isPublished } = req.body;
    const file = req.file;

    const news = await prisma.news.create({
      data: {
        title,
        content,
        imageUrl: file ? `/uploads/news/${file.filename}` : null,
        isPublished: isPublished === 'true' || isPublished === true,
        publishedAt: isPublished === 'true' || isPublished === true ? new Date() : null,
      },
    });

    sendSuccess(res, news, 'News created successfully.', 201);
  } catch (error) {
    console.error('Create news error:', error);
    sendError(res, 'Failed to create news.');
  }
};

export const updateNews = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { title, content, isPublished } = req.body;
    const file = req.file;

    const existing = await prisma.news.findUnique({ where: { id } });
    if (!existing) {
      sendError(res, 'News not found.', 404);
      return;
    }

    const updateData: Record<string, unknown> = {};
    if (title !== undefined) updateData.title = title;
    if (content !== undefined) updateData.content = content;
    if (file) updateData.imageUrl = `/uploads/news/${file.filename}`;

    if (isPublished !== undefined) {
      const publish = isPublished === 'true' || isPublished === true;
      updateData.isPublished = publish;
      if (publish && !existing.publishedAt) {
        updateData.publishedAt = new Date();
      }
    }

    const news = await prisma.news.update({
      where: { id },
      data: updateData,
    });

    sendSuccess(res, news, 'News updated successfully.');
  } catch (error) {
    console.error('Update news error:', error);
    sendError(res, 'Failed to update news.');
  }
};

export const deleteNews = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const existing = await prisma.news.findUnique({ where: { id } });
    if (!existing) {
      sendError(res, 'News not found.', 404);
      return;
    }

    await prisma.news.delete({ where: { id } });

    sendSuccess(res, null, 'News deleted successfully.');
  } catch (error) {
    console.error('Delete news error:', error);
    sendError(res, 'Failed to delete news.');
  }
};

export const getNewsById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const news = await prisma.news.findUnique({ where: { id } });
    if (!news) {
      sendError(res, 'News not found.', 404);
      return;
    }

    sendSuccess(res, news);
  } catch (error) {
    console.error('Get news error:', error);
    sendError(res, 'Failed to fetch news.');
  }
};

export const getPublicNews = async (req: Request, res: Response): Promise<void> => {
  try {
    const { page = '1', limit = '10' } = req.query;
    const pageNum = parseInt(page as string, 10);
    const limitNum = parseInt(limit as string, 10);
    const skip = (pageNum - 1) * limitNum;

    const [news, total] = await Promise.all([
      prisma.news.findMany({
        where: { isPublished: true },
        orderBy: { publishedAt: 'desc' },
        skip,
        take: limitNum,
      }),
      prisma.news.count({ where: { isPublished: true } }),
    ]);

    sendSuccess(res, {
      news,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  } catch (error) {
    console.error('Get public news error:', error);
    sendError(res, 'Failed to fetch news.');
  }
};

export const getAllNews = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { page = '1', limit = '10' } = req.query;
    const pageNum = parseInt(page as string, 10);
    const limitNum = parseInt(limit as string, 10);
    const skip = (pageNum - 1) * limitNum;

    const [news, total] = await Promise.all([
      prisma.news.findMany({
        orderBy: { createdAt: 'desc' },
        skip,
        take: limitNum,
      }),
      prisma.news.count(),
    ]);

    sendSuccess(res, {
      news,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  } catch (error) {
    console.error('Get all news error:', error);
    sendError(res, 'Failed to fetch news.');
  }
};
