import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import routes from './routes';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';
import { env } from './config/env';

const app = express();

// Railway/Vercel sit behind a reverse proxy; needed for secure cookies + client IPs
app.set('trust proxy', 1);

app.use(helmet());
app.use(
  cors({
    origin: env.clientUrls,
    credentials: true,
  })
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

app.use('/api', routes);

app.use(notFoundHandler);
app.use(errorHandler);

export default app;
