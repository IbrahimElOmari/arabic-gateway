import { useCallback, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface TrackEventOptions {
  eventType?: string;
  eventName: string;
  pagePath?: string;
  referrer?: string;
  properties?: Record<string, unknown>;
}

export function useAnalytics() {
  const { user } = useAuth();
  const lastPageView = useRef<string | null>(null);

  const getDeviceInfo = useCallback(() => {
    const ua = navigator.userAgent;
    let deviceType = 'desktop';
    let browser = 'unknown';
    let os = 'unknown';

    // Device type
    if (/Mobi|Android/i.test(ua)) {
      deviceType = 'mobile';
    } else if (/Tablet|iPad/i.test(ua)) {
      deviceType = 'tablet';
    }

    // Browser
    if (ua.includes('Firefox')) browser = 'Firefox';
    else if (ua.includes('Chrome')) browser = 'Chrome';
    else if (ua.includes('Safari')) browser = 'Safari';
    else if (ua.includes('Edge')) browser = 'Edge';

    // OS
    if (ua.includes('Windows')) os = 'Windows';
    else if (ua.includes('Mac')) os = 'macOS';
    else if (ua.includes('Linux')) os = 'Linux';
    else if (ua.includes('Android')) os = 'Android';
    else if (ua.includes('iOS') || ua.includes('iPhone') || ua.includes('iPad')) os = 'iOS';

    return { deviceType, browser, os };
  }, []);

  const trackEvent = useCallback(async (options: TrackEventOptions) => {
    try {
      const { deviceType, browser, os } = getDeviceInfo();
      
      const { data: sessionData } = await supabase.auth.getSession();
      
      await supabase.functions.invoke('analytics', {
        body: {
          action: 'track_event',
          eventType: options.eventType || 'feature_use',
          eventName: options.eventName,
          pagePath: options.pagePath || window.location.pathname,
          referrer: options.referrer || document.referrer,
          properties: options.properties || {},
          deviceType,
          browser,
          os,
        },
        headers: sessionData.session?.access_token
          ? { Authorization: `Bearer ${sessionData.session.access_token}` }
          : {},
      });
    } catch (error) {
      // Silently fail - analytics should not break the app
      console.debug('Analytics tracking failed:', error);
    }
  }, [getDeviceInfo]);

  const trackPageView = useCallback((pagePath?: string) => {
    const path = pagePath || window.location.pathname;
    
    // Prevent duplicate page views
    if (lastPageView.current === path) return;
    lastPageView.current = path;

    trackEvent({
      eventType: 'page_view',
      eventName: 'page_view',
      pagePath: path,
    });
  }, [trackEvent]);

  const trackExerciseStart = useCallback((exerciseId: string, exerciseTitle: string) => {
    trackEvent({
      eventType: 'exercise_start',
      eventName: 'exercise_start',
      properties: { exerciseId, exerciseTitle },
    });
  }, [trackEvent]);

  const trackExerciseComplete = useCallback((
    exerciseId: string,
    exerciseTitle: string,
    score: number,
    passed: boolean
  ) => {
    trackEvent({
      eventType: 'exercise_complete',
      eventName: 'exercise_complete',
      properties: { exerciseId, exerciseTitle, score, passed },
    });
  }, [trackEvent]);

  const trackLessonJoin = useCallback((lessonId: string, lessonTitle: string) => {
    trackEvent({
      eventType: 'lesson_join',
      eventName: 'lesson_join',
      properties: { lessonId, lessonTitle },
    });
  }, [trackEvent]);

  const trackVideoPlay = useCallback((videoId: string, videoTitle: string) => {
    trackEvent({
      eventType: 'video_play',
      eventName: 'video_play',
      properties: { videoId, videoTitle },
    });
  }, [trackEvent]);

  const trackFeatureUse = useCallback((featureName: string, properties?: Record<string, unknown>) => {
    trackEvent({
      eventType: 'feature_use',
      eventName: featureName,
      properties,
    });
  }, [trackEvent]);

  const trackSearch = useCallback((query: string, resultsCount: number) => {
    trackEvent({
      eventType: 'search',
      eventName: 'search',
      properties: { query, resultsCount },
    });
  }, [trackEvent]);

  const trackError = useCallback((errorName: string, errorMessage: string, errorStack?: string) => {
    trackEvent({
      eventType: 'error',
      eventName: errorName,
      properties: { errorMessage, errorStack },
    });
  }, [trackEvent]);

  // Track page views on route changes
  useEffect(() => {
    trackPageView();
  }, [trackPageView]);

  return {
    trackEvent,
    trackPageView,
    trackExerciseStart,
    trackExerciseComplete,
    trackLessonJoin,
    trackVideoPlay,
    trackFeatureUse,
    trackSearch,
    trackError,
  };
}
