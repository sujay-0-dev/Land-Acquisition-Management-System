import cors from 'cors';
import express from 'express';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import { env } from './config/env.js';
import { prisma } from './config/database.js';
import apiRoutes from './routes/index.js';
import { errorHandler } from './middleware/error.middleware.js';
import { AppError } from './utils/response.js';
import swaggerUi from 'swagger-ui-express';
import { swaggerSpec } from './config/swagger.js';

export const app = express();

// Trust reverse proxy (Render/Heroku) for rate limiting
app.set('trust proxy', 1);

app.get('/api-docs/swagger.json', (req, res) => res.json(swaggerSpec));
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(null, { 
    customSiteTitle: "BHOOMISETU API Docs",
    swaggerOptions: { url: '/api-docs/swagger.json' }
}));

app.use(helmet({
    contentSecurityPolicy: env.nodeEnv === 'production' ? undefined : false,
    crossOriginEmbedderPolicy: false
}));
app.use(cors({
    origin: (requestOrigin, callback) => {
        if (!requestOrigin || env.corsOrigin.includes(requestOrigin)) {
            return callback(null, true);
        }

        return callback(null, false);
    },
    credentials: true,
}));
import { globalLimiter } from './middleware/rate-limit.middleware.js';
app.use(express.json({ limit: '100kb' }));
app.use(globalLimiter);
app.use((request, _response, next) => {
    const startTime = Date.now();
    const originalJson = _response.json.bind(_response);

    _response.json = (body) => {
        const elapsedMs = Date.now() - startTime;
        if (request.path.startsWith('/api') && request.path !== '/api/health' && request.method !== 'OPTIONS') {
            
            let safeBody = null;
            if (request.method !== 'GET' && request.body) {
                safeBody = { ...request.body };
                if (safeBody.password) safeBody.password = '[REDACTED]';
            }

            prisma.auditLog.create({
                data: {
                    userId: request.user?.sub ?? null,
                    action: `${request.method} ${request.path}`,
                    entity: 'API_REQUEST',
                    entityId: `${request.method}:${request.path}`,
                    previousValue: { statusCode: _response.statusCode, elapsedMs },
                    newValue: {
                        query: request.query,
                        body: safeBody
                    }
                }
            }).catch((error) => console.error('Audit logging failed:', error.message));
        }

        return originalJson(body);
    };

    next();
});

app.use('/api', apiRoutes);

app.use((_req, _res, next) => {
    next(new AppError(404, 'NOT_FOUND', 'Endpoint not found'));
});

app.use(errorHandler);
