'use client';

import React, { useState, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';

import {
  Upload,
  X,
  CheckCircle,
  AlertCircle,
  Video,
  FileVideo,
  Trash2,
  Play
} from 'lucide-react';

interface VideoFile {
  file: File;
  id: string;
  name: string;
  size: number;
  progress: number;
  status: 'pending' | 'uploading' | 'processing' | 'completed' | 'error';
  videoId?: string;
  playbackId?: string;
  error?: string;
  processingCheckCount?: number;
}

interface VideoUploadManagerProps {
  mentorId: string;
  onUploadComplete?: (videoId: string, fileName: string) => void;
  onUploadError?: (error: string) => void;
  maxFiles?: number;
  acceptedTypes?: string[];
}

export default function VideoUploadManager({
  mentorId,
  onUploadComplete,
  onUploadError,
  maxFiles = 10,
  acceptedTypes = ['video/mp4', 'video/webm', 'video/quicktime']
}: VideoUploadManagerProps) {
  const [videos, setVideos] = useState<VideoFile[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const generateId = () => Math.random().toString(36).substr(2, 9);

  const validateFile = useCallback((file: File): string | null => {
    if (!acceptedTypes.includes(file.type)) {
      return `Invalid file type. Please upload: ${acceptedTypes.join(', ')}`;
    }

    if (file.size > 500 * 1024 * 1024) { // 500MB limit
      return 'File size must be less than 500MB';
    }

    return null;
  }, [acceptedTypes]);

  const handleFiles = useCallback((files: FileList | null) => {
    if (!files) return;

    const newVideos: VideoFile[] = [];
    const errors: string[] = [];

    Array.from(files).forEach(file => {
      const error = validateFile(file);
      if (error) {
        errors.push(`${file.name}: ${error}`);
        return;
      }

      if (videos.length + newVideos.length >= maxFiles) {
        errors.push(`Maximum ${maxFiles} files allowed`);
        return;
      }

      newVideos.push({
        file,
        id: generateId(),
        name: file.name,
        size: file.size,
        progress: 0,
        status: 'pending'
      });
    });

    if (errors.length > 0) {
      onUploadError?.(errors.join('\n'));
    }

    if (newVideos.length > 0) {
      setVideos(prev => [...prev, ...newVideos]);
    }
  }, [videos, maxFiles, validateFile, onUploadError]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    handleFiles(e.dataTransfer.files);
  }, [handleFiles]);

  const removeVideo = (id: string) => {
    setVideos(prev => prev.filter(v => v.id !== id));
  };

  const uploadVideo = async (video: VideoFile) => {
    const formData = new FormData();
    formData.append('video', video.file);
    formData.append('mentorId', mentorId);
    formData.append('fileName', video.name);

    try {
      const response = await fetch('/api/mentor-marketplace/videos/upload', {
        method: 'POST',
        body: formData,
        credentials: 'include', // Include cookies for authentication
      });

      if (!response.ok) {
        throw new Error(`Upload failed: ${response.statusText}`);
      }

      const data = await response.json();

      if (data.error) {
        throw new Error(data.error);
      }

      return data.videoId;
    } catch (error) {
      console.error('Upload error:', error);
      throw error;
    }
  };

  const uploadAllVideos = async () => {
    setIsUploading(true);
    const pendingVideos = videos.filter(v => v.status === 'pending');

    for (const video of pendingVideos) {
      try {
        // Update status to uploading
        setVideos(prev => prev.map(v =>
          v.id === video.id ? { ...v, status: 'uploading' as const } : v
        ));

        const videoId = await uploadVideo(video);

        // Update status to processing - video is uploaded but needs to be processed by Mux
        setVideos(prev => prev.map(v =>
          v.id === video.id
            ? { ...v, status: 'processing' as const, progress: 100, videoId, processingCheckCount: 0 }
            : v
        ));

        // Start polling for processing status
        pollVideoProcessing(video.id, videoId);

        onUploadComplete?.(videoId, video.name);
      } catch (error) {
        // Update status to error
        setVideos(prev => prev.map(v =>
          v.id === video.id
            ? {
                ...v,
                status: 'error' as const,
                error: error instanceof Error ? error.message : 'Upload failed'
              }
            : v
        ));
      }
    }

    setIsUploading(false);
  };

  const pollVideoProcessing = async (videoId: string, assetId: string) => {
    try {
      const response = await fetch(`/api/mentor-marketplace/videos/status?assetId=${assetId}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to check video status');
      }

      if (data.status === 'ready') {
        // Video is ready
        setVideos(prev => prev.map(v =>
          v.id === videoId
            ? {
                ...v,
                status: 'completed' as const,
                playbackId: data.playbackId,
                processingCheckCount: undefined
              }
            : v
        ));
      } else if (data.status === 'errored') {
        // Video processing failed
        setVideos(prev => prev.map(v =>
          v.id === videoId
            ? {
                ...v,
                status: 'error' as const,
                error: 'Video processing failed',
                processingCheckCount: undefined
              }
            : v
        ));
      } else {
        // Still processing, schedule another check
        const currentVideo = videos.find(v => v.id === videoId);
        const checkCount = (currentVideo?.processingCheckCount || 0) + 1;

        // Stop polling after 30 attempts (about 1 minute)
        if (checkCount >= 30) {
          setVideos(prev => prev.map(v =>
            v.id === videoId
              ? {
                  ...v,
                  status: 'error' as const,
                  error: 'Video processing timeout - please try uploading again',
                  processingCheckCount: undefined
                }
              : v
          ));
          return;
        }

        setVideos(prev => prev.map(v =>
          v.id === videoId ? { ...v, processingCheckCount: checkCount } : v
        ));

        // Check again in 2 seconds
        setTimeout(() => pollVideoProcessing(videoId, assetId), 2000);
      }
    } catch (error) {
      console.error('Error polling video status:', error);
      // Retry after a delay
      setTimeout(() => pollVideoProcessing(videoId, assetId), 5000);
    }
  };

  const clearCompleted = () => {
    setVideos(prev => prev.filter(v => v.status !== 'completed'));
  };

  const retryFailed = () => {
    setVideos(prev => prev.map(v =>
      v.status === 'error' ? { ...v, status: 'pending' as const, error: undefined } : v
    ));
  };

  const getStatusIcon = (status: VideoFile['status']) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'error':
        return <AlertCircle className="w-5 h-5 text-red-500" />;
      case 'uploading':
        return <Upload className="w-5 h-5 text-blue-500 animate-pulse" />;
      case 'processing':
        return <Video className="w-5 h-5 text-yellow-500 animate-pulse" />;
      default:
        return <FileVideo className="w-5 h-5 text-gray-400" />;
    }
  };

  const getStatusColor = (status: VideoFile['status']) => {
    switch (status) {
      case 'completed':
        return 'bg-green-50 border-green-200';
      case 'error':
        return 'bg-red-50 border-red-200';
      case 'uploading':
        return 'bg-blue-50 border-blue-200';
      case 'processing':
        return 'bg-yellow-50 border-yellow-200';
      default:
        return 'bg-gray-50 border-gray-200';
    }
  };

  const completedCount = videos.filter(v => v.status === 'completed').length;
  const processingCount = videos.filter(v => v.status === 'processing').length;
  const errorCount = videos.filter(v => v.status === 'error').length;

  return (
    <div className="space-y-6">
      {/* Upload Area */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Video className="w-5 h-5" />
            <span>Video Upload</span>
          </CardTitle>
          <CardDescription>
            Upload videos for your course lessons. Maximum {maxFiles} videos allowed.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div
            className={`
              border-2 border-dashed rounded-lg p-8 text-center transition-colors
              ${isDragOver ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-gray-400'}
            `}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-lg font-medium mb-2">
              Drag and drop your videos here
            </p>
            <p className="text-gray-600 mb-4">
              or click to browse files
            </p>
            <input
              type="file"
              multiple
              accept={acceptedTypes.join(',')}
              onChange={(e) => handleFiles(e.target.files)}
              className="hidden"
              id="video-upload"
            />
            <Button asChild>
              <label htmlFor="video-upload" className="cursor-pointer">
                Choose Files
              </label>
            </Button>
          </div>

          {/* Upload Progress Summary */}
          {videos.length > 0 && (
            <div className="mt-6 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <Badge variant="secondary">
                    {completedCount}/{videos.length} uploaded
                  </Badge>
                  {processingCount > 0 && (
                    <Badge variant="outline" className="border-yellow-500 text-yellow-700">
                      {processingCount} processing
                    </Badge>
                  )}
                  {errorCount > 0 && (
                    <Badge variant="destructive">
                      {errorCount} failed
                    </Badge>
                  )}
                </div>
                <div className="flex space-x-2">
                  {errorCount > 0 && (
                    <Button variant="outline" size="sm" onClick={retryFailed}>
                      Retry Failed
                    </Button>
                  )}
                  {completedCount > 0 && (
                    <Button variant="outline" size="sm" onClick={clearCompleted}>
                      Clear Completed
                    </Button>
                  )}
                  {videos.some(v => v.status === 'pending') && (
                    <Button
                      onClick={uploadAllVideos}
                      disabled={isUploading}
                      size="sm"
                    >
                      {isUploading ? 'Uploading...' : `Upload ${videos.filter(v => v.status === 'pending').length} Videos`}
                    </Button>
                  )}
                </div>
              </div>

              {/* Video List */}
              <div className="space-y-3">
                {videos.map((video) => (
                  <div
                    key={video.id}
                    className={`border rounded-lg p-4 ${getStatusColor(video.status)}`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3 flex-1">
                        {getStatusIcon(video.status)}
                        <div className="flex-1">
                          <p className="font-medium text-sm">{video.name}</p>
                          <p className="text-xs text-gray-600">
                            {formatFileSize(video.size)}
                          </p>
                          {video.status === 'uploading' && (
                            <Progress value={video.progress} className="mt-2 h-2" />
                          )}
                          {video.status === 'processing' && (
                            <div className="mt-2">
                              <p className="text-xs text-yellow-600">
                                Processing video... {video.processingCheckCount ? `(${video.processingCheckCount}/30)` : ''}
                              </p>
                              <Progress value={undefined} className="mt-1 h-2 animate-pulse" />
                            </div>
                          )}
                          {video.error && (
                            <p className="text-xs text-red-600 mt-1">{video.error}</p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        {video.status === 'completed' && video.videoId && (
                          <Button variant="outline" size="sm">
                            <Play className="w-4 h-4 mr-1" />
                            Preview
                          </Button>
                        )}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => removeVideo(video.id)}
                          disabled={video.status === 'uploading' || video.status === 'processing'}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>


    </div>
  );
}
