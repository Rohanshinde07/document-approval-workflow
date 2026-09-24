import dotenv from 'dotenv';
dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || '3000', 10),
  databaseUrl: process.env.DATABASE_URL || 'file:./dev.db',
  jwtSecret: process.env.JWT_SECRET || 'dev-jwt-secret-key-32-chars-minimum-length-spec',
  jwtExpiresIn: '8h',

  // Frontend base URL (for generating invite links)
  appBaseUrl: process.env.APP_BASE_URL || 'http://localhost:5173',

  // SMTP — configure these in .env to enable real email delivery
  // Leave blank to use console logging fallback (development)
  smtpHost: process.env.SMTP_HOST || '',        // e.g. 'smtp.gmail.com'
  smtpPort: parseInt(process.env.SMTP_PORT || '587', 10),
  smtpUser: process.env.SMTP_USER || '',        // your Gmail address
  smtpPass: process.env.SMTP_PASS || '',        // Gmail App Password
  smtpFrom: process.env.SMTP_FROM || '',        // e.g. '"DocApproval" <you@gmail.com>'
};
