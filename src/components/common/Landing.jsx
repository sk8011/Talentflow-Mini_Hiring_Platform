import React from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '../ui/Button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/Card'
import { Briefcase, Users, ArrowRight, Sparkles, Target, Zap } from 'lucide-react'

export default function Landing() {
  const navigate = useNavigate()
  return (
    <div className="min-h-[80vh] flex flex-col items-center justify-center">
      {/* Hero Section */}
      <div className="text-center mb-12 animate-fade-in">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium mb-6">
          <Sparkles className="h-4 w-4" />
          Modern Hiring Platform
        </div>
        <h1 className="text-5xl font-bold mb-4 bg-gradient-to-r from-primary via-blue-600 to-purple-600 bg-clip-text text-transparent">
          Welcome to TalentFlow
        </h1>
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
          Streamline your hiring process with powerful tools for managing jobs, candidates, and assessments.
        </p>
      </div>

      {/* Feature Cards */}
      <div className="grid md:grid-cols-2 gap-6 w-full max-w-4xl mb-12">
        <Card className="hover:shadow-lg transition-all duration-300 border-2 hover:border-primary/50 animate-fade-in">
          <CardHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-3 rounded-lg bg-primary/10">
                <Briefcase className="h-6 w-6 text-primary" />
              </div>
              <CardTitle className="text-2xl">HR Console</CardTitle>
            </div>
            <CardDescription className="text-base">
              Manage your entire hiring pipeline with ease
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm">
                <Target className="h-4 w-4 text-primary" />
                <span>Post and manage job openings</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Users className="h-4 w-4 text-primary" />
                <span>Track candidates through stages</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Zap className="h-4 w-4 text-primary" />
                <span>Create custom assessments</span>
              </div>
            </div>
            <Button 
              className="w-full mt-4" 
              size="lg"
              onClick={() => navigate('/hr')}
            >
              Go to HR Console
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-all duration-300 border-2 hover:border-primary/50 animate-fade-in" style={{ animationDelay: '0.1s' }}>
          <CardHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-3 rounded-lg bg-secondary">
                <Users className="h-6 w-6 text-secondary-foreground" />
              </div>
              <CardTitle className="text-2xl">Candidate Portal</CardTitle>
            </div>
            <CardDescription className="text-base">
              Apply for positions and track your progress
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm">
                <Target className="h-4 w-4 text-muted-foreground" />
                <span>Browse available positions</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Zap className="h-4 w-4 text-muted-foreground" />
                <span>Complete online assessments</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Users className="h-4 w-4 text-muted-foreground" />
                <span>View application status</span>
              </div>
            </div>
            <Button 
              variant="outline"
              className="w-full mt-4" 
              size="lg"
              onClick={() => navigate('/candidate')}
            >
              Go to Candidate Portal
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Stats Section */}
      <div className="grid grid-cols-3 gap-8 w-full max-w-2xl text-center">
        <div className="animate-fade-in" style={{ animationDelay: '0.2s' }}>
          <div className="text-3xl font-bold text-primary mb-1">Fast</div>
          <div className="text-sm text-muted-foreground">Optimized Performance</div>
        </div>
        <div className="animate-fade-in" style={{ animationDelay: '0.3s' }}>
          <div className="text-3xl font-bold text-primary mb-1">Modern</div>
          <div className="text-sm text-muted-foreground">Beautiful UI/UX</div>
        </div>
        <div className="animate-fade-in" style={{ animationDelay: '0.4s' }}>
          <div className="text-3xl font-bold text-primary mb-1">Powerful</div>
          <div className="text-sm text-muted-foreground">Feature-Rich</div>
        </div>
      </div>
    </div>
  )
}
