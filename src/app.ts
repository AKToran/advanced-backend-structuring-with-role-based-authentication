import express, {
  type Application,
  type Request,
  type Response,
} from "express";
import { pool } from "./db";
import { userRoute } from "./modules/user/user.route";

const app: Application = express();

app.use(express.json());
app.use(express.text());
app.use(express.urlencoded({ extended: true }));



app.get("/", (req: Request, res: Response) => {
  // res.send('Hello World!');
  res.status(200).json({
    success: true,
    message: "Express server.",
    author: "Abid",
  });
});

app.use('/api/users', userRoute);

export default app;