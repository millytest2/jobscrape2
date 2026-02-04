import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, User, Briefcase, MapPin, DollarSign, Building2, Target, Save } from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";

interface UserProfile {
  name: string;
  email: string;
  location: string;
  target_roles: {
    direct: string[];
    indirect: string[];
  };
  preferences: {
    salary_range: {
      min: number;
      max: number;
      ideal: number;
    };
    company_values: string[];
    location: {
      primary: string;
      remote: boolean;
      hybrid: boolean;
    };
  };
  company_quality_criteria: {
    high_priority_industries: string[];
  };
}

export default function Profile() {
  const [isEditing, setIsEditing] = useState(false);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  // Fetch profile from backend
  const profileQuery = trpc.scraper.getProfile.useQuery();
  
  useEffect(() => {
    if (profileQuery.data) {
      setProfile(profileQuery.data);
      setLoading(false);
    } else if (profileQuery.error) {
      toast.error("Failed to load profile");
      setLoading(false);
    }
  }, [profileQuery.data, profileQuery.error]);

  const updateProfileMutation = trpc.scraper.updateProfile.useMutation({
    onSuccess: () => {
      toast.success("Profile updated successfully!");
      setIsEditing(false);
      profileQuery.refetch();
    },
    onError: (error) => {
      toast.error("Failed to update profile: " + error.message);
    },
  });

  const handleSave = () => {
    if (!profile) return;
    updateProfileMutation.mutate(profile);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
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
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border bg-card">
        <div className="container py-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Your Profile</h1>
              <p className="text-muted-foreground mt-1">
                Manage your job search preferences and criteria
              </p>
            </div>
            <Button
              onClick={() => (isEditing ? handleSave() : setIsEditing(true))}
              disabled={updateProfileMutation.isPending}
            >
              {updateProfileMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : isEditing ? (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Save Changes
                </>
              ) : (
                "Edit Profile"
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* Profile Content */}
      <div className="container py-8 space-y-6">
        {/* Basic Info */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="w-5 h-5" />
              Basic Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Name</Label>
                {isEditing ? (
                  <Input
                    value={profile.name}
                    onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                  />
                ) : (
                  <p className="text-lg font-medium">{profile.name}</p>
                )}
              </div>
              <div>
                <Label>Email</Label>
                {isEditing ? (
                  <Input
                    value={profile.email}
                    onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                  />
                ) : (
                  <p className="text-lg font-medium">{profile.email}</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Target Roles */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Briefcase className="w-5 h-5" />
              Target Roles
            </CardTitle>
            <CardDescription>
              Direct roles are your primary targets. Indirect roles are related positions.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label className="text-sm font-semibold">Direct Roles</Label>
              <div className="flex flex-wrap gap-2 mt-2">
                {profile.target_roles.direct.map((role, index) => (
                  <Badge key={index} variant="default">
                    {role}
                  </Badge>
                ))}
              </div>
            </div>
            <div>
              <Label className="text-sm font-semibold">Indirect Roles</Label>
              <div className="flex flex-wrap gap-2 mt-2">
                {profile.target_roles.indirect.map((role, index) => (
                  <Badge key={index} variant="secondary">
                    {role}
                  </Badge>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Salary Range */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="w-5 h-5" />
              Salary Expectations
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label>Minimum</Label>
                {isEditing ? (
                  <Input
                    type="number"
                    value={profile.preferences.salary_range.min}
                    onChange={(e) =>
                      setProfile({
                        ...profile,
                        preferences: {
                          ...profile.preferences,
                          salary_range: {
                            ...profile.preferences.salary_range,
                            min: parseInt(e.target.value),
                          },
                        },
                      })
                    }
                  />
                ) : (
                  <p className="text-lg font-medium">
                    ${profile.preferences.salary_range.min.toLocaleString()}
                  </p>
                )}
              </div>
              <div>
                <Label>Maximum</Label>
                {isEditing ? (
                  <Input
                    type="number"
                    value={profile.preferences.salary_range.max}
                    onChange={(e) =>
                      setProfile({
                        ...profile,
                        preferences: {
                          ...profile.preferences,
                          salary_range: {
                            ...profile.preferences.salary_range,
                            max: parseInt(e.target.value),
                          },
                        },
                      })
                    }
                  />
                ) : (
                  <p className="text-lg font-medium">
                    ${profile.preferences.salary_range.max.toLocaleString()}
                  </p>
                )}
              </div>
              <div>
                <Label>Ideal</Label>
                {isEditing ? (
                  <Input
                    type="number"
                    value={profile.preferences.salary_range.ideal}
                    onChange={(e) =>
                      setProfile({
                        ...profile,
                        preferences: {
                          ...profile.preferences,
                          salary_range: {
                            ...profile.preferences.salary_range,
                            ideal: parseInt(e.target.value),
                          },
                        },
                      })
                    }
                  />
                ) : (
                  <p className="text-lg font-medium">
                    ${profile.preferences.salary_range.ideal.toLocaleString()}
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Location Preferences */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="w-5 h-5" />
              Location Preferences
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Primary Location</Label>
              {isEditing ? (
                <Input
                  value={profile.preferences.location.primary}
                  onChange={(e) =>
                    setProfile({
                      ...profile,
                      preferences: {
                        ...profile.preferences,
                        location: {
                          ...profile.preferences.location,
                          primary: e.target.value,
                        },
                      },
                    })
                  }
                />
              ) : (
                <p className="text-lg font-medium">{profile.preferences.location.primary}</p>
              )}
            </div>
            <div className="flex gap-4">
              <Badge variant={profile.preferences.location.remote ? "default" : "outline"}>
                {profile.preferences.location.remote ? "✓ Remote OK" : "✗ Remote"}
              </Badge>
              <Badge variant={profile.preferences.location.hybrid ? "default" : "outline"}>
                {profile.preferences.location.hybrid ? "✓ Hybrid OK" : "✗ Hybrid"}
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Company Values */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="w-5 h-5" />
              Company Values & Industries
            </CardTitle>
            <CardDescription>
              Companies matching these criteria will be prioritized
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label className="text-sm font-semibold">Company Values</Label>
              <div className="flex flex-wrap gap-2 mt-2">
                {profile.preferences.company_values.map((value, index) => (
                  <Badge key={index} variant="secondary">
                    {value}
                  </Badge>
                ))}
              </div>
            </div>
            <div>
              <Label className="text-sm font-semibold">Priority Industries</Label>
              <div className="flex flex-wrap gap-2 mt-2">
                {profile.company_quality_criteria.high_priority_industries.map((industry, index) => (
                  <Badge key={index} variant="default">
                    {industry}
                  </Badge>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
