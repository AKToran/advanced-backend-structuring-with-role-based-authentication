import { pool } from "../../db";
import type { IUser } from "./user.interface";
import bcrypt from "bcryptjs";

const createUserInDB = async (payload: IUser) => {
  const { name, email, password, age, role } = payload;

  // const salt = await bcrypt.genSalt(10);
  const hashPassword = await bcrypt.hash(password, 10);

  const result = await pool.query(
    `
    INSERT INTO users(name, email, password, age, role) 
    VALUES($1,$2,$3,$4,COALESCE($5,'user'))
    RETURNING * 
    `,
    [name, email, hashPassword, age, role],
  );
  delete result.rows[0].password;
  return result;
};

const getAllUsersFromDB = async () => {
  const result = await pool.query(`
      SELECT * FROM USERS
  `);
  
  result.rows.map((row)=>{
    delete row.password;
  })
  return result;
};

const getSingleUserFromDB = async (id : string) =>{
  const result = await pool.query(
      `
      SELECT * FROM users WHERE id=$1
      `,
      [id],
    );

  // without optional chaining error:
  // "message": "Cannot convert undefined or null to object",
  delete result.rows[0]?.password;
  return result;
}

const updateUserInDB = async (payload: Partial<IUser>, id: string) =>{
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
      [name, password, age, is_active, id],
    );
    return result;
}

const deleteUserFromDB = async ( id: string)=>{
  const result = await pool.query(
      `
      DELETE FROM users WHERE id=$1
      `,
      [id],
    );
    return result;
}

export const userService = {
  createUserInDB,
  getAllUsersFromDB,
  getSingleUserFromDB,
  updateUserInDB,
  deleteUserFromDB
};
