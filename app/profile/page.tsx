'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { User, Briefcase, GraduationCap, MapPin, Phone, Mail, Save } from 'lucide-react'
import { toast } from 'sonner'
import LayoutWithSidebar from '@/components/LayoutWithSidebar'

interface UserProfile {
  userId: string
  name: string
  email: string
  phone: string
  location: string
  jobTitle: string
  company: string
  experience: string
  education: string
  skills: string[]
  about: string
  targetRole: string
  industry: string
}

export default function ProfilePage() {
  const [profile, setProfile] = useState<UserProfile>({
    userId: 'demo-user',
    name: '',
    email: '',
    phone: '',
    location: '',
    jobTitle: '',
    company: '',
    experience: '',
    education: '',
    skills: [],
    about: '',
    targetRole: '',
    industry: ''
  })
  const [loading, setLoading] = useState(false)
  const [newSkill, setNewSkill] = useState('')

  // Load profile data
  useEffect(() => {
    loadProfile()
  }, [])

  const loadProfile = async () => {
    try {
      const response = await fetch(`/api/profile?userId=${profile.userId}`)
      if (response.ok) {
        const data = await response.json()
        setProfile(data)
      }
    } catch (error) {
      console.error('Error loading profile:', error)
    }
  }

  const saveProfile = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/profile', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(profile),
      })

      if (response.ok) {
        toast.success('Profile saved successfully!')
      } else {
        toast.error('Failed to save profile')
      }
    } catch (error) {
      console.error('Error saving profile:', error)
      toast.error('Error saving profile')
    } finally {
      setLoading(false)
    }
  }

  const addSkill = () => {
    if (newSkill.trim() && !profile.skills.includes(newSkill.trim())) {
      setProfile(prev => ({
        ...prev,
        skills: [...prev.skills, newSkill.trim()]
      }))
      setNewSkill('')
    }
  }

  const removeSkill = (skillToRemove: string) => {
    setProfile(prev => ({
      ...prev,
      skills: prev.skills.filter(skill => skill !== skillToRemove)
    }))
  }

  const handleInputChange = (field: keyof UserProfile, value: string) => {
    setProfile(prev => ({ ...prev, [field]: value }))
  }

  return (
    <LayoutWithSidebar>
      <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">My Profile</h1>
          <p className="text-gray-600">Manage your personal information and interview preferences</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Profile Picture & Basic Info */}
          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Basic Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-center">
                <div className="w-24 h-24 bg-blue-100 rounded-full flex items-center justify-center">
                  <User className="h-12 w-12 text-blue-600" />
                </div>
              </div>
              
              <div className="space-y-3">
                <div>
                  <Label htmlFor="name">Full Name</Label>
                  <Input
                    id="name"
                    value={profile.name}
                    onChange={(e) => handleInputChange('name', e.target.value)}
                    placeholder="Enter your full name"
                  />
                </div>
                
                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={profile.email}
                    onChange={(e) => handleInputChange('email', e.target.value)}
                    placeholder="your.email@example.com"
                  />
                </div>
                
                <div>
                  <Label htmlFor="phone">Phone</Label>
                  <Input
                    id="phone"
                    value={profile.phone}
                    onChange={(e) => handleInputChange('phone', e.target.value)}
                    placeholder="+1 (555) 123-4567"
                  />
                </div>
                
                <div>
                  <Label htmlFor="location">Location</Label>
                  <Input
                    id="location"
                    value={profile.location}
                    onChange={(e) => handleInputChange('location', e.target.value)}
                    placeholder="City, Country"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Professional Information */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Briefcase className="h-5 w-5" />
                Professional Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="jobTitle">Current Job Title</Label>
                  <Input
                    id="jobTitle"
                    value={profile.jobTitle}
                    onChange={(e) => handleInputChange('jobTitle', e.target.value)}
                    placeholder="Software Engineer"
                  />
                </div>
                
                <div>
                  <Label htmlFor="company">Company</Label>
                  <Input
                    id="company"
                    value={profile.company}
                    onChange={(e) => handleInputChange('company', e.target.value)}
                    placeholder="Company Name"
                  />
                </div>
                
                <div>
                  <Label htmlFor="experience">Years of Experience</Label>
                  <Select value={profile.experience} onValueChange={(value) => handleInputChange('experience', value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select experience" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="0-1">0-1 years</SelectItem>
                      <SelectItem value="1-3">1-3 years</SelectItem>
                      <SelectItem value="3-5">3-5 years</SelectItem>
                      <SelectItem value="5-10">5-10 years</SelectItem>
                      <SelectItem value="10+">10+ years</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label htmlFor="industry">Industry</Label>
                  <Select value={profile.industry} onValueChange={(value) => handleInputChange('industry', value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select industry" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="technology">Technology</SelectItem>
                      <SelectItem value="finance">Finance</SelectItem>
                      <SelectItem value="healthcare">Healthcare</SelectItem>
                      <SelectItem value="education">Education</SelectItem>
                      <SelectItem value="retail">Retail</SelectItem>
                      <SelectItem value="manufacturing">Manufacturing</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label htmlFor="targetRole">Target Role</Label>
                <Input
                  id="targetRole"
                  value={profile.targetRole}
                  onChange={(e) => handleInputChange('targetRole', e.target.value)}
                  placeholder="Role you're interviewing for"
                />
              </div>

              <div>
                <Label htmlFor="education">Education</Label>
                <Input
                  id="education"
                  value={profile.education}
                  onChange={(e) => handleInputChange('education', e.target.value)}
                  placeholder="Degree, University"
                />
              </div>

              <div>
                <Label>Skills</Label>
                <div className="flex gap-2 mb-2">
                  <Input
                    value={newSkill}
                    onChange={(e) => setNewSkill(e.target.value)}
                    placeholder="Add a skill"
                    onKeyPress={(e) => e.key === 'Enter' && addSkill()}
                  />
                  <Button onClick={addSkill} variant="outline">Add</Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {profile.skills.map((skill, index) => (
                    <Badge key={index} variant="secondary" className="cursor-pointer" onClick={() => removeSkill(skill)}>
                      {skill} ×
                    </Badge>
                  ))}
                </div>
              </div>

              <div>
                <Label htmlFor="about">About Me</Label>
                <Textarea
                  id="about"
                  value={profile.about}
                  onChange={(e) => handleInputChange('about', e.target.value)}
                  placeholder="Tell us about yourself, your career goals, and what you're looking for..."
                  rows={4}
                />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Save Button */}
        <div className="mt-8 flex justify-end">
          <Button onClick={saveProfile} disabled={loading} className="px-8">
            <Save className="h-4 w-4 mr-2" />
            {loading ? 'Saving...' : 'Save Profile'}
          </Button>
        </div>
      </div>
    </div>
    </LayoutWithSidebar>
  )
}
