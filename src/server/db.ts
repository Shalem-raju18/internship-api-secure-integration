import { createClient, type Client } from '@libsql/client';
import fs from 'fs';
import path from 'path';
import type { Internship, Application } from '../types/index.ts';

// Ensure data directory exists
const dbDir = path.resolve(process.cwd(), 'data');
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const dbPath = path.join(dbDir, 'edvyro.db');

export const db: Client = createClient({
  url: `file:${dbPath}`,
});

/**
 * Initialize database schema and initial seed data using parameterized queries
 */
export async function initDatabase(): Promise<void> {
  // Create internships table
  await db.execute(`
    CREATE TABLE IF NOT EXISTS internships (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      company TEXT NOT NULL,
      logo TEXT,
      location TEXT NOT NULL,
      type TEXT NOT NULL CHECK(type IN ('Remote', 'Hybrid', 'On-site')),
      category TEXT NOT NULL CHECK(category IN ('Software Engineering', 'Data Science', 'Product Design', 'Marketing', 'DevOps', 'Cybersecurity')),
      stipend TEXT NOT NULL,
      deadline TEXT NOT NULL,
      description TEXT NOT NULL,
      requirements TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Create applications table
  await db.execute(`
    CREATE TABLE IF NOT EXISTS applications (
      id TEXT PRIMARY KEY,
      internship_id TEXT NOT NULL,
      name TEXT NOT NULL,
      email TEXT NOT NULL,
      message TEXT NOT NULL,
      status TEXT DEFAULT 'submitted' CHECK(status IN ('submitted', 'under_review', 'accepted', 'rejected')),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (internship_id) REFERENCES internships(id) ON DELETE CASCADE
    );
  `);

  // Index for fast query lookups and search
  await db.execute(`
    CREATE INDEX IF NOT EXISTS idx_internships_category ON internships(category);
  `);
  await db.execute(`
    CREATE INDEX IF NOT EXISTS idx_applications_internship ON applications(internship_id);
  `);
  await db.execute(`
    CREATE INDEX IF NOT EXISTS idx_applications_email ON applications(email);
  `);

  // Check if seeding is required
  const countResult = await db.execute('SELECT COUNT(*) as count FROM internships');
  const count = Number(countResult.rows[0]?.count ?? 0);

  if (count === 0) {
    console.log('[DB] Seeding initial verified internships into SQLite...');
    const seedInternships = [
      {
        id: 'int-001',
        title: 'Full Stack Web Developer Intern',
        company: 'CloudNex Technologies',
        logo: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=128&auto=format&fit=crop&q=80',
        location: 'Bangalore, India (Hybrid)',
        type: 'Hybrid',
        category: 'Software Engineering',
        stipend: '₹25,000 / month',
        deadline: '2026-11-15',
        description: 'Work alongside senior engineers building scalable customer dashboards using React, Node.js, and TypeScript. You will be responsible for creating responsive UI features, writing clean REST APIs, and participating in weekly code reviews.',
        requirements: JSON.stringify([
          'Familiarity with React, JavaScript/TypeScript, and modern CSS',
          'Understanding of RESTful API design and Express.js basics',
          'Familiarity with Git version control and collaborative workflows',
          'Good problem-solving abilities and passion for web development'
        ])
      },
      {
        id: 'int-002',
        title: 'Frontend React & UI/UX Intern',
        company: 'Aura Interactive',
        logo: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=128&auto=format&fit=crop&q=80',
        location: 'Remote (Global)',
        type: 'Remote',
        category: 'Product Design',
        stipend: '$1,200 / month',
        deadline: '2026-11-20',
        description: 'Design and build accessible, responsive user interfaces for modern SaaS platforms. You will bridge design mockups in Figma with pixel-perfect React components using Tailwind CSS and Framer Motion.',
        requirements: JSON.stringify([
          'Experience building responsive web layouts with Tailwind CSS',
          'Working knowledge of Figma and design-to-code translation',
          'Attention to micro-interactions and accessibility standards (WCAG)',
          'Strong communication skills in a remote environment'
        ])
      },
      {
        id: 'int-003',
        title: 'Junior Data Analyst & ML Intern',
        company: 'InsightWave Analytics',
        logo: 'https://images.unsplash.com/photo-1507679799987-c73779587ccf?w=128&auto=format&fit=crop&q=80',
        location: 'Hyderabad, India (On-site)',
        type: 'On-site',
        category: 'Data Science',
        stipend: '₹30,000 / month',
        deadline: '2026-11-30',
        description: 'Analyze real-time market datasets and assist data scientists in training exploratory machine learning models. You will clean and visualize data pipelines using Python, SQL, and interactive dashboards.',
        requirements: JSON.stringify([
          'Proficiency in Python (Pandas, NumPy, Matplotlib/Seaborn)',
          'Strong SQL skills for aggregating and querying relational tables',
          'Basic understanding of statistical concepts and linear models',
          'Enthusiasm for data storytelling and business intelligence'
        ])
      },
      {
        id: 'int-004',
        title: 'Cloud DevOps & Infrastructure Intern',
        company: 'Vortex Cloud Solutions',
        logo: 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=128&auto=format&fit=crop&q=80',
        location: 'Remote (India)',
        type: 'Remote',
        category: 'DevOps',
        stipend: '₹28,000 / month',
        deadline: '2026-12-05',
        description: 'Learn modern CI/CD automation, Docker containerization, and cloud infrastructure monitoring. You will assist in maintaining reliable production deployments and writing automation scripts in bash and TypeScript.',
        requirements: JSON.stringify([
          'Basic knowledge of Linux shell scripting and command line',
          'Fundamental understanding of Docker containers and networking',
          'Familiarity with GitHub Actions or automated build pipelines',
          'Curiosity for site reliability and cloud architecture'
        ])
      },
      {
        id: 'int-005',
        title: 'Cybersecurity Analyst Trainee',
        company: 'Fortress Guard Security',
        logo: 'https://images.unsplash.com/photo-1563986768609-322da13575f3?w=128&auto=format&fit=crop&q=80',
        location: 'Pune, India (Hybrid)',
        type: 'Hybrid',
        category: 'Cybersecurity',
        stipend: '₹32,000 / month',
        deadline: '2026-12-10',
        description: 'Assist in vulnerability assessments, security policy audits, and penetration testing on web applications. Learn OWASP Top 10 vulnerabilities, API security validation, and defensive hardening techniques.',
        requirements: JSON.stringify([
          'Knowledge of OWASP Web Security risks (SQLi, XSS, CSRF)',
          'Basic understanding of HTTP protocols, TLS/SSL, and headers',
          'Familiarity with network scanning tools and security fundamentals',
          'High ethical standards and problem-solving mindset'
        ])
      },
      {
        id: 'int-006',
        title: 'Digital Marketing & Growth Intern',
        company: 'HyperGrowth Media',
        logo: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=128&auto=format&fit=crop&q=80',
        location: 'Remote (US/India)',
        type: 'Remote',
        category: 'Marketing',
        stipend: '$1,000 / month',
        deadline: '2026-11-25',
        description: 'Coordinate developer community outreach, technical content creation, and search optimization campaigns. Drive engagement on technical forums and track growth metrics across developer channels.',
        requirements: JSON.stringify([
          'Strong written English and technical copywriting aptitude',
          'Familiarity with SEO concepts and web analytics tools',
          'Experience managing social channels or student communities',
          'Creative mindset with attention to detail'
        ])
      }
    ];

    for (const item of seedInternships) {
      // PARAMETERIZED INSERT - prevents SQL injection
      await db.execute({
        sql: `INSERT INTO internships (id, title, company, logo, location, type, category, stipend, deadline, description, requirements)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [
          item.id,
          item.title,
          item.company,
          item.logo,
          item.location,
          item.type,
          item.category,
          item.stipend,
          item.deadline,
          item.description,
          item.requirements
        ]
      });
    }
    console.log('[DB] Seeding completed successfully.');
  }
}

