import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthRequest } from '../middleware/auth';
import { sendSuccess, sendError } from '../utils/apiResponse';

const prisma = new PrismaClient();

export const createEvent = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { title, description, date, venue, isPublished } = req.body;
    const file = req.file;

    const event = await prisma.event.create({
      data: {
        title,
        description,
        date: new Date(date),
        venue: venue || null,
        imageUrl: file ? `/uploads/events/${file.filename}` : null,
        isPublished: isPublished === 'true' || isPublished === true,
      },
    });

    sendSuccess(res, event, 'Event created successfully.', 201);
  } catch (error) {
    console.error('Create event error:', error);
    sendError(res, 'Failed to create event.');
  }
};

export const updateEvent = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { title, description, date, venue, isPublished } = req.body;
    const file = req.file;

    const existing = await prisma.event.findUnique({ where: { id } });
    if (!existing) {
      sendError(res, 'Event not found.', 404);
      return;
    }

    const updateData: Record<string, unknown> = {};
    if (title !== undefined) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    if (date !== undefined) updateData.date = new Date(date);
    if (venue !== undefined) updateData.venue = venue;
    if (file) updateData.imageUrl = `/uploads/events/${file.filename}`;
    if (isPublished !== undefined) {
      updateData.isPublished = isPublished === 'true' || isPublished === true;
    }

    const event = await prisma.event.update({
      where: { id },
      data: updateData,
    });

    sendSuccess(res, event, 'Event updated successfully.');
  } catch (error) {
    console.error('Update event error:', error);
    sendError(res, 'Failed to update event.');
  }
};

export const deleteEvent = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const existing = await prisma.event.findUnique({ where: { id } });
    if (!existing) {
      sendError(res, 'Event not found.', 404);
      return;
    }

    await prisma.event.delete({ where: { id } });

    sendSuccess(res, null, 'Event deleted successfully.');
  } catch (error) {
    console.error('Delete event error:', error);
    sendError(res, 'Failed to delete event.');
  }
};

export const getEventById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const event = await prisma.event.findUnique({ where: { id } });
    if (!event) {
      sendError(res, 'Event not found.', 404);
      return;
    }

    sendSuccess(res, event);
  } catch (error) {
    console.error('Get event error:', error);
    sendError(res, 'Failed to fetch event.');
  }
};

export const getPublicEvents = async (req: Request, res: Response): Promise<void> => {
  try {
    const { page = '1', limit = '10', upcoming } = req.query;
    const pageNum = parseInt(page as string, 10);
    const limitNum = parseInt(limit as string, 10);
    const skip = (pageNum - 1) * limitNum;

    const where: Record<string, unknown> = { isPublished: true };

    if (upcoming === 'true') {
      where.date = { gte: new Date() };
    }

    const [events, total] = await Promise.all([
      prisma.event.findMany({
        where,
        orderBy: { date: 'asc' },
        skip,
        take: limitNum,
      }),
      prisma.event.count({ where }),
    ]);

    sendSuccess(res, {
      events,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  } catch (error) {
    console.error('Get public events error:', error);
    sendError(res, 'Failed to fetch events.');
  }
};

export const getAllEvents = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { page = '1', limit = '10' } = req.query;
    const pageNum = parseInt(page as string, 10);
    const limitNum = parseInt(limit as string, 10);
    const skip = (pageNum - 1) * limitNum;

    const [events, total] = await Promise.all([
      prisma.event.findMany({
        orderBy: { date: 'desc' },
        skip,
        take: limitNum,
      }),
      prisma.event.count(),
    ]);

    sendSuccess(res, {
      events,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  } catch (error) {
    console.error('Get all events error:', error);
    sendError(res, 'Failed to fetch events.');
  }
};
