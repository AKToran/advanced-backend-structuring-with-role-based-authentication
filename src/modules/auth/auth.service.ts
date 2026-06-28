import bcrypt from "bcryptjs";
import { pool } from "../../db";
import jwt from "jsonwebtoken";
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
    is_active: user.is_active,
    email: user.email,
  };
  const accessToken = jwt.sign(jwtPayload, config.secret_key, {
    expiresIn: "1d",
  });

  return { accessToken };
};

export const authService = {
  loginUserInDB,
};
