import express, { type Request, type Response, type NextFunction } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import {
  initDatabase,
  getInternships,
  getInternshipById,
  createApplication,
  getApplications,
  checkRecentSubmission,
} from './db.ts';

export const app = express();

// Initialize the SQLite tables and seed data
initDatabase().catch((err) => {
  console.error('[DB] Failed to initialize SQLite database:', err);
});

// 1. Security Headers via Helmet
// Keep CSP and COEP permissive for the preview iframe environment while securing other headers
app.use(
  helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  })
);

// 2. Restrictive CORS Configuration
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',').map((o) => o.trim())
  : ['http://localhost:3000', 'http://127.0.0.1:3000'];

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps, curl, server-to-server, or same-origin)
      if (!origin) return callback(null, true);
      if (
        allowedOrigins.includes(origin) ||
        origin.endsWith('.run.app') ||
        origin.includes('localhost') ||
        origin.includes('127.0.0.1')
      ) {
        return callback(null, true);
      }
      return callback(new Error('Blocked by CORS policy: Origin not allowed'));
    },
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
  })
);

// 3. Request Body Size Limit (prevents large payload Denial of Service)
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

// 4. Rate Limiting via express-rate-limit
// General API rate limiter
const generalApiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 150, // Limit each IP to 150 requests per window
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  message: {
    success: false,
    error: 'Too many requests from this IP address, please try again after 15 minutes.',
  },
});

// Strict rate limiter for application submissions
const applicationSubmitLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 15, // Limit each IP to 15 submissions per 15 minutes
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: 'Submission rate limit reached. Please wait before submitting another application.',
  },
});

app.use('/api', generalApiLimiter);

// 5. REST Endpoints

/**
 * Health check endpoint: verifies server and SQLite database status
 */
app.get('/api/health', async (_req: Request, res: Response) => {
  try {
    const internships = await getInternships();
    res.json({
      success: true,
      status: 'healthy',
      timestamp: new Date().toISOString(),
      database: 'connected',
      internshipCount: internships.length,
      security: {
        helmetEnabled: true,
        rateLimitActive: true,
        sqlParameterized: true,
        bodyLimitBytes: 10240,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      status: 'unhealthy',
      error: 'Database connection failed',
    });
  }
});

/**
 * GET /api/internships
 * Fetch list of internships with optional filters (query, category, type)
 */
app.get('/api/internships', async (req: Request, res: Response) => {
  try {
    const query = typeof req.query.query === 'string' ? req.query.query : undefined;
    const category = typeof req.query.category === 'string' ? req.query.category : undefined;
    const type = typeof req.query.type === 'string' ? req.query.type : undefined;

    const internships = await getInternships({ query, category, type });

    res.json({
      success: true,
      data: internships,
      total: internships.length,
    });
  } catch (error) {
    console.error('[API] Error fetching internships:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve internships from database.',
    });
  }
});

/**
 * GET /api/internships/:id
 * Retrieve specific internship details
 */
app.get('/api/internships/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const internship = await getInternshipById(id);

    if (!internship) {
      res.status(404).json({
        success: false,
        error: `Internship with ID "${id}" was not found.`,
      });
      return;
    }

    res.json({
      success: true,
      data: internship,
    });
  } catch (error) {
    console.error(`[API] Error fetching internship ${req.params.id}:`, error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve internship details.',
    });
  }
});

/**
 * GET /api/applications
 * Retrieve submitted applications
 */
app.get('/api/applications', async (req: Request, res: Response) => {
  try {
    const email = typeof req.query.email === 'string' ? req.query.email : undefined;
    const applications = await getApplications(email);

    res.json({
      success: true,
      data: applications,
      total: applications.length,
    });
  } catch (error) {
    console.error('[API] Error fetching applications:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve applications.',
    });
  }
});

/**
 * POST /api/applications
 * Server-side validation, duplicate submission check, and SQLite persistence
 */
app.post('/api/applications', applicationSubmitLimiter, async (req: Request, res: Response) => {
  try {
    const { internship_id, name, email, message } = req.body;
    const validationErrors: Record<string, string> = {};

    // 1. Validate internship_id
    if (!internship_id || typeof internship_id !== 'string' || internship_id.trim() === '') {
      validationErrors.internship_id = 'Internship ID is required.';
    } else {
      const internship = await getInternshipById(internship_id.trim());
      if (!internship) {
        validationErrors.internship_id = 'The selected internship does not exist.';
      }
    }

    // 2. Validate name
    if (!name || typeof name !== 'string' || name.trim() === '') {
      validationErrors.name = 'Full name is required.';
    } else {
      const trimmedName = name.trim();
      if (trimmedName.length < 2) {
        validationErrors.name = 'Full name must be at least 2 characters.';
      } else if (trimmedName.length > 100) {
        validationErrors.name = 'Full name must not exceed 100 characters.';
      }
    }

    // 3. Validate email
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!email || typeof email !== 'string' || email.trim() === '') {
      validationErrors.email = 'Email address is required.';
    } else {
      const trimmedEmail = email.trim();
      if (!emailRegex.test(trimmedEmail)) {
        validationErrors.email = 'Please provide a valid email address (e.g. user@example.com).';
      } else if (trimmedEmail.length > 255) {
        validationErrors.email = 'Email address must not exceed 255 characters.';
      }
    }

    // 4. Validate message
    if (!message || typeof message !== 'string' || message.trim() === '') {
      validationErrors.message = 'Application message is required.';
    } else {
      const trimmedMessage = message.trim();
      if (trimmedMessage.length < 10) {
        validationErrors.message = 'Application message must be at least 10 characters long.';
      } else if (trimmedMessage.length > 1000) {
        validationErrors.message = 'Application message must not exceed 1,000 characters.';
      }
    }

    // Return 400 Bad Request if validation failed
    if (Object.keys(validationErrors).length > 0) {
      res.status(400).json({
        success: false,
        error: 'Validation failed. Please correct the highlighted errors.',
        details: validationErrors,
      });
      return;
    }

    // Check for duplicate application for the same internship by the same email
    const alreadyApplied = await checkRecentSubmission(email, internship_id);
    if (alreadyApplied) {
      res.status(409).json({
        success: false,
        error: 'You have already submitted an application for this internship position.',
      });
      return;
    }

    // Save into SQLite using parameterized query
    const savedApplication = await createApplication({
      internship_id: internship_id.trim(),
      name: name.trim(),
      email: email.trim(),
      message: message.trim(),
    });

    res.status(201).json({
      success: true,
      message: 'Application successfully submitted and recorded!',
      data: savedApplication,
    });
  } catch (error) {
    console.error('[API] Error submitting application:', error);
    res.status(500).json({
      success: false,
      error: 'An internal server error occurred while processing your application.',
    });
  }
});

// Error handling middleware
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  if (err?.type === 'entity.too.large') {
    res.status(413).json({
      success: false,
      error: 'Payload Too Large: Request body exceeds the 10KB limit.',
    });
    return;
  }
  if (err instanceof SyntaxError && 'body' in err) {
    res.status(400).json({
      success: false,
      error: 'Invalid JSON formatted body.',
    });
    return;
  }
  console.error('[SERVER ERROR]', err);
  res.status(500).json({
    success: false,
    error: 'Internal server error',
  });
});
