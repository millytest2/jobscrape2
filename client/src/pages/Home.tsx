import { useState } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Search, MapPin, Briefcase, Building2, ExternalLink, Download, AlertCircle, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";

interface Job {
  title: string;
  company: string;
  location: string;
  url: string;
  final_score: number;
  landing_probability?: number;  // NEW: Probability of landing (0-100)
  source: string;
  ghost_risk: number;
  ghost_factors?: string[];  // NEW: Ghost job risk factors
  excitement_factors: string[];
}

interface ScraperResult {
  status: string;
  timestamp?: string;
  params: {
    location: string;
    role: string;
    target_roles?: string[];
    profile?: string;
  };
  stats: {
    scraped: number;
    unique: number;
    mission_driven: number;
    salary_match: number;
    top_matches: number;
    filtered?: number;  // For backward compatibility
  };
  jobs: Job[];
}

export default function Home() {
  const [location, setLocation] = useState("Los Angeles");
  const [role, setRole] = useState("Sales Engineer");
  const [result, setResult] = useState<ScraperResult | null>(null);

  const scrapeMutation = trpc.scraper.runScraper.useMutation({
    onSuccess: (data) => {
      setResult(data);
      const jobCount = data.stats.top_matches || data.stats.filtered || data.jobs.length;
      toast.success(`Found ${jobCount} high-quality matches!`);
    },
    onError: (error) => {
      toast.error("Scraping failed: " + error.message);
    },
  });

  const handleScrape = () => {
    setResult(null);
    scrapeMutation.mutate({ location, role });
  };

  const handleExport = () => {
    if (!result) return;
    
    const csvContent = "data:text/csv;charset=utf-8," 
      + "Title,Company,Location,Score,Source,URL\n"
      + result.jobs.map(job => 
          `"${job.title}","${job.company}","${job.location}",${job.final_score},${job.source},"${job.url}"`
        ).join("\n");
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `jobs_${role}_${location}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="min-h-screen bg-background text-foreground font-sans selection:bg-primary selection:text-primary-foreground">
      {/* Hero Section */}
      <div className="relative border-b border-border bg-card">
        <div className="absolute inset-0 bg-[url('/images/hero-background.png')] opacity-10 bg-cover bg-center mix-blend-overlay pointer-events-none" />
        <div className="container py-12 md:py-20 relative z-10">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-8">
            <div className="space-y-4 max-w-2xl">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-mono uppercase tracking-wider border border-primary/20">
                <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                System Online
              </div>
              <h1 className="text-4xl md:text-6xl font-bold tracking-tight uppercase font-mono">
                Job<span className="text-primary">Scraper</span>
                <span className="text-muted-foreground">.exe</span>
              </h1>
              <p className="text-xl text-muted-foreground max-w-lg">
                The power tool for job hunting. Scrape 5+ sources, filter ghost jobs, and find hidden gems in seconds.
              </p>
              <Link href="/profile">
                <Button variant="outline" className="font-mono">
                  View Profile
                </Button>
              </Link>
            </div>
            
            {/* Search Card */}
            <Card className="w-full md:w-[400px] shadow-2xl border-2 border-primary/20 bg-card/80 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="font-mono uppercase text-sm tracking-wider text-muted-foreground">
                  Initialize Search
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Role</label>
                  <div className="relative">
                    <Briefcase className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input 
                      value={role} 
                      onChange={(e) => setRole(e.target.value)}
                      className="pl-9 font-mono border-2 focus-visible:ring-0 focus-visible:border-primary"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Location</label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input 
                      value={location} 
                      onChange={(e) => setLocation(e.target.value)}
                      className="pl-9 font-mono border-2 focus-visible:ring-0 focus-visible:border-primary"
                    />
                  </div>
                </div>
                <Button 
                  onClick={handleScrape} 
                  disabled={scrapeMutation.isPending}
                  className="w-full font-mono uppercase tracking-wider font-bold h-12 text-base shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-x-[4px] active:translate-y-[4px] active:shadow-none transition-all border-2 border-black dark:border-white dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,1)] dark:hover:shadow-[2px_2px_0px_0px_rgba(255,255,255,1)]"
                >
                  {scrapeMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Scraping...
                    </>
                  ) : (
                    <>
                      <Search className="mr-2 h-4 w-4" />
                      Run Scraper
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Results Section */}
      <div className="container py-12">
        {result ? (
          <div className="space-y-8">
            {/* Timestamp */}
            {result.timestamp && (
              <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                <CheckCircle2 className="w-4 h-4 text-green-500" />
                Last scraped: {new Date(result.timestamp).toLocaleString()}
              </div>
            )}
            
            {/* Stats Bar */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card className="border-l-4 border-l-primary">
                <CardContent className="pt-6">
                  <div className="text-2xl font-bold font-mono">{result.stats.scraped}</div>
                  <div className="text-xs text-muted-foreground uppercase tracking-wider">Jobs Scraped</div>
                </CardContent>
              </Card>
              <Card className="border-l-4 border-l-green-500">
                <CardContent className="pt-6">
                  <div className="text-2xl font-bold font-mono">{result.stats.filtered}</div>
                  <div className="text-xs text-muted-foreground uppercase tracking-wider">Quality Matches</div>
                </CardContent>
              </Card>
              <Card className="border-l-4 border-l-blue-500">
                <CardContent className="pt-6">
                  <div className="text-2xl font-bold font-mono">{result.jobs.length}</div>
                  <div className="text-xs text-muted-foreground uppercase tracking-wider">Displayed</div>
                </CardContent>
              </Card>
              <Card className="border-l-4 border-l-purple-500 flex items-center justify-center p-0">
                <Button 
                  variant="ghost" 
                  className="w-full h-full flex flex-col items-center justify-center gap-2 hover:bg-muted/50"
                  onClick={handleExport}
                >
                  <Download className="h-6 w-6" />
                  <span className="text-xs font-bold uppercase tracking-wider">Export CSV</span>
                </Button>
              </Card>
            </div>

            {/* Job List */}
            <div className="grid gap-4">
              {result.jobs.map((job, i) => (
                <Card key={i} className="group hover:border-primary/50 transition-colors duration-200">
                  <CardContent className="p-6">
                    <div className="flex flex-col md:flex-row gap-4 justify-between items-start">
                      <div className="space-y-2 flex-1">
                        <div className="flex items-start justify-between">
                          <div>
                            <h3 className="text-xl font-bold group-hover:text-primary transition-colors">
                              {job.title}
                            </h3>
                            <div className="flex items-center gap-2 text-muted-foreground mt-1">
                              <Building2 className="h-4 w-4" />
                              <span className="font-medium">{job.company}</span>
                              <span className="text-border mx-2">|</span>
                              <MapPin className="h-4 w-4" />
                              <span>{job.location}</span>
                            </div>
                          </div>
                          <div className="flex flex-col items-end gap-2">
                            <Badge 
                              variant={job.landing_probability && job.landing_probability > 80 ? "default" : "secondary"} 
                              className="font-mono text-lg px-3 py-1"
                            >
                              {Math.round(job.landing_probability || job.final_score)}%
                            </Badge>
                            <span className="text-xs text-muted-foreground font-mono uppercase">
                              {job.landing_probability ? "Landing Probability" : "Match Score"}
                            </span>
                          </div>
                        </div>
                        
                        <div className="flex flex-wrap gap-2 mt-4">
                          <Badge variant="outline" className="font-mono text-xs uppercase">
                            {job.source}
                          </Badge>
                          {job.ghost_risk < 20 ? (
                            <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-200 gap-1">
                              <CheckCircle2 className="h-3 w-3" /> Verified Active
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="bg-yellow-500/10 text-yellow-600 border-yellow-200 gap-1">
                              <AlertCircle className="h-3 w-3" /> Ghost Risk: {job.ghost_risk}%
                            </Badge>
                          )}
                          {job.excitement_factors?.map((factor, j) => (
                            <Badge key={j} variant="secondary" className="bg-primary/5 text-primary border-primary/10">
                              {factor}
                            </Badge>
                          ))}
                        </div>
                      </div>
                      
                      <div className="flex flex-col gap-2 w-full md:w-auto min-w-[140px]">
                        <Button asChild className="w-full font-bold">
                          <a href={job.url} target="_blank" rel="noopener noreferrer">
                            Apply Now <ExternalLink className="ml-2 h-4 w-4" />
                          </a>
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-20 text-center space-y-6 opacity-50">
            <div className="w-48 h-48 bg-[url('/images/empty-state.png')] bg-contain bg-center bg-no-repeat" />
            <div className="space-y-2">
              <h3 className="text-2xl font-bold font-mono uppercase">Ready to Scrape</h3>
              <p className="text-muted-foreground max-w-md mx-auto">
                Enter your target role and location above to start the multi-source scraping engine.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