/**
 * Get all internships with optional filters using parameterized SQL
 */
export async function getInternships(filters?: {
  query?: string;
  category?: string;
  type?: string;
}): Promise<Internship[]> {
  let sql = 'SELECT * FROM internships WHERE 1=1';
  const args: (string | number)[] = [];

  if (filters?.category && filters.category !== 'All') {
    sql += ' AND category = ?';
    args.push(filters.category);
  }

  if (filters?.type && filters.type !== 'All') {
    sql += ' AND type = ?';
    args.push(filters.type);
  }

  if (filters?.query && filters.query.trim() !== '') {
    sql += ' AND (title LIKE ? OR company LIKE ? OR description LIKE ? OR location LIKE ?)';
    const searchPattern = `%${filters.query.trim()}%`;
    args.push(searchPattern, searchPattern, searchPattern, searchPattern);
  }

  sql += ' ORDER BY created_at DESC';

  const result = await db.execute({ sql, args });

  return result.rows.map((row) => ({
    id: String(row.id),
    title: String(row.title),
    company: String(row.company),
    logo: String(row.logo || ''),
    location: String(row.location),
    type: String(row.type) as Internship['type'],
    category: String(row.category) as Internship['category'],
    stipend: String(row.stipend),
    deadline: String(row.deadline),
    description: String(row.description),
    requirements: typeof row.requirements === 'string' ? JSON.parse(row.requirements) : [],
    created_at: String(row.created_at || ''),
  }));
}

