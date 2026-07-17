import { Request, Response, NextFunction } from 'express';

export const notFoundHandler = (req: Request, _res: Response, next: NextFunction) => {
  const error = new Error(`Route not found: ${req.method} ${req.originalUrl}`);
  (error as any).statusCode = 404;
  next(error);
};
