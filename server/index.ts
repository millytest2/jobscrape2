import express from "express";
import { createServer } from "http";
import path from "path";
import { fileURLToPath } from "url";
import { spawn } from "child_process";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const server = createServer(app);

  app.use(express.json());

  // Serve static files from dist/public in production
  const staticPath =
    process.env.NODE_ENV === "production"
      ? path.resolve(__dirname, "public")
      : path.resolve(__dirname, "..", "dist", "public");

  app.use(express.static(staticPath));

  // API Endpoint to run scraper
  app.post("/api/scrape", (req, res) => {
    const { location = "Los Angeles", role = "Sales Engineer" } = req.body;
    
    console.log(`Starting scraper for ${role} in ${location}...`);
    
    // Spawn python process
    const pythonProcess = spawn('python3', [
      '/home/ubuntu/job_pipeline/run_scraper_json.py',
      location,
      role
    ]);

    let dataString = '';
    let errorString = '';

    pythonProcess.stdout.on('data', (data) => {
      const output = data.toString();
      console.log('Python output:', output);
      
      // Try to parse JSON lines (progress updates)
      try {
        const lines = output.trim().split('\n');
        for (const line of lines) {
          if (line.startsWith('{')) {
            const json = JSON.parse(line);
            if (json.status === 'complete') {
              dataString = JSON.stringify(json);
            }
          }
        }
      } catch (e) {
        // Ignore parse errors for non-JSON output
      }
    });

    pythonProcess.stderr.on('data', (data) => {
      console.error('Python error:', data.toString());
      errorString += data.toString();
    });

    pythonProcess.on('close', (code) => {
      console.log(`Child process exited with code ${code}`);
      
      if (code !== 0) {
        return res.status(500).json({ 
          status: 'error', 
          message: 'Scraper failed', 
          details: errorString 
        });
      }

      try {
        // If we captured the final JSON result
        if (dataString) {
          res.json(JSON.parse(dataString));
        } else {
          // Fallback mock response if python script didn't output valid JSON
          // This ensures the UI doesn't break during development
          res.json({
            status: "complete",
            timestamp: new Date().toISOString(),
            params: { location, role },
            stats: { scraped: 0, filtered: 0 },
            jobs: [],
            message: "No JSON output captured from scraper"
          });
        }
      } catch (e) {
        res.status(500).json({ 
          status: 'error', 
          message: 'Failed to parse scraper output',
          details: (e as Error).message
        });
      }
    });
  });

  // Handle client-side routing - serve index.html for all routes
  app.get("*", (_req, res) => {
    res.sendFile(path.join(staticPath, "index.html"));
  });

  const port = process.env.PORT || 3000;

  server.listen(port, () => {
    console.log(`Server running on http://localhost:${port}/`);
  });
}

startServer().catch(console.error);
