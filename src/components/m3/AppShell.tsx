// ═══════════════════════════════════════════════════════
// Encuadre Prod. — AppShell (Componente MD3)
// ═══════════════════════════════════════════════════════

import React from 'react';
import { View, StyleSheet, SafeAreaView, ScrollView } from 'react-native';
import { colors, layout } from '@/theme/tokens';
import { useResponsive } from '@/hooks/useResponsive';
import { NavigationItem } from '@/types';
import { TopBar } from './TopBar';
import { NavigationRail } from './NavigationRail';
import { BottomNavigation } from './BottomNavigation';
import { BrandBackground } from '@/components/brand/BrandBackground';
import { useRouter, usePathname } from 'expo-router';

interface AppShellProps {
  title?: string;
  showBack?: boolean;
  onBackPress?: () => void;
  rightActions?: React.ReactNode;
  children: React.ReactNode;
  /** Fondo de marca: `brand` (portada/inicio), `quiet` (por defecto, atenuado) o `plain` (#060608 liso) */
  background?: 'brand' | 'quiet' | 'plain';
}

export const AppShell: React.FC<AppShellProps> = ({
  title,
  showBack = false,
  onBackPress,
  rightActions,
  children,
  background = 'quiet',
}) => {
  const responsive = useResponsive();
  const router = useRouter();
  const pathname = usePathname();

  // Definir items de navegación principales del administrador
  const navItems: NavigationItem[] = [
    { key: 'dashboard', label: 'Inicio', icon: 'view-dashboard-outline', activeIcon: 'view-dashboard' },
    { key: 'projects', label: 'Proyectos', icon: 'folder-outline', activeIcon: 'folder' },
    { key: 'contacts', label: 'Contactos', icon: 'card-account-phone-outline', activeIcon: 'card-account-phone' },
    { key: 'templates', label: 'Plantillas', icon: 'animation-outline', activeIcon: 'animation' },
  ];

  // Determinar pestaña activa en base a la ruta
  const getActiveKey = (): string => {
    if (pathname.includes('/projects')) return 'projects';
    if (pathname.includes('/contacts')) return 'contacts';
    if (pathname.includes('/templates')) return 'templates';
    return 'dashboard';
  };

  const activeKey = getActiveKey();

  const handleNavSelect = (key: string) => {
    if (key === 'dashboard') {
      router.push('/');
    } else if (key === 'projects') {
      router.push('/projects');
    } else if (key === 'contacts') {
      router.push('/contacts' as any);
    } else if (key === 'templates') {
      router.push('/templates');
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={[styles.container, background === 'plain' && styles.plain]}>
        {background !== 'plain' && <BrandBackground variant={background === 'brand' ? 'default' : 'quiet'} />}
        {/* TopBar en la cabecera */}
        <TopBar
          title={title}
          showBack={showBack}
          onBackPress={onBackPress}
          rightActions={rightActions}
        />

        <View style={styles.body}>
          {/* Menu Lateral (Navigation Rail) para Desktop/Tablet */}
          {responsive.showRail && (
            <NavigationRail
              items={navItems}
              activeKey={activeKey}
              onSelect={handleNavSelect}
            />
          )}

          {/* Área de Contenido Principal */}
          <ScrollView
            style={styles.content}
            contentContainerStyle={[
              styles.contentContainer,
              // Centrar el contenido y limitar el ancho máximo en pantallas grandes (MD3 Large breakpoint)
              responsive.isDesktop && {
                alignSelf: 'center',
                width: '100%',
                maxWidth: layout.contentMaxWidth,
              } as any,
            ]}
          >
            {children}
          </ScrollView>
        </View>

        {/* Barra de Navegación Inferior (BottomNav) para Móvil */}
        {responsive.showBottomNav && (
          <BottomNavigation
            items={navItems}
            activeKey={activeKey}
            onSelect={handleNavSelect}
          />
        )}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  container: {
    flex: 1,
    flexDirection: 'column',
    backgroundColor: colors.background,
    position: 'relative',
  },
  plain: {
    backgroundColor: colors.surface,
  },
  body: {
    flex: 1,
    flexDirection: 'row',
    overflow: 'hidden',
  },
  content: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  contentContainer: {
    padding: 24,
    minHeight: '100%',
  },
});
