import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  Pressable,
  Platform,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { colors, typography, shapes, spacing } from '@/theme/tokens';
import { EmbedType, MediaType } from '@/types';

interface DocumentViewerProps {
  url: string;
  mediaType: MediaType;
  embedType?: EmbedType;
  displayName?: string;
  allowDownload?: boolean;
  watermark?: string;
}

export const DocumentViewer: React.FC<DocumentViewerProps> = ({
  url,
  mediaType,
  embedType,
  displayName,
  allowDownload,
  watermark,
}) => {
  const isImage = mediaType === 'image';
  const isPdf = mediaType === 'pdf';

  if (isImage) {
    return (
      <View style={styles.imageViewerWrapper}>
        <Image source={{ uri: url }} style={styles.imageView} resizeMode="contain" />
        {watermark && (
          <View style={styles.watermarkOverlay} pointerEvents="none">
            <Text style={styles.watermarkText}>{watermark}</Text>
          </View>
        )}
      </View>
    );
  }

  if (isPdf && Platform.OS === 'web') {
    const pdfEmbedUrl = embedType === 'gdrive'
      ? url
      : `https://docs.google.com/viewer?url=${encodeURIComponent(url)}&embedded=true`;
    return (
      <iframe
        src={pdfEmbedUrl}
        style={styles.pdfIframe as any}
        title={displayName || 'Documento'}
      />
    );
  }

  return (
    <View style={styles.fallbackCard}>
      <MaterialCommunityIcons
        name={
          isPdf
            ? 'file-pdf-box'
            : mediaType === 'document'
            ? 'file-document-outline'
            : mediaType === 'audio'
            ? 'music'
            : 'file-outline'
        }
        size={64}
        color={colors.primary}
      />
      {displayName && (
        <Text style={styles.fallbackName} numberOfLines={2}>{displayName}</Text>
      )}
      {allowDownload ? (
        <Pressable
          style={styles.downloadBtn}
          onPress={() => { if (Platform.OS === 'web') window.open(url, '_blank'); }}
        >
          <MaterialCommunityIcons name="download" size={18} color={colors.onPrimary} />
          <Text style={styles.downloadBtnText}>Descargar Archivo</Text>
        </Pressable>
      ) : (
        <Text style={styles.downloadDisabledText}>
          La descarga de este archivo está desactivada.
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  imageViewerWrapper: {
    width: '100%',
    aspectRatio: 16 / 9,
    position: 'relative',
    backgroundColor: '#111',
    alignItems: 'center',
    justifyContent: 'center',
  },
  imageView: {
    width: '100%',
    height: '100%',
  },
  watermarkOverlay: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  watermarkText: {
    ...typography.displayMedium,
    color: 'rgba(255,255,255,0.06)',
    fontWeight: '900',
    letterSpacing: 4,
    transform: [{ rotate: '-25deg' }],
  },
  pdfIframe: {
    width: '100%',
    height: 600,
    borderWidth: 0,
    borderRadius: shapes.medium,
  },
  fallbackCard: {
    padding: spacing['2xl'],
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.base,
    width: '100%',
  },
  fallbackName: {
    ...typography.titleMedium,
    color: colors.onSurface,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  downloadBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.primary,
    borderRadius: shapes.full,
    paddingHorizontal: spacing.lg,
    height: 40,
    marginTop: spacing.base,
  },
  downloadBtnText: {
    ...typography.labelLarge,
    color: colors.onPrimary,
    fontWeight: 'bold',
  },
  downloadDisabledText: {
    ...typography.bodySmall,
    color: colors.error,
    marginTop: spacing.base,
  },
});
