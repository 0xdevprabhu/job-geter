import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { spawn } from 'node:child_process';
import path from 'node:path';
import fs from 'node:fs';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

// Custom Vite API plugin to handle SMTP OTP mailing and maintenance tasks
function authApiPlugin() {
  return {
    name: 'job-tracker-auth-api',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (!req.url || !req.url.startsWith('/api/')) {
          return next();
        }

        // Helper to parse JSON body
        const readBody = () =>
          new Promise((resolve) => {
            let data = '';
            req.on('data', (chunk) => (data += chunk));
            req.on('end', () => {
              try {
                resolve(data ? JSON.parse(data) : {});
              } catch (e) {
                resolve({});
              }
            });
          });

        res.setHeader('Content-Type', 'application/json');

        const sendJson = (statusCode, payload) => {
          res.statusCode = statusCode;
          res.end(JSON.stringify(payload));
        };

        const executePython = (scriptPath, args) => {
          return new Promise((resolve) => {
            const venvWin = path.join(rootDir, 'backend-scraper', 'venv', 'Scripts', 'python.exe');
            const venvNix = path.join(rootDir, 'backend-scraper', 'venv', 'bin', 'python');
            let pythonBin = fs.existsSync(venvWin)
              ? venvWin
              : fs.existsSync(venvNix)
              ? venvNix
              : process.platform === 'win32'
              ? 'python'
              : 'python3';

            const proc = spawn(pythonBin, [scriptPath, ...args], {
              cwd: path.dirname(scriptPath),
              env: process.env,
            });

            let stdout = '';
            let stderr = '';

            proc.stdout.on('data', (d) => (stdout += d.toString()));
            proc.stderr.on('data', (d) => (stderr += d.toString()));

            proc.on('close', (code) => {
              try {
                // Find last line that is valid JSON
                const lines = stdout.trim().split('\n');
                let parsed = null;
                for (let i = lines.length - 1; i >= 0; i--) {
                  try {
                    parsed = JSON.parse(lines[i]);
                    break;
                  } catch {}
                }
                if (parsed) return resolve(parsed);
              } catch {}

              if (code === 0) {
                resolve({ success: true, output: stdout.trim() });
              } else {
                resolve({
                  success: false,
                  error: stderr.trim() || stdout.trim() || `Process exited with code ${code}`,
                });
              }
            });

            proc.on('error', (err) => {
              resolve({ success: false, error: `Failed to execute python: ${err.message}` });
            });
          });
        };

        const mailScript = path.join(rootDir, 'backend-scraper', 'mail_service.py');
        const scraperScript = path.join(rootDir, 'backend-scraper', 'scraper.py');

        const OTP_SECRET = process.env.OTP_SECRET || 'zipzap-cloud-secret-otp-token-2026';

        // Route: Send OTP
        if (req.url === '/api/send-otp' && req.method === 'POST') {
          const body = await readBody();
          const email = (body.email || '').trim().toLowerCase();
          const purpose = body.purpose || 'signup';

          if (!email || !email.includes('@')) {
            return sendJson(400, { success: false, error: 'Valid email address is required.' });
          }

          // Generate 6 digit numeric OTP
          const otp = Math.floor(100000 + Math.random() * 900000).toString();
          const result = await executePython(mailScript, ['send', email, otp, purpose]);
          
          if (result.success) {
            const expiresAt = Date.now() + 10 * 60 * 1000;
            const hmac = crypto.createHmac('sha256', OTP_SECRET);
            hmac.update(`${email}:${otp}:${expiresAt}`);
            result.token = `${expiresAt}:${hmac.digest('hex')}`;
            result.expires_timestamp = expiresAt;
          }

          return sendJson(result.success ? 200 : 500, result);
        }

        // Route: Verify OTP
        if (req.url === '/api/verify-otp' && req.method === 'POST') {
          const body = await readBody();
          const email = (body.email || '').trim().toLowerCase();
          const otp = (body.otp || '').trim();
          const token = (body.token || '').trim();

          if (!email || !otp) {
            return sendJson(400, { success: false, error: 'Email and OTP code are required.' });
          }

          if (token && token.includes(':')) {
            const [expiresAtStr, sig] = token.split(':');
            const expiresAt = Number(expiresAtStr);
            if (Date.now() <= expiresAt) {
              const hmac = crypto.createHmac('sha256', OTP_SECRET);
              hmac.update(`${email}:${otp}:${expiresAtStr}`);
              if (sig === hmac.digest('hex')) {
                return sendJson(200, { success: true, message: 'OTP verified successfully!' });
              }
            }
          }

          const result = await executePython(mailScript, ['verify', email, otp]);
          return sendJson(result.success ? 200 : 400, result);
        }

        // Route: Test SMTP
        if (req.url === '/api/test-smtp' && req.method === 'POST') {
          const body = await readBody();
          const email = (body.email || '').trim();
          const result = await executePython(mailScript, ['test', email]);
          return sendJson(result.success ? 200 : 500, result);
        }

        // Route: Clean 30+ Days Old Jobs
        if (req.url === '/api/cleanup-old-jobs' && req.method === 'POST') {
          const result = await executePython(scraperScript, ['--cleanup', '30']);
          return sendJson(result.success ? 200 : 500, result);
        }

        return next();
      });
    },
  };
}

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), authApiPlugin()],
  server: {
    host: true,
    port: 3000,
  },
});

