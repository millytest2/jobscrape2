import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, User, Briefcase, MapPin, DollarSign } from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { Link } from "wouter";

interface UserProfile {
  name: string;
  target_roles: {
    direct: string[];
    indirect: string[];
  };
  location: {
    primary: string;
    willing_to_relocate: boolean;
    remote_preference: string;
  };
  experience_summary: {
    total_years: number;
    relevant_years: number;
  };
  salary_expectations: {
    min: number;
    max: number;
    currency: string;
  };
}

export default function Profile() {
  const [profile, setProfile] = useState<UserProfile | null>(null);

  // Fetch profile from backend
  const profileQuery = trpc.scraper.getProfile.useQuery();
  
  useEffect(() => {
    if (profileQuery.data) {
      setProfile(profileQuery.data);
    } else if (profileQuery.error) {
      toast.error("Failed to load profile");
    }
  }, [profileQuery.data, profileQuery.error]);

  if (profileQuery.isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>Profile Not Found</CardTitle>
            <CardDescription>Unable to load your profile. Please try again.</CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/">
              <Button className="w-full">Back to Home</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background py-12">
      <div className="container max-w-4xl">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold tracking-tight">Your Profile</h1>
            <p className="text-muted-foreground mt-2">
              This profile is used to personalize your job search
            </p>
          </div>
          <Link href="/">
            <Button variant="outline">Back to Home</Button>
          </Link>
        </div>

        <div className="grid gap-6">
          {/* Basic Info */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Basic Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground">Name</label>
                <p className="text-lg font-semibold mt-1">{profile.name}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Experience</label>
                <p className="text-lg mt-1">
                  {profile.experience_summary.total_years} years total, {profile.experience_summary.relevant_years} years relevant
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Target Roles */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Briefcase className="h-5 w-5" />
                Target Roles
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground">Direct Roles</label>
                <div className="flex flex-wrap gap-2 mt-2">
                  {profile.target_roles.direct.map((role, index) => (
                    <Badge key={index} variant="default">{role}</Badge>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Indirect Roles</label>
                <div className="flex flex-wrap gap-2 mt-2">
                  {profile.target_roles.indirect.map((role, index) => (
                    <Badge key={index} variant="secondary">{role}</Badge>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Location */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5" />
                Location Preferences
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground">Primary Location</label>
                <p className="text-lg font-semibold mt-1">{profile.location.primary}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Remote Preference</label>
                <p className="text-lg mt-1 capitalize">{profile.location.remote_preference.replace('_', ' ')}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Willing to Relocate</label>
                <p className="text-lg mt-1">{profile.location.willing_to_relocate ? 'Yes' : 'No'}</p>
              </div>
            </CardContent>
          </Card>

          {/* Salary */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                Salary Expectations
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground">Range</label>
                <p className="text-lg font-semibold mt-1">
                  ${profile.salary_expectations.min.toLocaleString()} - ${profile.salary_expectations.max.toLocaleString()} {profile.salary_expectations.currency}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
