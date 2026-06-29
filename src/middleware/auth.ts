import type { NextFunction, Request, Response } from "express";
import jwt, { type JwtPayload } from "jsonwebtoken";
import config from "../config/env";
import { pool } from "../db";
import type { ROLES } from "../types";

const auth = ( ...roles: ROLES[] ) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const token = req.headers.authorization;

      if (!token) {
        res.status(401).json({
          success: false,
          message: "Unauthorized access!!",
          data: {},
        });
        return;
      }

      const decoded = jwt.verify(token, config.secret_key) as JwtPayload;

      const userData = await pool.query(
        `
      SELECT * FROM users WHERE email=$1
      `,
        [decoded.email],
      );

      const user = userData.rows[0];

      if (userData.rows.length === 0) {
        res.status(404).json({
          success: false,
          message: "User not found!",
          data: {},
        });
        return;
      }

      if (!user?.is_active) {
        res.status(403).json({
          success: false,
          message: "Forbidden!",
          data: {},
        });
        return;
      }

      if(roles.length && !roles.includes(user.role)){
        res.status(403).json({
          success: false,
          message: "Access forbidden!",
          data: {},
        });
        return;
      }

      req.user = decoded;
      next();
    } catch (error) {
      next(error);
    }
  };
};

export default auth;
