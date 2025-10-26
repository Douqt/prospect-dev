'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { CreateCourseForm, Course } from '@/types/mentor-marketplace';
import { useToast } from '@/hooks/use-toast';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Upload,
  DollarSign,
  BookOpen,
  Video,
  Settings,
  Save,
  Eye
} from 'lucide-react';

interface CourseCreationWizardProps {
  mentorId: string;
  onComplete: (course: Course) => void;
  onCancel: () => void;
}

type WizardStep = 'basic' | 'content' | 'pricing' | 'review';

export default function CourseCreationWizard({ mentorId, onComplete, onCancel }: CourseCreationWizardProps) {
  const [currentStep, setCurrentStep] = useState<WizardStep>('basic');
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const [courseForm, setCourseForm] = useState<CreateCourseForm>({
    title: '',
    description: '',
    price: 0,
    category: '',
    level: 'beginner',
    tags: [],
  });

  const steps = [
    { id: 'basic', title: 'Basic Info', icon: BookOpen },
    { id: 'content', title: 'Content', icon: Video },
    { id: 'pricing', title: 'Pricing', icon: DollarSign },
    { id: 'review', title: 'Review', icon: Eye },
  ];

  const getCurrentStepIndex = () => steps.findIndex(step => step.id === currentStep);

  const canProceedToNext = () => {
    switch (currentStep) {
      case 'basic':
        return courseForm.title && courseForm.description && courseForm.category;
      case 'content':
        return true; // Content is optional for initial creation
      case 'pricing':
        return true; // Pricing can be set later
      case 'review':
        return true;
      default:
        return false;
    }
  };

  const handleNext = () => {
    const currentIndex = getCurrentStepIndex();
    if (currentIndex < steps.length - 1) {
      setCurrentStep(steps[currentIndex + 1].id as WizardStep);
    }
  };

  const handlePrevious = () => {
    const currentIndex = getCurrentStepIndex();
    if (currentIndex > 0) {
      setCurrentStep(steps[currentIndex - 1].id as WizardStep);
    }
  };

  const handleSubmit = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/mentor-marketplace/courses', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...courseForm,
          mentorId,
        }),
      });

      const data = await response.json();

      if (data.error) {
        throw new Error(data.error);
      }

      onComplete(data.data);
    } catch (error) {
      console.error('Error creating course:', error);
      toast({
        title: "Error",
        description: "Failed to create course. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const updateForm = (updates: Partial<CreateCourseForm>) => {
    setCourseForm(prev => ({ ...prev, ...updates }));
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 'basic':
        return (
          <div className="space-y-6">
            <div>
              <Label htmlFor="title">Course Title *</Label>
              <Input
                id="title"
                value={courseForm.title}
                onChange={(e) => updateForm({ title: e.target.value })}
                placeholder="Enter your course title"
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="description">Description *</Label>
              <Textarea
                id="description"
                value={courseForm.description}
                onChange={(e) => updateForm({ description: e.target.value })}
                placeholder="Describe what students will learn in your course"
                rows={4}
                className="mt-1"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="category">Category *</Label>
                <Select value={courseForm.category} onValueChange={(value) => updateForm({ category: value })}>
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="programming">Programming</SelectItem>
                    <SelectItem value="design">Design</SelectItem>
                    <SelectItem value="business">Business</SelectItem>
                    <SelectItem value="marketing">Marketing</SelectItem>
                    <SelectItem value="finance">Finance</SelectItem>
                    <SelectItem value="data-science">Data Science</SelectItem>
                    <SelectItem value="trading">Trading</SelectItem>
                    <SelectItem value="investing">Investing</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="level">Level</Label>
                <Select value={courseForm.level} onValueChange={(value: any) => updateForm({ level: value })}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="beginner">Beginner</SelectItem>
                    <SelectItem value="intermediate">Intermediate</SelectItem>
                    <SelectItem value="advanced">Advanced</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label htmlFor="tags">Tags (comma-separated)</Label>
              <Input
                id="tags"
                value={courseForm.tags.join(', ')}
                onChange={(e) => updateForm({
                  tags: e.target.value.split(',').map(tag => tag.trim()).filter(Boolean)
                })}
                placeholder="JavaScript, React, Web Development"
                className="mt-1"
              />
            </div>
          </div>
        );

      case 'content':
        return (
          <div className="space-y-6">
            <div>
              <Label htmlFor="thumbnail_url">Course Thumbnail Image URL</Label>
              <Input
                id="thumbnail_url"
                value={courseForm.thumbnail_url || ''}
                onChange={(e) => updateForm({ thumbnail_url: e.target.value })}
                placeholder="https://example.com/image.jpg"
                className="mt-1"
              />
              <p className="text-sm text-gray-600 mt-1">
                Provide a URL for your course thumbnail image (optional)
              </p>
            </div>

            <div>
              <Label htmlFor="trailer_video_id">Course Trailer Video ID (Vimeo)</Label>
              <Input
                id="trailer_video_id"
                value={courseForm.trailer_video_id || ''}
                onChange={(e) => updateForm({ trailer_video_id: e.target.value })}
                placeholder="123456789"
                className="mt-1"
              />
              <p className="text-sm text-gray-600 mt-1">
                Enter the Vimeo video ID for your course trailer (optional)
              </p>
            </div>

            <div className="text-center py-8">
              <Upload className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">Additional Content</h3>
              <p className="text-gray-600 mb-4">
                Video lessons and detailed content will be managed after course creation.
              </p>
              <p className="text-sm text-gray-500">
                You'll be able to upload videos, create lessons, and organize content in your mentor dashboard.
              </p>
            </div>
          </div>
        );

      case 'pricing':
        return (
          <div className="space-y-6">
            <div>
              <Label htmlFor="price">Course Price (USD)</Label>
              <div className="relative mt-1">
                <DollarSign className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  id="price"
                  type="number"
                  value={courseForm.price}
                  onChange={(e) => updateForm({ price: parseFloat(e.target.value) || 0 })}
                  placeholder="0"
                  className="pl-10"
                />
              </div>
              <p className="text-sm text-gray-600 mt-1">
                Set to 0 for free courses. Platform takes 20% commission on paid courses.
              </p>
            </div>

            <div className="bg-blue-50 p-4 rounded-lg">
              <h4 className="font-medium text-blue-900 mb-2">Revenue Breakdown</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-blue-700">Course Price:</span>
                  <span className="font-medium">${courseForm.price.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-blue-700">Platform Fee (20%):</span>
                  <span className="font-medium text-red-600">
                    -${(courseForm.price * 0.20).toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between border-t pt-2">
                  <span className="text-blue-900 font-medium">You'll Earn:</span>
                  <span className="font-bold text-green-600">
                    ${(courseForm.price * 0.80).toFixed(2)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        );

      case 'review':
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-6">
              <div>
                <h4 className="font-medium mb-3">Course Details</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Title:</span>
                    <span className="font-medium">{courseForm.title}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Category:</span>
                    <Badge variant="secondary">{courseForm.category}</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Level:</span>
                    <Badge variant="outline">{courseForm.level}</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Price:</span>
                    <span className="font-medium">
                      {courseForm.price === 0 ? 'Free' : `$${courseForm.price}`}
                    </span>
                  </div>
                  {courseForm.thumbnail_url && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Thumbnail:</span>
                      <span className="font-medium text-blue-600">Set</span>
                    </div>
                  )}
                  {courseForm.trailer_video_id && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Trailer Video:</span>
                      <span className="font-medium text-blue-600">Set</span>
                    </div>
                  )}
                </div>
              </div>

              <div>
                <h4 className="font-medium mb-3">Tags</h4>
                <div className="flex flex-wrap gap-2">
                  {courseForm.tags.map((tag, index) => (
                    <Badge key={index} variant="secondary">{tag}</Badge>
                  ))}
                </div>
              </div>
            </div>

            <div>
              <h4 className="font-medium mb-3">Description</h4>
              <p className="text-sm text-gray-700 bg-gray-50 p-3 rounded-lg">
                {courseForm.description}
              </p>
            </div>

            <div className="bg-green-50 p-4 rounded-lg">
              <div className="flex items-center space-x-2 mb-2">
                <Check className="w-5 h-5 text-green-600" />
                <h4 className="font-medium text-green-900">Ready to Create!</h4>
              </div>
              <p className="text-sm text-green-700">
                Your course will be created as a draft. You can add videos, create lessons, and publish it after creation.
              </p>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Create New Course</h1>
        <p className="text-gray-600">
          Build your course step by step. You can always edit details later.
        </p>
      </div>

      {/* Progress Bar */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          {steps.map((step, index) => {
            const Icon = step.icon;
            const isActive = step.id === currentStep;
            const isCompleted = getCurrentStepIndex() > index;

            return (
              <div key={step.id} className="flex items-center">
                <div className={`
                  flex items-center justify-center w-10 h-10 rounded-full border-2
                  ${isCompleted ? 'bg-green-500 border-green-500 text-white' :
                    isActive ? 'border-blue-500 text-blue-500' :
                    'border-gray-300 text-gray-400'}
                `}>
                  {isCompleted ? (
                    <Check className="w-5 h-5" />
                  ) : (
                    <Icon className="w-5 h-5" />
                  )}
                </div>
                <span className={`ml-2 text-sm ${isActive ? 'font-medium' : 'text-gray-500'}`}>
                  {step.title}
                </span>
                {index < steps.length - 1 && (
                  <div className={`w-12 h-px mx-4 ${
                    isCompleted ? 'bg-green-500' : 'bg-gray-300'
                  }`} />
                )}
              </div>
            );
          })}
        </div>
        <Progress value={(getCurrentStepIndex() + 1) / steps.length * 100} className="h-2" />
      </div>

      {/* Step Content */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            {React.createElement(steps[getCurrentStepIndex()].icon, { className: "w-5 h-5" })}
            <span>{steps[getCurrentStepIndex()].title}</span>
          </CardTitle>
          <CardDescription>
            {currentStep === 'basic' && 'Set up the basic information for your course'}
            {currentStep === 'content' && 'Course content and video lessons (manage after creation)'}
            {currentStep === 'pricing' && 'Set your course pricing and revenue structure'}
            {currentStep === 'review' && 'Review your course details before creating'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {renderStepContent()}
        </CardContent>
      </Card>

      {/* Navigation */}
      <div className="flex justify-between mt-8">
        <Button
          variant="outline"
          onClick={currentStep === 'basic' ? onCancel : handlePrevious}
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          {currentStep === 'basic' ? 'Cancel' : 'Previous'}
        </Button>

        {currentStep === 'review' ? (
          <Button
            onClick={handleSubmit}
            disabled={isLoading}
            className="bg-green-600 hover:bg-green-700"
          >
            {isLoading ? (
              'Creating...'
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                Create Course
              </>
            )}
          </Button>
        ) : (
          <Button
            onClick={handleNext}
            disabled={!canProceedToNext()}
          >
            Next
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        )}
      </div>
    </div>
  );
}
