
      import { createRequire } from 'module';
      const require = createRequire(import.meta.url);
  

// src/config/env.ts
import dotenv from "dotenv";
import path from "path";
dotenv.config({
  path: path.join(process.cwd(), ".env")
});
var config = {
  connection_string: process.env.CONNECTION_STRING,
  port: process.env.PORT,
  secret_key: process.env.SECRET_KEY,
  refresh_key: process.env.REFRESH_KEY,
  access_exp_time: process.env.ACCESS_EXP_TIME,
  refresh_key_exp_time: process.env.REFRESH_KEY_EXP_TIME
};
var env_default = config;

// src/app.ts
import express from "express";

// src/modules/user/user.route.ts
import { Router } from "express";

// src/db/index.ts
import { Pool } from "pg";
var pool = new Pool({
  connectionString: env_default.connection_string
});
var initDB = async () => {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users(
      id SERIAL PRIMARY KEY,
      name VARCHAR(20),
      email VARCHAR(30) UNIQUE NOT NULL,
      password TEXT NOT NULL,
      is_active BOOLEAN DEFAULT true,
      age INT,
      role VARCHAR(10) DEFAULT 'user',

      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
      )
    `);
    await pool.query(`
      CREATE TABLE IF NOT EXISTS profiles(
      id SERIAL PRIMARY KEY,
      user_id INT UNIQUE REFERENCES users(id) ON DELETE CASCADE,
      bio TEXT,
      address TEXT,
      phone VARCHAR(15),
      gender VARCHAR(10),
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
      )
    `);
    console.log("Database connected successfully.");
  } catch (error) {
    console.log(error);
  }
};

// src/modules/user/user.service.ts
import bcrypt from "bcryptjs";
var createUserInDB = async (payload) => {
  const { name, email, password, age, role } = payload;
  const hashPassword = await bcrypt.hash(password, 10);
  const result = await pool.query(
    `
    INSERT INTO users(name, email, password, age, role) 
    VALUES($1,$2,$3,$4,COALESCE($5,'user'))
    RETURNING * 
    `,
    [name, email, hashPassword, age, role]
  );
  delete result.rows[0].password;
  return result;
};
var getAllUsersFromDB = async () => {
  const result = await pool.query(`
      SELECT * FROM USERS
  `);
  result.rows.map((row) => {
    delete row.password;
  });
  return result;
};
var getSingleUserFromDB = async (id) => {
  const result = await pool.query(
    `
      SELECT * FROM users WHERE id=$1
      `,
    [id]
  );
  delete result.rows[0]?.password;
  return result;
};
var updateUserInDB = async (payload, id) => {
  const { name, password, age, is_active } = payload;
  const result = await pool.query(
    `
    UPDATE users 
    SET 
    name=COALESCE($1,name), 
    password =COALESCE($2,password), 
    age =COALESCE($3,age), 
    is_active =COALESCE($4,is_active)
    WHERE id=$5 
    RETURNING *
    `,
    [name, password, age, is_active, id]
  );
  return result;
};
var deleteUserFromDB = async (id) => {
  const result = await pool.query(
    `
      DELETE FROM users WHERE id=$1
      `,
    [id]
  );
  return result;
};
var userService = {
  createUserInDB,
  getAllUsersFromDB,
  getSingleUserFromDB,
  updateUserInDB,
  deleteUserFromDB
};

// src/utility/sendResponse.ts
var sendResponse = (res, data) => {
  res.status(data.statusCode).json({
    success: data.success,
    message: data.message,
    data: data.data,
    error: data.error
  });
};
var sendResponse_default = sendResponse;

// src/modules/user/user.controller.ts
var createUser = async (req, res) => {
  try {
    const result = await userService.createUserInDB(req.body);
    sendResponse_default(res, {
      statusCode: 201,
      success: true,
      message: "User created successfully.",
      data: result.rows[0]
    });
  } catch (error) {
    sendResponse_default(res, {
      statusCode: 500,
      success: false,
      message: error.message,
      error
    });
    res.status(500).json({
      success: false,
      message: error.message,
      error
    });
  }
};
var getAllUsers = async (req, res) => {
  try {
    const result = await userService.getAllUsersFromDB();
    res.status(200).json({
      success: true,
      message: "Users retrieved successfully.",
      data: result.rows
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
      error
    });
  }
};
var getSingleUser = async (req, res) => {
  const { id } = req.params;
  try {
    const result = await userService.getSingleUserFromDB(id);
    if (result.rows.length === 0) {
      res.status(404).json({
        success: false,
        message: "User not found.",
        data: null
      });
      return;
    }
    res.status(200).json({
      success: true,
      message: "User retrieved successfully.",
      data: result.rows[0]
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
      error
    });
  }
};
var updateUser = async (req, res) => {
  const { id } = req.params;
  try {
    const result = await userService.updateUserInDB(req.body, id);
    if (result.rows.length === 0) {
      res.status(404).json({
        success: false,
        message: "User not found.",
        data: null
      });
      return;
    }
    res.status(200).json({
      success: true,
      message: "User updated successfully.",
      data: result.rows[0]
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
      error
    });
  }
};
var deleteUser = async (req, res) => {
  const { id } = req.params;
  try {
    const result = await userService.deleteUserFromDB(id);
    if (result.rowCount === 0) {
      res.status(404).json({
        success: false,
        message: "User not found.",
        data: null
      });
      return;
    }
    res.status(200).json({
      success: true,
      message: "User deleted successfully.",
      data: {}
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
      error
    });
  }
};
var userController = {
  createUser,
  getAllUsers,
  getSingleUser,
  updateUser,
  deleteUser
};

// src/middleware/auth.ts
import jwt from "jsonwebtoken";
var auth = (...roles) => {
  return async (req, res, next) => {
    try {
      const token = req.headers.authorization;
      if (!token) {
        res.status(401).json({
          success: false,
          message: "Unauthorized access!!",
          data: {}
        });
        return;
      }
      const decoded = jwt.verify(token, env_default.secret_key);
      const userData = await pool.query(
        `
      SELECT * FROM users WHERE email=$1
      `,
        [decoded.email]
      );
      const user = userData.rows[0];
      if (userData.rows.length === 0) {
        res.status(404).json({
          success: false,
          message: "User not found!",
          data: {}
        });
        return;
      }
      if (!user?.is_active) {
        res.status(403).json({
          success: false,
          message: "Forbidden!",
          data: {}
        });
        return;
      }
      if (roles.length && !roles.includes(user.role)) {
        res.status(403).json({
          success: false,
          message: "Access forbidden!",
          data: {}
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
var auth_default = auth;

// src/types/index.ts
var USER_ROLE = {
  admin: "admin",
  agent: "agent",
  user: "user"
};

// src/modules/user/user.route.ts
var router = Router();
router.post("/", userController.createUser);
router.get(
  "/",
  auth_default(USER_ROLE.admin, USER_ROLE.agent),
  userController.getAllUsers
);
router.get("/:id", userController.getSingleUser);
router.put("/:id", userController.updateUser);
router.delete("/:id", userController.deleteUser);
var userRoute = router;

// src/modules/profile/profile.route.ts
import { Router as Router2 } from "express";

// src/modules/profile/profile.service.ts
var createProfileInDB = async (payload) => {
  const { user_id, bio, address, phone, gender } = payload;
  const user = await pool.query(`
    SELECT * FROM users WHERE id=$1
    `, [user_id]);
  if (user.rows.length === 0) {
    throw new Error("User does not exist!");
  }
  const result = await pool.query(
    `
    INSERT INTO profiles(user_id, bio, address, phone, gender) 
    VALUES($1, $2, $3, $4, $5)
    RETURNING *
    `,
    [user_id, bio, address, phone, gender]
  );
  return result;
};
var profileService = {
  createProfileInDB
};

// src/modules/profile/profile.controller.ts
var createProfile = async (req, res) => {
  try {
    const result = await profileService.createProfileInDB(req.body);
    res.status(201).json({
      success: true,
      message: "Profile created successfully.",
      data: result.rows[0]
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
      error
    });
  }
};
var profileController = {
  createProfile
};

// src/modules/profile/profile.route.ts
var router2 = Router2();
router2.post("/", profileController.createProfile);
var profileRoute = router2;

// src/modules/auth/auth.route.ts
import { Router as Router3 } from "express";

// src/modules/auth/auth.service.ts
import bcrypt2 from "bcryptjs";
import jwt2 from "jsonwebtoken";
var loginUserInDB = async (payload) => {
  const { email, password } = payload;
  const userData = await pool.query(
    `
    SELECT * FROM users WHERE email=$1
    `,
    [email]
  );
  if (userData.rows.length === 0) {
    throw new Error("Invalid Credentials!");
  }
  const user = userData.rows[0];
  const matchPassword = await bcrypt2.compare(password, user.password);
  if (!matchPassword) {
    throw new Error("Invalid Credentials!");
  }
  const jwtPayload = {
    id: user.id,
    name: user.name,
    role: user.role,
    is_active: user.is_active,
    email: user.email
  };
  const accessToken = jwt2.sign(jwtPayload, env_default.secret_key, {
    expiresIn: env_default.access_exp_time
  });
  const refreshToken2 = jwt2.sign(jwtPayload, env_default.refresh_key, {
    expiresIn: env_default.refresh_key_exp_time
  });
  return { accessToken, refreshToken: refreshToken2 };
};
var generateAccessTokenFromRefreshToken = async (token) => {
  if (!token) {
    throw new Error("Unauthorized.");
  }
  const decoded = jwt2.verify(token, env_default.refresh_key);
  const userData = await pool.query(
    `
      SELECT * FROM users WHERE email=$1
      `,
    [decoded.email]
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
    email: user.email
  };
  const accessToken = jwt2.sign(jwtPayload, env_default.secret_key, {
    expiresIn: env_default.access_exp_time
  });
  return { accessToken };
};
var authService = {
  loginUserInDB,
  generateAccessTokenFromRefreshToken
};

// src/modules/auth/auth.controller.ts
var loginUser = async (req, res) => {
  try {
    const result = await authService.loginUserInDB(req.body);
    const { refreshToken: refreshToken2 } = result;
    res.cookie("refreshToken", refreshToken2, {
      secure: false,
      // production -> true
      httpOnly: true,
      sameSite: "lax"
    });
    res.status(201).json({
      success: true,
      message: "Login successful.",
      data: result.accessToken
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
      error
    });
  }
};
var refreshToken = async (req, res) => {
  try {
    const result = await authService.generateAccessTokenFromRefreshToken(req.cookies.refreshToken);
    res.status(201).json({
      success: true,
      message: "Access token generated.",
      data: result
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
      error
    });
  }
};
var authController = {
  loginUser,
  refreshToken
};

// src/modules/auth/auth.route.ts
var router3 = Router3();
router3.post("/login", authController.loginUser);
router3.post("/refresh-token", authController.refreshToken);
var authRoute = router3;

// src/middleware/logger.ts
import fs from "fs";
var logger = (req, res, next) => {
  const log = `Method -> ${req.method} - Time -> ${Date.now()} - URL -> ${req.url}
`;
  fs.appendFile("logger.txt", log, (err) => {
  });
  next();
};
var logger_default = logger;

// src/app.ts
import CookieParser from "cookie-parser";
import cors from "cors";

// src/middleware/globalErrorHandler.ts
var globalErrorHandler = (err, req, res, next) => {
  res.status(500).json({
    success: false,
    message: err.message || "Internal Server Error"
  });
};
var globalErrorHandler_default = globalErrorHandler;

// src/app.ts
var app = express();
app.use(CookieParser());
app.use(express.json());
app.use(express.text());
app.use(express.urlencoded({ extended: true }));
app.use(logger_default);
app.use(
  cors({
    origin: "http://localhost:5000"
  })
);
app.get("/", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Express server.",
    author: "Abid"
  });
});
app.use("/api/users", userRoute);
app.use("/api/profile", profileRoute);
app.use("/api/auth", authRoute);
app.use(globalErrorHandler_default);
var app_default = app;

// src/server.ts
var main = () => {
  initDB();
  app_default.listen(env_default.port, () => {
    console.log(`App listening on port ${env_default.port}`);
  });
};
main();
//# sourceMappingURL=server.js.map