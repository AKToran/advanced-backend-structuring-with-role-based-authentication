import dotenv from "dotenv";
import path from "path"

dotenv.config({
  path : path.join(process.cwd(), ".env"),
})

const config = {
  connection_string: process.env.CONNECTION_STRING as string,
  port: process.env.PORT,
  secret_key: process.env.SECRET_KEY as string,
  refresh_key: process.env.REFRESH_KEY as string
}

export default config;