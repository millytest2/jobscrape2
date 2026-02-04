import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Loader2, User, Briefcase, MapPin, DollarSign, Building2, AlertCircle, Edit, Save, X } from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { Link } from "wouter";

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

          {/* Note about advanced editing */}
          {!isEditing && (
            <Card className="bg-muted/50">
              <CardContent className="pt-6">
                <p className="text-sm text-muted-foreground">
                  <strong>Note:</strong> For advanced editing (skills, education, work history, company preferences), 
                  you can edit the JSON file directly at <code className="bg-background px-2 py-1 rounded">server/data/miles_profile.json</code> 
                  or ask me to update specific fields.
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
