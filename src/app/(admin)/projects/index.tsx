// ═══════════════════════════════════════════════════════
// Encuadre Prod. — Listado de Proyectos
// Listado general de proyectos con filtros de estado y búsqueda
// ═══════════════════════════════════════════════════════

import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList } from 'react-native';
import { colors, typography, shapes, spacing } from '@/theme/tokens';
import { AppShell } from '@/components/m3/AppShell';
import { ProjectCard } from '@/components/m3/ProjectCard';
import { SearchField } from '@/components/m3/SearchField';
import { FilterBar, FilterOption } from '@/components/m3/FilterBar';
import { ActionButton } from '@/components/m3/ActionButton';
import { EmptyState } from '@/components/m3/EmptyState';
import { LoadingState } from '@/components/m3/LoadingState';
import { projectService } from '@/services/firebase/projectService';
import { Project, ProjectStatus } from '@/types';
import { useRouter } from 'expo-router';

export default function ProjectsListScreen() {
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>([]);
  const [filteredProjects, setFilteredProjects] = useState<Project[]>([]);
  const [search, setSearch] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [loading, setLoading] = useState(true);

  const fetchProjects = async () => {
    try {
      setLoading(true);
      const allProjects = await projectService.getProjects(true); // Incluir archivados
      setProjects(allProjects);
      setFilteredProjects(allProjects);
    } catch (e) {
      console.error('Error al cargar proyectos:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, []);

  // Aplicar filtros y búsqueda
  useEffect(() => {
    let result = [...projects];

    // Filtro por búsqueda
    if (search.trim() !== '') {
      result = result.filter((p) =>
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        p.description.toLowerCase().includes(search.toLowerCase())
      );
    }

    // Filtro por estado
    if (selectedStatus !== 'all') {
      result = result.filter((p) => p.status === selectedStatus);
    }

    setFilteredProjects(result);
  }, [search, selectedStatus, projects]);

  const filterOptions: FilterOption[] = [
    { key: 'all', label: 'Todos' },
    { key: 'pre_production', label: 'Pre-Prod' },
    { key: 'production', label: 'En Rodaje' },
    { key: 'post_production', label: 'Post-Prod' },
    { key: 'completed', label: 'Finalizado' },
    { key: 'archived', label: 'Archivado' },
  ];

  const handleCreateProject = () => {
    router.push('/projects/new');
  };

  const headerRight = (
    <ActionButton
      label="Nuevo Proyecto"
      variant="filled"
      icon="plus"
      onPress={handleCreateProject}
    />
  );

  return (
    <AppShell title="Proyectos" rightActions={headerRight}>
      <View style={styles.container}>
        {/* Controles de Búsqueda y Filtro */}
        <View style={styles.controls}>
          <SearchField
            value={search}
            onChangeText={setSearch}
            placeholder="Buscar por nombre o descripción..."
            style={styles.search}
          />
          <FilterBar
            options={filterOptions}
            selectedKey={selectedStatus}
            onSelect={setSelectedStatus}
            style={styles.filters}
          />
        </View>

        {/* Listado de Tarjetas */}
        {loading ? (
          <LoadingState message="Cargando listado de proyectos..." />
        ) : filteredProjects.length === 0 ? (
          <EmptyState
            icon="folder-search-outline"
            title="No se encontraron proyectos"
            description="Intenta buscar con otros términos o cambia el filtro de estado."
            actionLabel="Crear Proyecto"
            onActionPress={handleCreateProject}
          />
        ) : (
          <View style={styles.grid}>
            {filteredProjects.map((project) => (
              <ProjectCard
                key={project.id}
                project={project}
                onPress={() => router.push(`/projects/${project.id}`)}
                style={styles.card}
              />
            ))}
          </View>
        )}
      </View>
    </AppShell>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.lg,
  },
  controls: {
    gap: spacing.base,
    backgroundColor: colors.surfaceContainerLow,
    padding: spacing.base,
    borderRadius: shapes.medium,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
  },
  search: {
    flex: 1,
  },
  filters: {
    marginTop: spacing.xs,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.base,
  },
  card: {
    flexBasis: '31%',
    flexGrow: 1,
    minWidth: 300,
  },
});
