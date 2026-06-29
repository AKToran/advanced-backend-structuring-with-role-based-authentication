import type { NextFunction, Request, Response } from "express";
import fs from "fs";

const logger = (req: Request, res: Response, next: NextFunction) => {
  const log = `Method -> ${req.method} - Time -> ${Date.now()} - URL -> ${req.url}\n`;
  fs.appendFile('logger.txt', log, (err)=>{
    // console.log(err);
  })
  next();
}

export default logger