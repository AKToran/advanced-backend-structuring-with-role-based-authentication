import bcrypt from "bcryptjs";
import { pool } from "../../db";
import jwt, { type JwtPayload } from "jsonwebtoken";
import type { StringValue } from "ms";
import config from "../../config/env";

const loginUserInDB = async (payload: { email: string; password: string }) => {
  const { email, password } = payload;
  //1. check if user exists
  const userData = await pool.query(
    `
    SELECT * FROM users WHERE email=$1
    `,
    [email],
  );

  if (userData.rows.length === 0) {
    throw new Error("Invalid Credentials!");
  }
  const user = userData.rows[0];

  //2. check if password is correct
  const matchPassword = await bcrypt.compare(password, user.password);
  if (!matchPassword) {
    throw new Error("Invalid Credentials!");
  }

  //3. generate token
  const jwtPayload = {
    id: user.id,
    name: user.name,
    role: user.role,
    is_active: user.is_active,
    email: user.email,
  };
  const accessToken = jwt.sign(jwtPayload, config.secret_key, {
    expiresIn: config.access_exp_time as StringValue
  }); 

  const refreshToken = jwt.sign(jwtPayload, config.refresh_key, {
    expiresIn: config.refresh_key_exp_time as StringValue,
  });

  return { accessToken, refreshToken };
};

const generateAccessTokenFromRefreshToken = async (token: string) => {
  if (!token) {
    throw new Error("Unauthorized.");
  }

  const decoded = jwt.verify(token, config.refresh_key) as JwtPayload;

  const userData = await pool.query(
    `
      SELECT * FROM users WHERE email=$1
      `,
    [decoded.email],
  );

  const user = userData.rows[0];

  if (userData.rows.length === 0) {
    throw new Error("User not found.");
  }

  if (!user?.is_active) {
    throw new Error("Forbidden.");
  }

  const jwtPayload = {
    id: user.id,
    name: user.name,
    role: user.role,
    is_active: user.is_active,
    email: user.email,
  };
  const accessToken = jwt.sign(jwtPayload, config.secret_key, {
    expiresIn: config.access_exp_time as StringValue,
  });

  return { accessToken };
};

export const authService = {
  loginUserInDB,
  generateAccessTokenFromRefreshToken,
};
