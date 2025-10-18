"use client";

import { useState, useRef, useEffect } from 'react';
import { Skeleton } from '@/components/ui/skeleton';

/**
 * Props for the LazyImage component
 */
export interface LazyImageProps {
  /** Image source URL */
  src: string;
  /** Alt text for accessibility */
  alt: string;
  /** Additional CSS classes */
  className?: string;
  /** Fixed width in pixels */
  width?: number;
  /** Fixed height in pixels */
  height?: number;
  /** Custom styles object */
  style?: React.CSSProperties;
  /** Placeholder type while loading */
  placeholder?: 'blur' | 'empty';
  /** Base64 encoded blur placeholder image */
  blurDataURL?: string;
  /** Callback when image loads successfully */
  onLoad?: () => void;
  /** Callback when image fails to load */
  onError?: () => void;
}

/**
 * Lazy loading image component with intersection observer
 * Loads images only when they come into viewport for better performance
 * Supports blur placeholders and error states
 */
export function LazyImage({
  src,
  alt,
  className = '',
  width,
  height,
  placeholder = 'empty',
  blurDataURL,
  onLoad,
  onError
}: LazyImageProps) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isInView, setIsInView] = useState(false);
  const [hasError, setHasError] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Intersection Observer for lazy loading
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
          observer.disconnect();
        }
      },
      {
        rootMargin: '50px', // Start loading 50px before the image comes into view
        threshold: 0.1
      }
    );

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => observer.disconnect();
  }, []);

  const handleLoad = () => {
    setIsLoaded(true);
    onLoad?.();
  };

  const handleError = () => {
    setHasError(true);
    onError?.();
  };

  if (hasError) {
    return (
      <div
        className={`bg-muted/20 flex items-center justify-center text-muted-foreground text-sm ${className}`}
        style={{ width, height }}
      >
        Failed to load image
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={`relative overflow-hidden ${className}`}
      style={{
        width: width || '100%',
        height: height || '200px',
        minWidth: width || '100%',
        minHeight: height || '200px'
      }}
    >
      {/* Placeholder/Skeleton */}
      {!isLoaded && (
        <div className="absolute inset-0 z-10">
          {placeholder === 'blur' && blurDataURL ? (
            <img
              src={blurDataURL}
              alt=""
              className="w-full h-full object-contain"
              aria-hidden="true"
            />
          ) : (
            <Skeleton className="w-full h-full" />
          )}
        </div>
      )}

      {/* Actual Image */}
      {isInView && (
        <img
          src={src}
          alt={alt}
          className={`w-full h-full object-contain transition-opacity duration-300 ${
            isLoaded ? 'opacity-100' : 'opacity-0'
          }`}
          onLoad={handleLoad}
          onError={handleError}
          loading="lazy"
        />
      )}

      {/* Loading indicator for images not yet in view */}
      {!isInView && (
        <div className="bg-muted/10 flex items-center justify-center w-full h-full">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-muted-foreground"></div>
        </div>
      )}
    </div>
  );
}
