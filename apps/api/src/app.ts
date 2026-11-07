import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import pinoHttp from 'pino-http';
import { env } from './config/env';
import { logger } from './utils/logger';
import { requestId } from './middlewares/requestId';
import { errorHandler, notFound } from './middlewares/errorHandler';
import routes from './routes';

export const app = express();

app.disable('x-powered-by');
app.use(requestId);
app.use(pinoHttp({ logger, genReqId: (_req, res) => res.locals.requestId }));
app.use(helmet());
app.use(cors({ origin: env.CLIENT_URL, credentials: true }));
app.use(express.json({ limit: '1mb' }));
app.use(cookieParser());

app.use('/api/v1', routes);

app.use(notFound);
app.use(errorHandler);