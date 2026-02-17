// Extend Express Request interface
declare global {
  namespace Express {
    interface Request {
      id: string;
    }
  }
}

export {};
