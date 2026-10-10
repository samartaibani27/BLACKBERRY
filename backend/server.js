
const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const functions = require('firebase-functions');

const {
    initializeApp,
    cert,
    getApps
} = require('firebase-admin/app');

const { getFirestore } = require('firebase-admin/firestore');

const { logger } = require('./utils/logger');
const { sanitizeInputs } = require('./middleware/validationMiddleware');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Trust Render's reverse proxy
app.set('trust proxy', 1);
app.disable('x-powered-by');

// 1. Security Headers
app.use(
    helmet({
        contentSecurityPolicy: {
            directives: {
                defaultSrc: ["'self'"],
                scriptSrc: ["'self'", "'unsafe-inline'"],
                styleSrc: [
                    "'self'",
                    "'unsafe-inline'",
                    'https://fonts.googleapis.com'
                ],
                imgSrc: [
                    "'self'",
                    'data:',
                    'https:',
                    'http:',
                    'blob:'
                ],
                fontSrc: [
                    "'self'",
                    'https://fonts.gstatic.com'
                ],
                connectSrc: [
                    "'self'",
                    'https://identitytoolkit.googleapis.com',
                    'https://firestore.googleapis.com',
                    'https://blackberry-ruwx.onrender.com'
                ],
                frameAncestors: ["'none'"],
                objectSrc: ["'none'"]
            }
        },
        crossOriginResourcePolicy: {
            policy: 'cross-origin'
        },
        crossOriginEmbedderPolicy: false,
        hsts: {
            maxAge: 31536000,
            includeSubDomains: true,
            preload: true
        }
    })
);

// 2. CORS
const defaultAllowedOrigins = [
    'http://localhost:4200',
    'http://127.0.0.1:4200',
    'https://petfoodshop-fean.web.app',
    'https://petfoodshop-fean.firebaseapp.com',
    'https://blackberry-1zh5nb2df-sam-5135.vercel.app'
];

const envOrigins = process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS
        .split(',')
        .map(origin => origin.trim())
        .filter(Boolean)
    : [];

const allowedOrigins = Array.from(
    new Set([...defaultAllowedOrigins, ...envOrigins])
);

app.use(
    cors({
        origin: (origin, callback) => {
            if (!origin || allowedOrigins.includes(origin)) {
                return callback(null, true);
            }

            logger.warn(`CORS blocked request from origin: ${origin}`);
            return callback(new Error('Origin not allowed by CORS'));
        },
        credentials: true,
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
        allowedHeaders: [
            'Content-Type',
            'Authorization',
            'X-Requested-With'
        ]
    })
);

// 3. Firebase Admin Setup
// Initialize Firebase BEFORE importing routes.
let db;

try {
    let adminApp;

    const existingApps = getApps();

    if (existingApps.length > 0) {
        adminApp =
            existingApps.find(item => item.name === '[DEFAULT]') ||
            existingApps[0];
    } else {
        let credentialObj;

        if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
            const serviceAccount = JSON.parse(
                process.env.FIREBASE_SERVICE_ACCOUNT_JSON
            );

            credentialObj = cert(serviceAccount);
        } else if (
            process.env.FIREBASE_PROJECT_ID &&
            process.env.FIREBASE_CLIENT_EMAIL &&
            process.env.FIREBASE_PRIVATE_KEY
        ) {
            credentialObj = cert({
                projectId: process.env.FIREBASE_PROJECT_ID,
                clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
                privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(
                    /\\n/g,
                    '\n'
                )
            });
        } else {
            const serviceAccount = require('./serviceAccountKey.json');
            credentialObj = cert(serviceAccount);
        }

        adminApp = initializeApp({
            credential: credentialObj
        });
    }

    // Explicitly use the initialized app.
    db = getFirestore(adminApp);

    logger.info('Firebase Admin SDK Initialized Successfully');
} catch (error) {
    logger.error('Firebase Config Error', {
        error: error.message
    });

    // Do not start the server with Firebase uninitialized.
    throw error;
}

// 4. Body Parsing and Sanitization
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ limit: '1mb', extended: true }));
app.use(sanitizeInputs);

// 5. Static Uploads
app.use(
    '/uploads',
    express.static('uploads', {
        setHeaders: (res) => {
            res.set('X-Content-Type-Options', 'nosniff');
            res.set('Content-Disposition', 'inline');
            res.set('Cross-Origin-Resource-Policy', 'cross-origin');
            res.set('Access-Control-Allow-Origin', '*');
        }
    })
);

// 6. Health Endpoints
app.get('/health', (req, res) => {
    res.status(200).json({ status: 'ok' });
});

app.get('/', (req, res) => {
    res.json({
        status: 'healthy',
        service: 'Blackberry Pet Shop API'
    });
});

// 7. Rate Limiting
const globalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        error: 'Too many requests from this IP. Please try again later.'
    }
});

const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        error: 'Too many authentication attempts. Please try again later.'
    }
});

app.use('/api/', globalLimiter);

// 8. Import Routes AFTER Firebase Initialization
const authRoutes = require('./routes/auth.routes');
const productRoutes = require('./routes/product.routes');
const categoryRoutes = require('./routes/category.routes');
const orderRoutes = require('./routes/order.routes');
const userRoutes = require('./routes/user.routes');
const wishlistRoutes = require('./routes/wishlist.routes');
const ratingRoutes = require('./routes/rating.routes');
const statsRoutes = require('./routes/stats.routes');
const contactRoutes = require('./routes/contact.routes');
const adoptionRoutes = require('./routes/adoption.routes');
const adoptionFormRoutes = require('./routes/adoptionForm.routes');
const subCategoryRoutes = require('./routes/subcategory.routes');

// 9. API Routes
app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/subcategories', subCategoryRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/users', userRoutes);
app.use('/api/wishlist', wishlistRoutes);
app.use('/api/ratings', ratingRoutes);
app.use('/api/stats', statsRoutes);
app.use('/api/contact', contactRoutes);
app.use('/api/adoptions', adoptionRoutes);
app.use('/api/adoption-forms', adoptionFormRoutes);

// 10. Centralized Error Handler
app.use((err, req, res, next) => {
    logger.error('Unhandled Error encountered', {
        error: err.message,
        stack:
            process.env.NODE_ENV === 'production'
                ? undefined
                : err.stack,
        path: req.originalUrl
    });

    if (res.headersSent) {
        return next(err);
    }

    const statusCode = err.status || err.statusCode || 500;

    res.status(statusCode).json({
        error:
            process.env.NODE_ENV === 'production' && statusCode >= 500
                ? 'Internal Server Error'
                : err.message
    });
});

// 11. Start server on Render/local Node.
// Preserve the Cloud Functions export if this app is also used there.
if (!process.env.FUNCTION_NAME && !process.env.FUNCTIONS_EMULATOR) {
    app.listen(PORT, () => {
        logger.info(`Server running on port ${PORT}`);
    });
}

exports.api = functions.https.onRequest(app);
module.exports.db = db;
