import express, {
  type Application,
  type Request,
  type Response,
} from "express";
import { userRoute } from "./modules/user/user.route";
import { profileRoute } from "./modules/profile/profile.route";
import { authRoute } from "./modules/auth/auth.route";
import logger from "./middleware/logger";
import CookieParser from "cookie-parser";
import cors from "cors";

const app: Application = express();

app.use(CookieParser());
app.use(express.json());
app.use(express.text());
app.use(express.urlencoded({ extended: true }));

app.use(logger);
app.use(
  cors({
    origin: "http://localhost:5000",
  }),
);

app.get("/", (req: Request, res: Response) => {
  // res.send('Hello World!');
  res.status(200).json({
    success: true,
    message: "Express server.",
    author: "Abid",
  });
});

app.use("/api/users", userRoute);
app.use("/api/profile", profileRoute);
app.use("/api/auth", authRoute);

export default app;
