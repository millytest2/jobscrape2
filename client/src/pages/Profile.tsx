import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Loader2, User, Briefcase, MapPin, DollarSign, Building2, AlertCircle, Edit, Save, X, Heart, ExternalLink, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { Link } from "wouter";

// Saved Jobs Section Component
function SavedJobsSection() {
  const savedJobsQuery = trpc.savedJobs.getAll.useQuery();
  const unsaveMutation = trpc.savedJobs.unsave.useMutation({
    onSuccess: () => {
      toast.success("Job removed from saved list");
      savedJobsQuery.refetch();
    },
    onError: (error) => {
      toast.error("Failed to remove job: " + error.message);
    },
  });

  if (savedJobsQuery.isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Heart className="h-5 w-5" />
            Saved Jobs
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  const savedJobs = savedJobsQuery.data || [];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Heart className="h-5 w-5" />
          Saved Jobs ({savedJobs.length})
        </CardTitle>
      </CardHeader>
      <CardContent>
        {savedJobs.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Heart className="h-12 w-12 mx-auto mb-3 opacity-20" />
            <p>No saved jobs yet</p>
            <p className="text-sm mt-1">Click the heart icon on job listings to save them here</p>
          </div>
        ) : (
          <div className="space-y-3">
            {savedJobs.map((job: any) => (
              <div key={job.id} className="border rounded-lg p-4 hover:border-primary/50 transition-colors">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 space-y-1">
                    <h4 className="font-semibold text-lg">{job.title}</h4>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Building2 className="h-4 w-4" />
                      <span>{job.company}</span>
                      <span className="text-border mx-1">|</span>
                      <MapPin className="h-4 w-4" />
                      <span>{job.location}</span>
                    </div>
                    <div className="flex gap-2 mt-2">
                      <Badge variant="outline" className="text-xs">{job.source}</Badge>
                      {job.finalScore && (
                        <Badge variant="secondary" className="text-xs">
                          {Math.round(job.finalScore)}% Match
                        </Badge>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-col gap-2">
                    <Button asChild size="sm" className="w-full">
                      <a href={job.url} target="_blank" rel="noopener noreferrer">
                        Apply <ExternalLink className="ml-1 h-3 w-3" />
                      </a>
                    </Button>
                    <Button 
                      size="sm" 
                      variant="outline" 
                      className="w-full text-destructive hover:text-destructive"
                      onClick={() => unsaveMutation.mutate({ id: job.id })}
                      disabled={unsaveMutation.isPending}
                    >
                      {unsaveMutation.isPending ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <>
                          <Trash2 className="mr-1 h-3 w-3" />
                          Remove
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function Profile() {
  const [isEditing, setIsEditing] = useState(false);
  const profileQuery = trpc.scraper.getProfile.useQuery();
  const utils = trpc.useUtils();
  
  const [editedProfile, setEditedProfile] = useState<any>(null);
  
  const updateProfileMutation = trpc.scraper.updateProfile.useMutation({
    onSuccess: () => {
      toast.success("Profile updated successfully!");
      setIsEditing(false);
      utils.scraper.getProfile.invalidate();
    },
    onError: (error) => {
      toast.error("Failed to update profile: " + error.message);
    },
  });

  const handleEdit = () => {
    setEditedProfile(JSON.parse(JSON.stringify(profileQuery.data)));
    setIsEditing(true);
  };

  const handleCancel = () => {
    setEditedProfile(null);
    setIsEditing(false);
  };

  const handleSave = () => {
    updateProfileMutation.mutate(editedProfile);
  };

  const profile = isEditing ? editedProfile : profileQuery.data;

  if (profileQuery.isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (profileQuery.error || !profile) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="max-w-md">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3 text-destructive">
              <AlertCircle className="h-5 w-5" />
              <p>Failed to load profile</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container py-12 max-w-4xl">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold font-mono uppercase">Your Profile</h1>
            <p className="text-muted-foreground mt-2">
              This profile is used to personalize your job search
            </p>
          </div>
          <div className="flex gap-2">
            {!isEditing ? (
              <>
                <Link href="/">
                  <Button variant="outline">Back to Home</Button>
                </Link>
                <Button onClick={handleEdit}>
                  <Edit className="mr-2 h-4 w-4" />
                  Edit Profile
                </Button>
              </>
            ) : (
              <>
                <Button variant="outline" onClick={handleCancel}>
                  <X className="mr-2 h-4 w-4" />
                  Cancel
                </Button>
                <Button onClick={handleSave} disabled={updateProfileMutation.isPending}>
                  {updateProfileMutation.isPending ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="mr-2 h-4 w-4" />
                  )}
                  Save Changes
                </Button>
              </>
            )}
          </div>
        </div>

        <div className="space-y-6">
          {/* Basic Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Basic Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Name</label>
                  {isEditing ? (
                    <Input
                      value={editedProfile.name}
                      onChange={(e) => setEditedProfile({ ...editedProfile, name: e.target.value })}
                    />
                  ) : (
                    <p className="text-lg font-medium">{profile.name}</p>
                  )}
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Experience</label>
                  {isEditing ? (
                    <div className="flex gap-2">
                      <Input
                        type="number"
                        value={editedProfile.experience_summary.total_years}
                        onChange={(e) => setEditedProfile({
                          ...editedProfile,
                          experience_summary: {
                            ...editedProfile.experience_summary,
                            total_years: parseInt(e.target.value)
                          }
                        })}
                        placeholder="Total years"
                      />
                      <Input
                        type="number"
                        value={editedProfile.experience_summary.relevant_years}
                        onChange={(e) => setEditedProfile({
                          ...editedProfile,
                          experience_summary: {
                            ...editedProfile.experience_summary,
                            relevant_years: parseInt(e.target.value)
                          }
                        })}
                        placeholder="Relevant years"
                      />
                    </div>
                  ) : (
                    <p className="text-lg font-medium">
                      {profile.experience_summary.total_years} years total, {profile.experience_summary.relevant_years} years relevant
                    </p>
                  )}
                </div>
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
                {isEditing ? (
                  <Textarea
                    value={editedProfile.target_roles.direct.join(", ")}
                    onChange={(e) => setEditedProfile({
                      ...editedProfile,
                      target_roles: {
                        ...editedProfile.target_roles,
                        direct: e.target.value.split(",").map(r => r.trim())
                      }
                    })}
                    placeholder="Comma-separated list"
                  />
                ) : (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {profile.target_roles.direct.map((role: string, i: number) => (
                      <Badge key={i} variant="default">{role}</Badge>
                    ))}
                  </div>
                )}
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Indirect Roles</label>
                {isEditing ? (
                  <Textarea
                    value={editedProfile.target_roles.indirect.join(", ")}
                    onChange={(e) => setEditedProfile({
                      ...editedProfile,
                      target_roles: {
                        ...editedProfile.target_roles,
                        indirect: e.target.value.split(",").map(r => r.trim())
                      }
                    })}
                    placeholder="Comma-separated list"
                  />
                ) : (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {profile.target_roles.indirect.map((role: string, i: number) => (
                      <Badge key={i} variant="outline">{role}</Badge>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Location Preferences */}
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
                {isEditing ? (
                  <Input
                    value={editedProfile.location.primary}
                    onChange={(e) => setEditedProfile({
                      ...editedProfile,
                      location: { ...editedProfile.location, primary: e.target.value }
                    })}
                  />
                ) : (
                  <p className="text-lg font-medium">{profile.location.primary}</p>
                )}
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Remote Preference</label>
                {isEditing ? (
                  <Input
                    value={editedProfile.location.remote_preference}
                    onChange={(e) => setEditedProfile({
                      ...editedProfile,
                      location: { ...editedProfile.location, remote_preference: e.target.value }
                    })}
                  />
                ) : (
                  <p className="text-lg font-medium">{profile.location.remote_preference}</p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Salary Expectations */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                Salary Expectations
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Minimum</label>
                    {isEditing ? (
                      <Input
                        type="number"
                        value={editedProfile.salary_expectations.minimum}
                        onChange={(e) => setEditedProfile({
                          ...editedProfile,
                          salary_expectations: {
                            ...editedProfile.salary_expectations,
                            minimum: parseInt(e.target.value)
                          }
                        })}
                      />
                    ) : (
                      <p className="text-lg font-medium">
                        ${profile.salary_expectations.minimum.toLocaleString()}
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Target</label>
                    {isEditing ? (
                      <Input
                        type="number"
                        value={editedProfile.salary_expectations.target}
                        onChange={(e) => setEditedProfile({
                          ...editedProfile,
                          salary_expectations: {
                            ...editedProfile.salary_expectations,
                            target: parseInt(e.target.value)
                          }
                        })}
                      />
                    ) : (
                      <p className="text-lg font-medium">
                        ${profile.salary_expectations.target.toLocaleString()}
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Maximum</label>
                    {isEditing ? (
                      <Input
                        type="number"
                        value={editedProfile.salary_expectations.maximum}
                        onChange={(e) => setEditedProfile({
                          ...editedProfile,
                          salary_expectations: {
                            ...editedProfile.salary_expectations,
                            maximum: parseInt(e.target.value)
                          }
                        })}
                      />
                    ) : (
                      <p className="text-lg font-medium">
                        ${profile.salary_expectations.maximum.toLocaleString()}
                      </p>
                    )}
                  </div>
                </div>
                <p className="text-sm text-muted-foreground">
                  Range: ${profile.salary_expectations.minimum.toLocaleString()} - ${profile.salary_expectations.maximum.toLocaleString()} {profile.salary_expectations.currency}
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
                      {profile.skills.technical.map((skill: string, i: number) => (
                        <Badge key={i} variant="default">{skill}</Badge>
                      ))}
                    </div>
                  </div>
                )}
                {profile.skills.sales && profile.skills.sales.length > 0 && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Sales Skills</label>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {profile.skills.sales.map((skill: string, i: number) => (
                        <Badge key={i} variant="secondary">{skill}</Badge>
                      ))}
                    </div>
                  </div>
                )}
                {profile.skills.soft && profile.skills.soft.length > 0 && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Soft Skills</label>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {profile.skills.soft.map((skill: string, i: number) => (
                        <Badge key={i} variant="outline">{skill}</Badge>
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
                {profile.education.degree && (
                  <div>
                    <p className="text-lg font-medium">{profile.education.degree}</p>
                    <p className="text-sm text-muted-foreground">{profile.education.university} • {profile.education.graduation_year}</p>
                  </div>
                )}
                {profile.education.additional_courses && profile.education.additional_courses.length > 0 && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Additional Courses</label>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {profile.education.additional_courses.map((course: string, i: number) => (
                        <Badge key={i} variant="outline">{course}</Badge>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Work History */}
          {profile.work_history && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="h-5 w-5" />
                  Work History
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {profile.work_history.current_role && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Current Role</label>
                    <p className="text-lg font-medium">{profile.work_history.current_role.title}</p>
                    <p className="text-sm text-muted-foreground">{profile.work_history.current_role.company} • {profile.work_history.current_role.dates}</p>
                  </div>
                )}
                {profile.work_history.previous_roles && profile.work_history.previous_roles.length > 0 && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Previous Roles</label>
                    <div className="space-y-2 mt-2">
                      {profile.work_history.previous_roles.map((role: any, i: number) => (
                        <div key={i} className="border-l-2 border-primary pl-4">
                          <p className="font-medium">{role.title}</p>
                          <p className="text-sm text-muted-foreground">{role.company} • {role.dates}</p>
                        </div>
                      ))}
                    </div>
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
                      {profile.company_preferences.size.map((size: string, i: number) => (
                        <Badge key={i} variant="default">{size}</Badge>
                      ))}
                    </div>
                  </div>
                )}
                {profile.company_preferences.stage && profile.company_preferences.stage.length > 0 && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Company Stage</label>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {profile.company_preferences.stage.map((stage: string, i: number) => (
                        <Badge key={i} variant="secondary">{stage}</Badge>
                      ))}
                    </div>
                  </div>
                )}
                {profile.company_preferences.industries && profile.company_preferences.industries.length > 0 && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Industries</label>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {profile.company_preferences.industries.map((industry: string, i: number) => (
                        <Badge key={i} variant="outline">{industry}</Badge>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Saved Jobs Section */}
          <SavedJobsSection />

          {/* Red Flags */}
          {profile.red_flags && profile.red_flags.length > 0 && (
            <Card className="border-destructive/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-destructive">
                  <AlertCircle className="h-5 w-5" />
                  Red Flags (Avoid These)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {profile.red_flags.map((flag: string, i: number) => (
                    <Badge key={i} variant="destructive">{flag}</Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
