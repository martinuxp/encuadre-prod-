import React, { useRef, useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Platform,
  ViewStyle,
  Animated,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { colors, typography, shapes, spacing } from '@/theme/tokens';
import { EmbedType, VideoQuality } from '@/types';
import { toEmbedUrl } from '@/services/firebase/mediaShareService';
import { ease, duration as animDuration } from '@/theme/animation';

interface VideoPlayerProps {
  url: string;
  embedType: EmbedType;
  displayName?: string;
  allowDownload?: boolean;
  watermark?: string;
  qualityLowUrl?: string;
  style?: ViewStyle;
}

export const VideoPlayer: React.FC<VideoPlayerProps> = ({
  url,
  embedType,
  displayName,
  allowDownload,
  watermark,
  qualityLowUrl,
  style,
}) => {
  const videoRef = useRef<any>(null);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [showControls, setShowControls] = useState(true);
  const [fullscreen, setFullscreen] = useState(false);
  const [quality, setQuality] = useState<VideoQuality>('original');
  const [showQualityMenu, setShowQualityMenu] = useState(false);
  const [volume, setVolume] = useState(1);
  const [buffering, setBuffering] = useState(false);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingSeek = useRef<{ time: number; play: boolean } | null>(null);
  const [videoKey, setVideoKey] = useState(0);

  const playScale = useRef(new Animated.Value(0.6)).current;
  useEffect(() => {
    Animated.timing(playScale, {
      toValue: !playing && !buffering ? 1 : 0.6,
      duration: animDuration.medium3,
      easing: ease.spring,
      useNativeDriver: true,
    }).start();
  }, [playing, buffering]);

  const controlsOpacity = useRef(new Animated.Value(0)).current;
  const controlsTranslate = useRef(new Animated.Value(12)).current;
  useEffect(() => {
    Animated.parallel([
      Animated.timing(controlsOpacity, {
        toValue: showControls ? 1 : 0,
        duration: animDuration.short4,
        easing: ease.standardDecelerate,
        useNativeDriver: true,
      }),
      Animated.timing(controlsTranslate, {
        toValue: showControls ? 0 : 12,
        duration: animDuration.short4,
        easing: ease.standardDecelerate,
        useNativeDriver: true,
      }),
    ]).start();
  }, [showControls]);

  const qualityOpacity = useRef(new Animated.Value(0)).current;
  const qualityScale = useRef(new Animated.Value(0.92)).current;
  useEffect(() => {
    Animated.parallel([
      Animated.timing(qualityOpacity, {
        toValue: showQualityMenu ? 1 : 0,
        duration: animDuration.short4,
        easing: ease.standardDecelerate,
        useNativeDriver: true,
      }),
      Animated.timing(qualityScale, {
        toValue: showQualityMenu ? 1 : 0.92,
        duration: animDuration.short4,
        easing: ease.spring,
        useNativeDriver: true,
      }),
    ]).start();
  }, [showQualityMenu]);

  const useControlsFade = () => ({ opacity: controlsOpacity, translateY: controlsTranslate });
  const useQualityFade = () => ({ opacity: qualityOpacity, scale: qualityScale });

  const embedUrl = toEmbedUrl(url, embedType);
  const isEmbed = embedType === 'youtube' || embedType === 'vimeo' || embedType === 'gdrive';
  const isDirect = embedType === 'direct' || (embedType === 'other' && url.match(/\.(mp4|webm|ogg|mov)/i));
  const hasQualityToggle = !!qualityLowUrl && isDirect;

  const currentUrl = quality === 'low' && qualityLowUrl ? qualityLowUrl : url;

  const resetHideTimer = useCallback(() => {
    if (hideTimer.current) clearTimeout(hideTimer.current);
    setShowControls(true);
    setShowQualityMenu(false);
    hideTimer.current = setTimeout(() => {
      if (playing) setShowControls(false);
    }, 3000);
  }, [playing]);

  useEffect(() => {
    return () => { if (hideTimer.current) clearTimeout(hideTimer.current); };
  }, []);

  const handlePlayPause = () => {
    if (!videoRef.current || !isDirect) return;
    if (playing) {
      videoRef.current.pause?.();
    } else {
      videoRef.current.play?.();
    }
    setPlaying(!playing);
    resetHideTimer();
  };

  const handleSeek = (e: any) => {
    if (!videoRef.current || !isDirect) return;
    const rect = e.currentTarget?.getBoundingClientRect?.();
    if (!rect) return;
    const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    videoRef.current.currentTime = pct * duration;
    setCurrentTime(pct * duration);
  };

  const handleVolumeChange = (e: any) => {
    if (!videoRef.current || !isDirect) return;
    const rect = e.currentTarget?.getBoundingClientRect?.();
    if (!rect) return;
    const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    setVolume(pct);
    videoRef.current.volume = pct;
    setMuted(pct === 0);
  };

  const handleQualitySwitch = (q: VideoQuality) => {
    if (!videoRef.current || !isDirect) return;
    pendingSeek.current = { time: videoRef.current.currentTime, play: playing };
    setVideoKey(prev => prev + 1);
    setQuality(q);
    setShowQualityMenu(false);
    setCurrentTime(0);
    setDuration(0);
    setBuffering(true);
  };

  const formatTime = (s: number) => {
    if (isNaN(s) || s === Infinity) return '0:00';
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  const toggleFullscreen = () => {
    if (Platform.OS === 'web') {
      if (!fullscreen) {
        document.documentElement.requestFullscreen?.();
      } else {
        document.exitFullscreen?.();
      }
    }
    setFullscreen(!fullscreen);
  };

  useEffect(() => {
    const onFsChange = () => setFullscreen(!!document.fullscreenElement);
    if (Platform.OS === 'web') {
      document.addEventListener('fullscreenchange', onFsChange);
      return () => document.removeEventListener('fullscreenchange', onFsChange);
    }
  }, []);

  if (isEmbed) {
    return (
      <View style={[styles.wrapper, style]}>
        <View style={styles.embedGradient}>
          {watermark && (
            <View style={styles.watermarkOverlay} pointerEvents="none">
              <Text style={styles.watermarkText}>{watermark}</Text>
            </View>
          )}
        </View>
        {Platform.OS === 'web' ? (
          <iframe
            src={embedUrl}
            style={{
              width: '100%',
              height: '100%',
              border: 'none',
            } as any}
            allow="autoplay; fullscreen; picture-in-picture"
            allowFullScreen
            title={displayName || 'Video Encuadre'}
          />
        ) : (
          <View style={styles.unsupportedContainer}>
            <MaterialCommunityIcons name="play-circle-outline" size={48} color={colors.primary} />
            <Text style={styles.unsupportedText}>
              Abre este link en tu navegador para ver el video.
            </Text>
          </View>
        )}
        {displayName && (
          <View style={styles.captionBar}>
            <MaterialCommunityIcons name="play-box-multiple-outline" size={14} color="#fff" />
            <Text style={styles.captionText} numberOfLines={1}>{displayName}</Text>
          </View>
        )}
      </View>
    );
  }

  if (isDirect && Platform.OS === 'web') {
    return (
      <View style={[styles.wrapper, fullscreen && styles.fullscreen, style]}>
        <Pressable
          style={styles.videoArea}
          onPress={handlePlayPause}
          {...({ onMouseMove: resetHideTimer } as any)}
        >
          <video
            key={videoKey}
            ref={videoRef}
            src={currentUrl}
            muted={muted}
            playsInline
            preload="metadata"
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'contain',
              backgroundColor: '#000',
              display: 'block',
            } as any}
            onPlay={() => setPlaying(true)}
            onPause={() => setPlaying(false)}
            onTimeUpdate={(e: any) => setCurrentTime(e.target.currentTime)}
            onLoadedMetadata={(e: any) => {
              setDuration(e.target.duration);
              setBuffering(false);
              // Apply pending seek after quality switch
              if (pendingSeek.current) {
                const seek = pendingSeek.current;
                pendingSeek.current = null;
                try { e.target.currentTime = Math.min(seek.time, e.target.duration || 0); } catch (_) {}
                if (seek.play) { try { e.target.play(); } catch (_) {} }
              }
            }}
            onEnded={() => setPlaying(false)}
            onWaiting={() => setBuffering(true)}
            onCanPlay={() => setBuffering(false)}
            onError={(e: any) => {
              setBuffering(false);
              // MEDIA_ERR_ABORTED (code 1) is normal when src changes — ignore
              if (e?.target?.error?.code === 1) return;
            }}
          />

          {watermark && (
            <View style={styles.watermarkOverlay} pointerEvents="none">
              <Text style={styles.watermarkText}>{watermark}</Text>
            </View>
          )}

          {buffering && (
            <View style={styles.bufferingOverlay} pointerEvents="none">
              <View style={styles.bufferingSpinner}>
                <MaterialCommunityIcons name="loading" size={40} color="#fff" />
              </View>
            </View>
          )}

          {!playing && !buffering && (
            <View style={styles.bigPlayContainer} pointerEvents="none">
              <Animated.View
                style={[
                  styles.bigPlayButton,
                  { transform: [{ scale: playScale }] },
                ]}
              >
                <MaterialCommunityIcons name="play" size={44} color="#000" />
              </Animated.View>
            </View>
          )}
        </Pressable>

        {/* Controls Bar */}
        {showControls && (
          <Animated.View
            style={[
              styles.controls,
              {
                opacity: useControlsFade().opacity,
                transform: [{ translateY: useControlsFade().translateY }],
              },
            ]}
          >
            {/* Scrubber */}
            <Pressable style={styles.scrubber} onPress={handleSeek}>
              <View style={styles.scrubberTrack}>
                <View style={[styles.scrubberFill, { width: `${progress}%` as any }]} />
                <View style={[styles.scrubberThumb, { left: `${progress}%` as any }]} />
              </View>
            </Pressable>

            <View style={styles.controlsRow}>
              <Pressable style={styles.controlBtn} onPress={handlePlayPause}>
                <MaterialCommunityIcons
                  name={playing ? 'pause' : 'play'}
                  size={22}
                  color="#fff"
                />
              </Pressable>

              <Pressable style={styles.controlBtn} onPress={() => {
                setMuted(!muted);
                if (videoRef.current) videoRef.current.muted = !muted;
              }}>
                <MaterialCommunityIcons
                  name={muted ? 'volume-off' : volume < 0.5 ? 'volume-medium' : 'volume-high'}
                  size={20}
                  color="#fff"
                />
              </Pressable>

              <Text style={styles.timeText}>
                {formatTime(currentTime)} / {formatTime(duration)}
              </Text>

              {/* Quality Selector */}
              {hasQualityToggle && (
                <View style={styles.qualityWrapper}>
                  <Pressable
                    style={styles.qualityBtn}
                    onPress={() => setShowQualityMenu(!showQualityMenu)}
                  >
                    <MaterialCommunityIcons name="cog-outline" size={16} color="#fff" />
                    <Text style={styles.qualityBtnText}>
                      {quality === 'original' ? 'HD' : 'SD'}
                    </Text>
                  </Pressable>
                  {showQualityMenu && (
                    <Animated.View style={[styles.qualityMenu, { opacity: useQualityFade().opacity, transform: [{ scale: useQualityFade().scale }] }]}>
                      <Pressable
                        style={[styles.qualityOption, quality === 'original' && styles.qualityOptionActive]}
                        onPress={() => handleQualitySwitch('original')}
                      >
                        <MaterialCommunityIcons
                          name={quality === 'original' ? 'check-circle' : 'circle-outline'}
                          size={14}
                          color={quality === 'original' ? colors.primary : '#fff'}
                        />
                        <Text style={[styles.qualityOptionText, quality === 'original' && styles.qualityOptionTextActive]}>
                          Original (HD)
                        </Text>
                      </Pressable>
                      <Pressable
                        style={[styles.qualityOption, quality === 'low' && styles.qualityOptionActive]}
                        onPress={() => handleQualitySwitch('low')}
                      >
                        <MaterialCommunityIcons
                          name={quality === 'low' ? 'check-circle' : 'circle-outline'}
                          size={14}
                          color={quality === 'low' ? colors.primary : '#fff'}
                        />
                        <Text style={[styles.qualityOptionText, quality === 'low' && styles.qualityOptionTextActive]}>
                          Baja (SD)
                        </Text>
                      </Pressable>
                    </Animated.View>
                  )}
                </View>
              )}

              {allowDownload && (
                <Pressable
                  style={styles.controlBtn}
                  onPress={() => { if (Platform.OS === 'web') window.open(currentUrl, '_blank'); }}
                >
                  <MaterialCommunityIcons name="download" size={20} color="#fff" />
                </Pressable>
              )}

              <Pressable style={styles.controlBtn} onPress={toggleFullscreen}>
                <MaterialCommunityIcons
                  name={fullscreen ? 'fullscreen-exit' : 'fullscreen'}
                  size={20}
                  color="#fff"
                />
              </Pressable>
            </View>
          </Animated.View>
        )}

        {displayName && (
          <View style={styles.captionBar}>
            <MaterialCommunityIcons name="play-box-multiple-outline" size={14} color="#fff" />
            <Text style={styles.captionText} numberOfLines={1}>{displayName}</Text>
          </View>
        )}
      </View>
    );
  }

  return (
    <View style={[styles.wrapper, styles.unsupportedContainer, style]}>
      <MaterialCommunityIcons name="video-off-outline" size={48} color={colors.onSurfaceVariant} />
      <Text style={styles.unsupportedText}>Formato de video no soportado en esta plataforma.</Text>
      {allowDownload && (
        <Pressable
          style={styles.downloadFallback}
          onPress={() => { if (Platform.OS === 'web') window.open(url, '_blank'); }}
        >
          <MaterialCommunityIcons name="download" size={18} color="#fff" />
          <Text style={styles.downloadFallbackText}>Descargar archivo</Text>
        </Pressable>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    width: '100%',
    aspectRatio: 16 / 9,
    backgroundColor: '#000',
    overflow: 'hidden',
    position: 'relative',
  },
  fullscreen: {
    position: 'fixed' as any,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 9999,
    borderRadius: 0,
    aspectRatio: undefined,
    height: '100vh' as any,
  },
  videoArea: {
    flex: 1,
    position: 'relative',
  },
  embedGradient: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.3)',
    pointerEvents: 'none',
  },
  bigPlayContainer: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bigPlayButton: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(255,255,255,0.9)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  watermarkOverlay: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    pointerEvents: 'none',
  },
  watermarkText: {
    ...typography.displaySmall,
    color: 'rgba(255,255,255,0.08)',
    textTransform: 'uppercase',
    letterSpacing: 8,
    fontWeight: '900',
    transform: [{ rotate: '-30deg' }],
  },
  bufferingOverlay: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  bufferingSpinner: {},
  controls: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundImage: 'linear-gradient(transparent, rgba(0,0,0,0.85))',
    paddingHorizontal: spacing.base,
    paddingTop: spacing.xl,
    paddingBottom: spacing.sm,
    gap: spacing.xs,
  },
  controlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  scrubber: {
    height: 28,
    justifyContent: 'center',
    cursor: 'pointer' as any,
  },
  scrubberTrack: {
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.25)',
    borderRadius: 2,
    position: 'relative',
  },
  scrubberFill: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    backgroundColor: 'colors.primary',
    borderRadius: 2,
  },
  scrubberThumb: {
    position: 'absolute',
    top: -5,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: 'colors.primary',
    marginLeft: -7,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.4,
    shadowRadius: 2,
  },
  controlBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  timeText: {
    ...typography.bodySmall,
    color: 'rgba(255,255,255,0.85)',
    fontVariant: ['tabular-nums'],
    marginRight: spacing.sm,
  },
  qualityWrapper: {
    position: 'relative',
  },
  qualityBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.sm,
    height: 28,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  qualityBtnText: {
    ...typography.labelSmall,
    color: '#fff',
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  qualityMenu: {
    position: 'absolute',
    bottom: 36,
    right: 0,
    backgroundColor: 'rgba(20,20,25,0.95)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    padding: 4,
    minWidth: 160,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 12,
  },
  qualityOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.sm,
    borderRadius: 6,
  },
  qualityOptionActive: {
    backgroundColor: 'rgba(197, 192, 255, 0.15)',
  },
  qualityOptionText: {
    ...typography.bodyMedium,
    color: 'rgba(255,255,255,0.7)',
  },
  qualityOptionTextActive: {
    color: '#fff',
    fontWeight: '600',
  },
  captionBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundImage: 'linear-gradient(rgba(0,0,0,0.7), transparent)',
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.sm,
  },
  captionText: {
    ...typography.labelMedium,
    color: 'rgba(255,255,255,0.9)',
    flex: 1,
  },
  unsupportedContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.base,
    padding: spacing.xl,
  },
  unsupportedText: {
    ...typography.bodyMedium,
    color: colors.onSurfaceVariant,
    textAlign: 'center',
  },
  downloadFallback: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: 'colors.primary',
    borderRadius: 9999,
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.sm,
  },
  downloadFallbackText: {
    ...typography.labelLarge,
    color: '#fff',
    fontWeight: 'bold',
  },
});
