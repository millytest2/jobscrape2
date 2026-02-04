import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, User, Briefcase, MapPin, DollarSign, Building2, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { Link } from "wouter";

interface UserProfile {
  name: string;
  email?: string;
  phone?: string;
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
    current_role?: string;
    previous_roles?: string[];
  };
  skills?: {
    technical?: string[];
    sales?: string[];
    soft_skills?: string[];
  };
  education?: {
    degree: string;
    university: string;
    graduation_year: number;
    additional?: string[];
  };
  salary_expectations: {
    minimum: number;
    target: number;
    maximum: number;
    currency: string;
  };
  company_preferences?: {
    size?: string[];
    stage?: string[];
    industries?: string[];
  };
  red_flags?: {
    avoid?: string[];
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
                  ${profile.salary_expectations.minimum.toLocaleString()} - ${profile.salary_expectations.maximum.toLocaleString()} {profile.salary_expectations.currency}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Skills */}
          {profile.skills && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Briefcase className="h-5 w-5" />
                  Skills
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {profile.skills.technical && profile.skills.technical.length > 0 && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Technical Skills</label>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {profile.skills.technical.map((skill, index) => (
                        <Badge key={index} variant="default">{skill}</Badge>
                      ))}
                    </div>
                  </div>
                )}
                {profile.skills.sales && profile.skills.sales.length > 0 && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Sales Skills</label>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {profile.skills.sales.map((skill, index) => (
                        <Badge key={index} variant="secondary">{skill}</Badge>
                      ))}
                    </div>
                  </div>
                )}
                {profile.skills.soft_skills && profile.skills.soft_skills.length > 0 && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Soft Skills</label>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {profile.skills.soft_skills.map((skill, index) => (
                        <Badge key={index} variant="outline">{skill}</Badge>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Education */}
          {profile.education && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Education
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Degree</label>
                  <p className="text-lg font-semibold mt-1">{profile.education.degree}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">University</label>
                  <p className="text-lg mt-1">{profile.education.university} ({profile.education.graduation_year})</p>
                </div>
                {profile.education.additional && profile.education.additional.length > 0 && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Additional Education</label>
                    <ul className="list-disc list-inside mt-2 space-y-1">
                      {profile.education.additional.map((item, index) => (
                        <li key={index} className="text-sm">{item}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Work History */}
          {profile.experience_summary.current_role && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Briefcase className="h-5 w-5" />
                  Work History
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Current Role</label>
                  <p className="text-lg font-semibold mt-1">{profile.experience_summary.current_role}</p>
                </div>
                {profile.experience_summary.previous_roles && profile.experience_summary.previous_roles.length > 0 && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Previous Roles</label>
                    <ul className="list-disc list-inside mt-2 space-y-1">
                      {profile.experience_summary.previous_roles.map((role, index) => (
                        <li key={index} className="text-sm">{role}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Company Preferences */}
          {profile.company_preferences && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="h-5 w-5" />
                  Company Preferences
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {profile.company_preferences.size && profile.company_preferences.size.length > 0 && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Company Size</label>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {profile.company_preferences.size.map((size, index) => (
                        <Badge key={index} variant="outline">{size}</Badge>
                      ))}
                    </div>
                  </div>
                )}
                {profile.company_preferences.stage && profile.company_preferences.stage.length > 0 && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Company Stage</label>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {profile.company_preferences.stage.map((stage, index) => (
                        <Badge key={index} variant="outline">{stage}</Badge>
                      ))}
                    </div>
                  </div>
                )}
                {profile.company_preferences.industries && profile.company_preferences.industries.length > 0 && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Industries</label>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {profile.company_preferences.industries.map((industry, index) => (
                        <Badge key={index} variant="secondary">{industry}</Badge>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Red Flags */}
          {profile.red_flags && profile.red_flags.avoid && profile.red_flags.avoid.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertCircle className="h-5 w-5" />
                  Red Flags (Roles to Avoid)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="list-disc list-inside space-y-1">
                  {profile.red_flags.avoid.map((flag, index) => (
                    <li key={index} className="text-sm text-muted-foreground">{flag}</li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
