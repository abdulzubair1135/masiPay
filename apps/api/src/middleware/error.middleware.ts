import { Request, Response, NextFunction } from 'express';
import { sendError } from '../utils/apiResponse.js';

export const errorHandler = (
  err: any,
  _req: Request,
  res: Response,
  _next: NextFunction
): void => {
  console.error('[Unhandled Error]:', err);

  if (err.name === 'CastError') {
    sendError(res, 'Resource not found or invalid identifier format', 400);
    return;
  }

  if (err.code === 11000) {
    const field = Object.keys(err.keyValue || {})[0] || 'field';
    sendError(res, `Duplicate entry for ${field}. It must be unique.`, 409);
    return;
  }

  const message = err.message || 'Internal Server Error';
  const statusCode = err.statusCode || 500;
  sendError(res, message, statusCode);
};