/**
 * Get a single internship by ID
 */
export async function getInternshipById(id: string): Promise<Internship | null> {
  const result = await db.execute({
    sql: 'SELECT * FROM internships WHERE id = ?',
    args: [id],
  });

  if (result.rows.length === 0) return null;
  const row = result.rows[0];

  return {
    id: String(row.id),
    title: String(row.title),
    company: String(row.company),
    logo: String(row.logo || ''),
    location: String(row.location),
    type: String(row.type) as Internship['type'],
    category: String(row.category) as Internship['category'],
    stipend: String(row.stipend),
    deadline: String(row.deadline),
    description: String(row.description),
    requirements: typeof row.requirements === 'string' ? JSON.parse(row.requirements) : [],
    created_at: String(row.created_at || ''),
  };
}

/**
 * Check if the user already submitted an application for the exact same internship recently
 */
export async function checkRecentSubmission(email: string, internshipId: string): Promise<boolean> {
  const result = await db.execute({
    sql: 'SELECT COUNT(*) as count FROM applications WHERE email = ? AND internship_id = ?',
    args: [email.toLowerCase().trim(), internshipId],
  });
  return Number(result.rows[0]?.count ?? 0) > 0;
}

/**
 * Save an application into SQLite with parameterized query
 */
export async function createApplication(data: {
  internship_id: string;
  name: string;
  email: string;
  message: string;
}): Promise<Application> {
  const id = `app-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
  const now = new Date().toISOString();

  await db.execute({
    sql: `INSERT INTO applications (id, internship_id, name, email, message, status, created_at)
          VALUES (?, ?, ?, ?, ?, 'submitted', ?)`,
    args: [
      id,
      data.internship_id,
      data.name.trim(),
      data.email.toLowerCase().trim(),
      data.message.trim(),
      now,
    ],
  });

  return {
    id,
    internship_id: data.internship_id,
    name: data.name.trim(),
    email: data.email.toLowerCase().trim(),
    message: data.message.trim(),
    status: 'submitted',
    created_at: now,
  };
}

/**
 * Retrieve submitted applications
 */
export async function getApplications(email?: string): Promise<Application[]> {
  let sql = `
    SELECT a.*, i.title as internship_title, i.company
    FROM applications a
    LEFT JOIN internships i ON a.internship_id = i.id
  `;
  const args: string[] = [];

  if (email && email.trim() !== '') {
    sql += ' WHERE a.email = ?';
    args.push(email.toLowerCase().trim());
  }

  sql += ' ORDER BY a.created_at DESC';

  const result = await db.execute({ sql, args });

  return result.rows.map((row) => ({
    id: String(row.id),
    internship_id: String(row.internship_id),
    name: String(row.name),
    email: String(row.email),
    message: String(row.message),
    status: String(row.status) as Application['status'],
    created_at: String(row.created_at),
    internship_title: row.internship_title ? String(row.internship_title) : undefined,
    company: row.company ? String(row.company) : undefined,
  }));
}
