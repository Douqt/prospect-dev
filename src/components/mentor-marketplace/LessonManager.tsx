'use client';

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { Lesson, VimeoVideo } from '@/types/mentor-marketplace';
import VideoUploadManager from './VideoUploadManager';
import { deleteMuxVideo } from '@/lib/mentor-marketplace/mux-api';

import {
  Plus,
  Edit,
  Trash2,
  Play,
  GripVertical,
  Eye,
  EyeOff,
  Save,
  X,
  Video,
  Clock,
  CheckCircle,
  Eye as EyeIcon
} from 'lucide-react';

interface LessonManagerProps {
  courseId: string;
  mentorId: string;
  uploadedVideos?: VimeoVideo[];
  onLessonUpdate?: () => void;
}

interface LessonForm {
  title: string;
  description: string;
  video_id: string;
  duration_minutes: number;
  is_preview: boolean;
}

export default function LessonManager({ courseId, mentorId, uploadedVideos = [], onLessonUpdate }: LessonManagerProps) {
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();
  const [showAddLesson, setShowAddLesson] = useState(false);
  const [editingLesson, setEditingLesson] = useState<Lesson | null>(null);
  const [availableVideos, setAvailableVideos] = useState<VimeoVideo[]>([]);
  const [uploadedVideo, setUploadedVideo] = useState<{ id: string; name: string; playbackId?: string } | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [previewLesson, setPreviewLesson] = useState<Lesson | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [previewPlaybackId, setPreviewPlaybackId] = useState<string | null>(null);
  const [previewStatus, setPreviewStatus] = useState<'loading' | 'ready' | 'processing' | 'error'>('loading');

  const [lessonForm, setLessonForm] = useState<LessonForm>({
    title: '',
    description: '',
    video_id: '',
    duration_minutes: 0,
    is_preview: false,
  });

  const memoizedCourseId = useMemo(() => courseId, [courseId]);
  const memoizedUploadedVideos = useMemo(() => uploadedVideos, [JSON.stringify(uploadedVideos)]);

  const fetchLessons = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/mentor-marketplace/lessons?courseId=${memoizedCourseId}`);
      const data = await response.json();

      if (data.error) {
        console.error('Error fetching lessons:', data.error);
      } else {
        setLessons(data.data || []);
      }
    } catch (error) {
      console.error('Error fetching lessons:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchAvailableVideos = async () => {
    try {
      // In a real implementation, you'd fetch the mentor's uploaded videos from Vimeo
      // For now, we'll use the uploadedVideos prop
      setAvailableVideos(memoizedUploadedVideos);
    } catch (error) {
      console.error('Error fetching available videos:', error);
    }
  };

  useEffect(() => {
    fetchLessons();
    fetchAvailableVideos();
  }, [memoizedCourseId, memoizedUploadedVideos]);

  const handleCreateLesson = async () => {
    // Validate required fields
    if (!lessonForm.title.trim()) {
      toast({
        title: "Error",
        description: "Please enter a lesson title.",
        variant: "destructive",
      });
      return;
    }

    if (!lessonForm.video_id) {
      toast({
        title: "Error",
        description: "Please upload a video for this lesson.",
        variant: "destructive",
      });
      return;
    }

    // Check if video is ready before creating lesson
    try {
      const statusResponse = await fetch(`/api/mentor-marketplace/videos/status?assetId=${lessonForm.video_id}`);
      const statusResult = await statusResponse.json();
      if (!statusResult.success || statusResult.status !== 'ready') {
        toast({
          title: "Error",
          description: "Video is still processing. Please wait for the video to finish processing before creating the lesson.",
          variant: "destructive",
        });
        return;
      }

      // Update duration if available
      if (statusResult.playbackId) {
        // Optionally get duration here if not already set
        const durationResponse = await fetch(`/api/mentor-marketplace/videos/duration?assetId=${lessonForm.video_id}`);
        const durationResult = await durationResponse.json();
        if (durationResult.success && durationResult.duration) {
          const durationMinutes = Math.ceil(durationResult.duration / 60);
          setLessonForm(prev => ({ ...prev, duration_minutes: durationMinutes }));
        }
      }
    } catch (error) {
      console.error('Error checking video status:', error);
      toast({
        title: "Error",
        description: "Error checking video status. Please try again.",
        variant: "destructive",
      });
      return;
    }

    try {
      const response = await fetch('/api/mentor-marketplace/lessons', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...lessonForm,
          course_id: courseId,
          order_index: lessons.length,
        }),
      });

      const data = await response.json();

      if (data.error) {
        throw new Error(data.error);
      }

      // Reset state after successful creation
      setShowAddLesson(false);
      setUploadedVideo(null);
      setLessonForm({
        title: '',
        description: '',
        video_id: '',
        duration_minutes: 0,
        is_preview: false,
      });
      fetchLessons();
      onLessonUpdate?.();
    } catch (error) {
      console.error('Error creating lesson:', error);
      toast({
        title: "Error",
        description: `Failed to create lesson: ${error instanceof Error ? error.message : 'Please try again.'}`,
        variant: "destructive",
      });
    }
  };

  const handleUpdateLesson = async () => {
    if (!editingLesson) return;

    try {
      const response = await fetch(`/api/mentor-marketplace/lessons/${editingLesson.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(lessonForm),
      });

      const data = await response.json();

      if (data.error) {
        throw new Error(data.error);
      }

      setEditingLesson(null);
      setLessonForm({
        title: '',
        description: '',
        video_id: '',
        duration_minutes: 0,
        is_preview: false,
      });
      fetchLessons();
      onLessonUpdate?.();
    } catch (error) {
      console.error('Error updating lesson:', error);
      toast({
        title: "Error",
        description: "Failed to update lesson. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleDeleteLesson = async (lessonId: string) => {
    if (!confirm('Are you sure you want to delete this lesson?')) return;

    try {
      const response = await fetch(`/api/mentor-marketplace/lessons/${lessonId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        fetchLessons();
        onLessonUpdate?.();
      }
    } catch (error) {
      console.error('Error deleting lesson:', error);
      toast({
        title: "Error",
        description: "Failed to delete lesson. Please try again.",
        variant: "destructive",
      });
    }
  };

  const startEdit = (lesson: Lesson) => {
    setEditingLesson(lesson);
    setLessonForm({
      title: lesson.title,
      description: lesson.description || '',
      video_id: lesson.video_id,
      duration_minutes: lesson.duration_minutes,
      is_preview: lesson.is_preview,
    });
  };

  const cancelEdit = () => {
    setEditingLesson(null);
    setLessonForm({
      title: '',
      description: '',
      video_id: '',
      duration_minutes: 0,
      is_preview: false,
    });
  };

  const handleCancelAddLesson = async () => {
    // If there's an uploaded video, delete it from Mux
    if (uploadedVideo && uploadedVideo.id) {
      try {
        const deleteResult = await deleteMuxVideo(uploadedVideo.id);
        if (!deleteResult.success) {
          console.error('Failed to delete video from Mux on cancel:', deleteResult.error);
        }
      } catch (error) {
        console.error('Error deleting video from Mux on cancel:', error);
      }
    }

    // Reset state
    setShowAddLesson(false);
    setUploadedVideo(null);
    setLessonForm({
      title: '',
      description: '',
      video_id: '',
      duration_minutes: 0,
      is_preview: false,
    });
  };

  const handlePreview = async (lesson: Lesson) => {
    setPreviewLesson(lesson);
    setPreviewStatus('loading');
    setPreviewPlaybackId(null);

    // Fetch the playback ID for the video
    try {
      const detailsResponse = await fetch(`/api/mentor-marketplace/videos/details?assetId=${lesson.video_id}`);
      const detailsResult = await detailsResponse.json();
      if (detailsResult.success && detailsResult.asset) {
        // Check if the video is ready
        if (detailsResult.asset.status === 'ready' && detailsResult.asset.playback_ids?.[0]?.id) {
          setPreviewPlaybackId(detailsResult.asset.playback_ids[0].id);
          setPreviewStatus('ready');
        } else if (detailsResult.asset.status === 'preparing') {
          console.warn('Video is still processing');
          setPreviewStatus('processing');
        } else {
          console.error('Video is not ready or failed to process');
          setPreviewStatus('error');
        }
      } else {
        console.error('Failed to get video details for preview:', detailsResult.error);
        setPreviewStatus('error');
      }
    } catch (error) {
      console.error('Error fetching video details for preview:', error);
      setPreviewStatus('error');
    }

    setShowPreview(true);
  };

  const isPollingActive = useRef(false);

  const handleVideoUpload = async (file: File) => {
    setIsUploading(true);
    isPollingActive.current = true; // Enable polling

    try {
      const formData = new FormData();
      formData.append('video', file);
      formData.append('mentorId', mentorId);
      formData.append('fileName', file.name);

      const response = await fetch('/api/mentor-marketplace/videos/upload', {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error(`Upload failed: ${response.statusText}`);
      }

      const data = await response.json();

      if (data.error) {
        throw new Error(data.error);
      }

      // Set the uploaded video info initially without playbackId
      const videoInfo = {
        id: data.videoId,
        name: file.name,
        playbackId: data.playbackId, // This might be null initially
      };

      setUploadedVideo(videoInfo);

      // Update the lesson form with the video ID
      setLessonForm({
        ...lessonForm,
        video_id: data.videoId,
      });

      // Start polling immediately - use data.videoId directly instead of relying on state
      console.log('Starting video processing poll for asset:', data.videoId);
      await pollVideoProcessing(data.videoId);

      // Show success message
      if (data.playbackId) {
        toast({
          title: "Success",
          description: "Video uploaded and processed successfully!",
        });
      } else {
        toast({
          title: "Success",
          description: "Video uploaded successfully! Processing status will update automatically.",
        });
      }

    } catch (error) {
      console.error('Upload error:', error);
      toast({
        title: "Error",
        description: `Upload failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  const pollVideoProcessing = async (assetId: string) => {
    // Check if user cancelled (no uploadedVideo state)
    if (!isPollingActive.current) {
      console.log('Polling cancelled - no uploaded video state');
      return;
    }

    try {
      const response = await fetch(`/api/mentor-marketplace/videos/status?assetId=${assetId}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to check video status');
      }

      if (data.status === 'ready' && data.playbackId) {
        // Video is ready, update the uploaded video with playbackId
        setUploadedVideo(prev => prev ? {
          ...prev,
          playbackId: data.playbackId
        } : null);

        // Get video duration and set it in the lesson form
        try {
          const durationResponse = await fetch(`/api/mentor-marketplace/videos/duration?assetId=${assetId}`);
          const durationResult = await durationResponse.json();
          if (durationResult.success && durationResult.duration) {
            const durationMinutes = Math.ceil(durationResult.duration / 60);
            setLessonForm(prev => ({
              ...prev,
              duration_minutes: durationMinutes
            }));
          }
        } catch (error) {
          console.error('Error getting video duration:', error);
        }

        toast({
          title: "Success",
          description: "Video uploaded and processed successfully!",
        });
      } else if (data.status === 'errored') {
        // Video processing failed
        toast({
          title: "Error",
          description: "Video processing failed. Please try uploading again.",
          variant: "destructive",
        });
        setUploadedVideo(null);
      } else {
        // Still processing, check again in 2 seconds
        setTimeout(() => pollVideoProcessing(assetId), 2000);
      }
    } catch (error) {
      console.error('Error polling video status:', error);
      // Don't retry on error to avoid infinite loops
      // Just clean up the state
      setUploadedVideo(null);
    }
  };

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;

    if (hours > 0) {
      return `${hours}h ${mins}m`;
    }
    return `${mins}m`;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Course Lessons</h2>
          <p className="text-gray-600">
            Manage your course content and video lessons
          </p>
        </div>

        <Dialog open={showAddLesson} onOpenChange={(open) => {
          if (!open) {
            handleCancelAddLesson();
          } else {
            setShowAddLesson(true);
          }
        }}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Add Lesson
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Add New Lesson</DialogTitle>
              <DialogDescription>
                Create a new lesson for your course with a video.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div>
                <Label htmlFor="lesson-title">Lesson Title *</Label>
                <Input
                  id="lesson-title"
                  value={lessonForm.title}
                  onChange={(e) => setLessonForm({ ...lessonForm, title: e.target.value })}
                  placeholder="Enter lesson title"
                />
              </div>

              <div>
                <Label htmlFor="lesson-description">Description</Label>
                <Textarea
                  id="lesson-description"
                  value={lessonForm.description}
                  onChange={(e) => setLessonForm({ ...lessonForm, description: e.target.value })}
                  placeholder="Describe what students will learn in this lesson"
                  rows={3}
                />
              </div>

              <div className="space-y-4">
                <div>
                  <Label htmlFor="lesson-video">Upload Video *</Label>

                  {!uploadedVideo ? (
                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-gray-400 transition-colors">
                      {isUploading ? (
                        <>
                          <div className="animate-spin w-12 h-12 text-blue-500 mx-auto mb-4">
                            <Video className="w-12 h-12" />
                          </div>
                          <p className="text-sm text-gray-600 mb-4">
                            Uploading video...
                          </p>
                        </>
                      ) : (
                        <>
                          <Video className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                          <p className="text-sm text-gray-600 mb-4">
                            Upload a video for this lesson
                          </p>
                          <input
                            type="file"
                            accept="video/*"
                            onChange={async (e) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                await handleVideoUpload(file);
                              }
                            }}
                            className="hidden"
                            id="lesson-video-upload"
                          />
                          <Button asChild>
                            <label htmlFor="lesson-video-upload" className="cursor-pointer">
                              Choose Video File
                            </label>
                          </Button>
                        </>
                      )}
                    </div>
                  ) : (
                    <div className="border-2 border-green-300 bg-green-50 rounded-lg p-6">
                      <div className="flex items-center space-x-3 mb-4">
                        <CheckCircle className="w-8 h-8 text-green-600" />
                        <div className="flex-1">
                          <p className="font-medium text-green-800">Video Uploaded Successfully!</p>
                          <p className="text-sm text-green-600">{uploadedVideo.name}</p>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={async () => {
                            // Delete the current video from Mux before changing
                            if (uploadedVideo && uploadedVideo.id) {
                              try {
                                const deleteResult = await deleteMuxVideo(uploadedVideo.id);
                                if (!deleteResult.success) {
                                  console.error('Failed to delete video from Mux on change:', deleteResult.error);
                                }
                              } catch (error) {
                                console.error('Error deleting video from Mux on change:', error);
                              }
                            }
                            setUploadedVideo(null);
                          }}
                        >
                          Change Video
                        </Button>
                      </div>

                      {/* Mux Video Player */}
                      {uploadedVideo.playbackId && (
                        <div className="rounded-lg overflow-hidden" style={{ aspectRatio: '16/9' }}>
                          <iframe
                            src={`https://player.mux.com/${uploadedVideo.playbackId}`}
                            style={{
                              width: '100%',
                              height: '100%',
                              border: 'none',
                              aspectRatio: '16/9'
                            }}
                            allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture;"
                            allowFullScreen
                          />
                        </div>
                      )}

                      {!uploadedVideo.playbackId && (
                        <div className="bg-gray-100 rounded-lg p-4 text-center">
                          <div className="animate-spin w-8 h-8 text-gray-500 mx-auto mb-2">
                            <Video className="w-8 h-8" />
                          </div>
                          <p className="text-sm text-gray-600">
                            Video is processing... This may take a few minutes for large files.
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </div>


              </div>

              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="is-preview"
                  checked={lessonForm.is_preview}
                  onChange={(e) => setLessonForm({ ...lessonForm, is_preview: e.target.checked })}
                  className="rounded"
                />
                <Label htmlFor="is-preview">Mark as preview (free lesson)</Label>
              </div>

              <div className="flex justify-end space-x-2">
                <Button
                  variant="outline"
                  onClick={handleCancelAddLesson}
                >
                  Cancel
                </Button>
                <Button onClick={handleCreateLesson}>
                  Add Lesson
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Lessons List */}
      {lessons.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <Video className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">No lessons yet</h3>
            <p className="text-gray-600 mb-4">
              Add your first lesson to get started with your course content.
            </p>
            <Button onClick={() => setShowAddLesson(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Add Your First Lesson
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {lessons.map((lesson, index) => (
            <Card key={lesson.id}>
              <CardContent className="p-6">
                {editingLesson?.id === lesson.id ? (
                  // Edit Mode
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="edit-title">Lesson Title</Label>
                      <Input
                        id="edit-title"
                        value={lessonForm.title}
                        onChange={(e) => setLessonForm({ ...lessonForm, title: e.target.value })}
                      />
                    </div>

                    <div>
                      <Label htmlFor="edit-description">Description</Label>
                      <Textarea
                        id="edit-description"
                        value={lessonForm.description}
                        onChange={(e) => setLessonForm({ ...lessonForm, description: e.target.value })}
                        rows={3}
                      />
                    </div>

                    <div>
                      <Label htmlFor="edit-video">Video</Label>
                      <Select value={lessonForm.video_id} onValueChange={(value) => setLessonForm({ ...lessonForm, video_id: value })}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {availableVideos.map((video) => (
                            <SelectItem key={video.id} value={video.id}>
                              {video.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id="edit-preview"
                        checked={lessonForm.is_preview}
                        onChange={(e) => setLessonForm({ ...lessonForm, is_preview: e.target.checked })}
                        className="rounded"
                      />
                      <Label htmlFor="edit-preview">Mark as preview lesson</Label>
                    </div>

                    <div className="flex justify-end space-x-2">
                      <Button variant="outline" onClick={cancelEdit}>
                        Cancel
                      </Button>
                      <Button onClick={handleUpdateLesson}>
                        <Save className="w-4 h-4 mr-2" />
                        Save Changes
                      </Button>
                    </div>
                  </div>
                ) : (
                  // View Mode
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4 flex-1">
                      <div className="flex items-center space-x-2">
                        <GripVertical className="w-5 h-5 text-gray-400" />
                        <span className="text-sm font-medium text-gray-500 w-8">
                          {index + 1}
                        </span>
                      </div>

                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-1">
                          <h3 className="font-medium">{lesson.title}</h3>
                          {lesson.is_preview && (
                            <Badge variant="secondary" className="text-xs">
                              Preview
                            </Badge>
                          )}
                        </div>

                        {lesson.description && (
                          <p className="text-sm text-gray-600 mb-2">
                            {lesson.description}
                          </p>
                        )}

                        <div className="flex items-center space-x-4 text-xs text-gray-500">
                          <div className="flex items-center space-x-1">
                            <Clock className="w-3 h-3" />
                            <span>{formatDuration(lesson.duration_minutes)}</span>
                          </div>
                          <div className="flex items-center space-x-1">
                            <Play className="w-3 h-3" />
                            <span>Video: {lesson.video_id}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2">
                      <Button variant="outline" size="sm" onClick={() => handlePreview(lesson)}>
                        <Play className="w-4 h-4 mr-1" />
                        Preview
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => startEdit(lesson)}
                      >
                        <Edit className="w-4 h-4 mr-1" />
                        Edit
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDeleteLesson(lesson.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Summary */}
      {lessons.length > 0 && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center space-x-4">
                <span>
                  <strong>{lessons.length}</strong> lessons
                </span>
                <span>
                  <strong>{lessons.reduce((acc, l) => acc + l.duration_minutes, 0)}</strong> minutes total
                </span>
                <span>
                  <strong>{lessons.filter(l => l.is_preview).length}</strong> preview lessons
                </span>
              </div>
              <div className="flex items-center space-x-2">
                {lessons.some(l => l.is_preview) && (
                  <Badge variant="secondary" className="text-xs">
                    <Eye className="w-3 h-3 mr-1" />
                    Has Preview
                  </Badge>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Preview Modal */}
      <Dialog open={showPreview} onOpenChange={(open) => {
        setShowPreview(open);
        if (!open) {
          setPreviewPlaybackId(null);
          setPreviewStatus('loading');
        }
      }}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>{previewLesson?.title}</DialogTitle>
            <DialogDescription>
              {previewLesson?.description}
            </DialogDescription>
          </DialogHeader>
          {previewLesson && previewStatus === 'ready' && previewPlaybackId ? (
            <div className="rounded-lg overflow-hidden" style={{ aspectRatio: '16/9' }}>
              <iframe
                src={`https://player.mux.com/${previewPlaybackId}`}
                style={{
                  width: '100%',
                  height: '100%',
                  border: 'none',
                  aspectRatio: '16/9'
                }}
                allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture;"
                allowFullScreen
              />
            </div>
          ) : previewStatus === 'processing' ? (
            <div className="flex items-center justify-center h-64 bg-gray-100 rounded-lg">
              <div className="text-center">
                <div className="animate-spin w-12 h-12 text-blue-500 mx-auto mb-2">
                  <Video className="w-12 h-12" />
                </div>
                <p className="text-gray-600">Video is still processing. Please wait...</p>
              </div>
            </div>
          ) : previewStatus === 'error' ? (
            <div className="flex items-center justify-center h-64 bg-red-50 rounded-lg">
              <div className="text-center">
                <Video className="w-12 h-12 text-red-400 mx-auto mb-2" />
                <p className="text-red-600">Failed to load video preview. The video may not be ready yet.</p>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center h-64 bg-gray-100 rounded-lg">
              <div className="text-center">
                <div className="animate-spin w-12 h-12 text-gray-500 mx-auto mb-2">
                  <Video className="w-12 h-12" />
                </div>
                <p className="text-gray-600">Loading video preview...</p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>


    </div>
  );
}
