---
name: Encuadre Prod. — Portal de producción
colors:
  black: "#000000"
  page: "#060608"
  night: "#141A2E"
  wine: "#861634"
  ink: "#FFFFFF"
  muted: "rgba(255, 255, 255, 0.7)"
  placeholder: "rgba(255, 255, 255, 0.55)"
  surface-low: "rgba(255, 255, 255, 0.05)"
  surface-hover: "rgba(255, 255, 255, 0.12)"
  surface-container: "#111114"
  surface-container-high: "#18181C"
  surface-container-highest: "#222227"
  line: "rgba(255, 255, 255, 0.25)"
  line-soft: "rgba(255, 255, 255, 0.12)"
  glass: "rgba(10, 10, 14, 0.82)"
  error: "#FFB3C0"
  error-container: "#5C0F22"
  success: "rgb(129, 199, 132)"
  warning: "rgb(255, 213, 79)"
typography:
  display:
    fontFamily: "Google Sans Flex"
    fontSize: 45px
    fontWeight: 900
    lineHeight: 48px
    letterSpacing: -1.8px
  headline:
    fontFamily: "Google Sans Flex"
    fontSize: 28px
    fontWeight: 800
    lineHeight: 32px
    letterSpacing: -0.9px
  title:
    fontFamily: "Google Sans Flex"
    fontSize: 22px
    fontWeight: 700
    lineHeight: 26px
    letterSpacing: -0.5px
  body:
    fontFamily: "Google Sans Flex"
    fontSize: 14px
    fontWeight: 400
    lineHeight: 20px
  label:
    fontFamily: "Google Sans Flex"
    fontSize: 12px
    fontWeight: 700
    lineHeight: 16px
    letterSpacing: 0.2px
rounded:
  base: 10px
  chip-corner: 20px
  button-corner: 24px
  signature: 30px
  hero: 40px
spacing:
  xs: 4px
  sm: 8px
  md: 12px
  base: 16px
  lg: 24px
  xl: 32px
  2xl: 48px
components:
  button-primary:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.black}"
    typography: "{typography.label}"
    rounded: "{rounded.base}"
    height: 44px
  button-outlined:
    backgroundColor: transparent
    textColor: "{colors.ink}"
    rounded: "{rounded.base}"
    height: 44px
  button-tonal:
    backgroundColor: "rgba(255, 255, 255, 0.08)"
    textColor: "{colors.ink}"
    rounded: "{rounded.base}"
    height: 44px
  card:
    backgroundColor: "{colors.surface-low}"
    rounded: "{rounded.base}"
    padding: 24px
  chip:
    backgroundColor: "rgba(255, 255, 255, 0.08)"
    textColor: "{colors.muted}"
    rounded: "{rounded.base}"
    height: 26px
  filter-selected:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.black}"
    rounded: "{rounded.base}"
    height: 44px
  input:
    backgroundColor: "rgba(255, 255, 255, 0.05)"
    textColor: "{colors.ink}"
    rounded: "{rounded.base}"
    height: 48px
---

# Design System: Encuadre Prod. — Portal de producción

## Overview

**Creative North Star: "La sala antes de la función".** El portal es la trastienda de Grupo Encuadre: negro de sala, luz blanca de proyector y el resplandor noche/vino del brandbook. Es una herramienta de trabajo diario, así que la identidad vive en el fondo de marca, la tipografía pesada, la esquina de firma y el movimiento, no en la decoración. La densidad y la legibilidad mandan en listas y formularios.

Fuentes de verdad: `src/theme/tokens.ts` (tokens normativos), `src/global.css` (capa web: fondo, foco, movimiento), `src/components/brand/` (piezas de marca) y la guía de la web pública (`Encuadre_web_new/docs/GUIA-DISENO-ENCUADRE.md`). El panel usa **solo Google Sans Flex**: Playfair Display es de la web pública, no del panel.

Anti-referencias: el morado MD3 anterior (`#C5C0FF`), las píldoras redondas y las curvas con rebote. Si aparecen, es deuda, no estilo.

## Colors

### Primary
- **Blanco proyector** (#FFFFFF): texto principal, botón principal, filtro y pestaña activos, ícono activo de la navegación y anillo de foco. Es el único acento de interacción del panel institucional.

### Secondary
- **Vino Encuadre** (#861634): acento institucional y mancha del fondo de marca (abajo a la derecha). Úsalo en contenedores secundarios, nunca como texto sobre negro.

### Tertiary
- **Noche** (#141A2E): mancha del fondo de marca (arriba a la izquierda) y contenedores terciarios.

### Neutral
- **Negro sala** (#000000): fondo base, login e inicio.
- **Página** (#060608): fondo liso de formularios, listas y detalle (`background="plain"`, el valor por defecto de `AppShell`).
- **Superficie baja** (rgba 255/0.05): tarjetas y secciones; deja ver el fondo.
- **Contenedores opacos** (#111114 / #18181C / #222227): diálogos y modales, que no pueden ser translúcidos.
- **Texto suave** (rgba 255/0.7): texto secundario (~9,7:1 sobre negro).
- **Placeholder** (rgba 255/0.55): texto de ejemplo en campos (≥4,5:1).
- **Líneas** (rgba 255/0.12–0.30): bordes de 1,5–2 px.

### Named Rules
**Regla croma-adaptativa.** Lo que pertenece a un proyecto se tiñe con `project.web.colors` (`bg`, `ink`, `accent`, `soft`): tarjeta de proyecto, cabecera del detalle, chips y botones dentro de esa vista (prop `tint` de `ActionButton`, `ink` de `StatusChip`). Todo lo demás queda institucional. El texto sobre color siempre es `#FFFFFF` o `#000000` según el contraste (mínimo 4,5:1).

**Regla del error rosa.** Los errores usan #FFB3C0 sobre fondos oscuros, nunca rojo saturado.

## Typography

**Familia:** Google Sans Flex (300–1000), cargada en web desde `src/app/+html.tsx`. En nativo se usa la fuente del sistema.

**Carácter:** pesos altos y tracking negativo en títulos; cuerpo en 400 sin tracking.

### Hierarchy
- **Display** (900, 36–57 px, 40–60 px): saludo del inicio y cifras grandes.
- **Headline** (800–900, 24–32 px): nombre del proyecto, títulos de formulario y tarjetas.
- **Title** (700, 14–22 px): títulos de sección (`SectionCard`) y de lista.
- **Body** (400, 12–16 px, 16–24 px): texto general.
- **Label** (700, 11–14 px): botones, chips y etiquetas; las de campo van en MAYÚSCULAS, 12 px, tracking 1 y opacidad 0,6.

### Named Rules
**Encabezado de sección "01 | Título"** (`SectionHeader`): número 900 + línea vertical blanca de 2 px + título 900. Solo cuando el orden aporta información (inicio, listado); no en cada bloque.

## Layout

Contenido centrado con máximo de 1200 px en escritorio, padding de 24 px. Riel de navegación a la izquierda desde 600 px y barra inferior en móvil (`useResponsive`). Grillas con `flexWrap` y `minWidth` (tarjetas de proyecto ≥ 280–300 px). Espaciado en escala de 4/8 (`spacing`). El login separa portada y formulario desde 900 px y lo centra todo por debajo.

## Elevation & Depth

Plano y por capas tonales: no hay sombras de elevación. La profundidad viene del fondo de marca, de superficies translúcidas y del vidrio en la barra superior y el formulario de login (`backdrop-filter: blur(14–16px)` sobre `glass`).

### Named Rules
**Fondo con propósito.** `BrandBackground` (manchas noche/vino animadas 22 s + grano `soft-light` dentro del fondo, nunca encima del contenido) solo en login (`withLines`) e inicio (`brand`), y atenuado en el listado de proyectos (`quiet`). El resto usa `plain`.

## Shapes

Radio base de 10 px con **una sola esquina grande por bloque** (la firma del brandbook), definida en `corners` de `tokens.ts`:
- Tarjeta: 10 · arriba-derecha 30 (`corners.card`).
- Primer bloque de un grupo: arriba-izquierda 30 (`corners.lead`); último: abajo-derecha 30 (`corners.tail`).
- Botón: arriba-izquierda 24 (`corners.button`).
- Chip/etiqueta: arriba-derecha 20 (`corners.chip`).
- Pestañas en grupo: la primera con arriba-izquierda 20 y la última con arriba-derecha 20.

Sin píldoras (`shapes.full`) en controles nuevos.

## Components

### Buttons (`ActionButton`)
- **Shape:** 10 px con esquina superior izquierda de 24 px; alto mínimo 44 px.
- **Primary (`filled`):** fondo blanco, texto negro 700. Con `tint`: fondo `ink` del proyecto y texto `bg`.
- **Outlined:** borde blanco de 2 px, transparente.
- **Tonal:** blanco al 8 % con borde de 1,5 px.
- **Text:** sin fondo, para acciones secundarias de cabecera.
- **Accesibilidad:** rol `button`, nombre = etiqueta, estados `disabled` / `busy`.

### Icon buttons (`IconButton`)
`accessibilityLabel` obligatorio. Objetivo táctil mínimo de 44 px aunque el ícono sea chico.

### Chips
- **StatusChip:** 26 px, peso 900, esquina 20; con `ink` se dibuja con borde del color del proyecto.
- **Etiqueta web de la tarjeta:** Subido (sólida) · Privado (con borde) · Borrador (translúcida), según `validateWebDraft`.

### Filters, tabs and navigation
Inactivo: blanco al 8 % con borde al 12 %. Activo: fondo blanco y texto negro 800. Alto mínimo 44 px. Roles: filtros `button` + `selected`, pestañas del proyecto `tab` dentro de `tablist`, navegación `link` + `aria-current`.

### Cards (`ProjectCard`, `SectionCard`, `EmptyState`)
Superficie baja, borde de 1,5 px al 12 %, `corners.card`. La tarjeta de proyecto se tiñe con su paleta web. Los estados vacíos llevan un Encuadrito (Compota, Tofu o Flan) con un rebote breve.

### Inputs (`EncInput`)
Fondo blanco al 5 %, borde de 2 px al 25 %, radio 10 (primer campo con esquina 24 arriba-izquierda; textarea con 30 abajo-derecha). Foco: borde blanco. Etiqueta en MAYÚSCULAS asociada como `accessibilityLabel`. Los formularios antiguos con `TextInput` directo deben migrar a `EncInput`.

### Focus
Anillo blanco de 2 px separado 2 px, con halo negro de 5 px para verse también sobre tarjetas claras (`global.css`).

### Motion
Curva única `cubic-bezier(0.16, 1, 0.3, 1)` (`ease.brand`). Entradas en cascada con `Reveal` (opacidad + y 24 → 0, 800 ms, 70 ms entre elementos). Con "reducir movimiento" (`useReducedMotion`) no hay desplazamientos ni escalas: solo fundidos cortos y cambios de color.

## Do's and Don'ts

- **Do** usar los tokens de `tokens.ts`; no escribir colores sueltos en pantallas.
- **Do** teñir con la paleta del proyecto solo lo que pertenece a ese proyecto.
- **Do** dar nombre accesible a todo control sin texto visible.
- **Don't** volver al morado MD3, a las píldoras ni a las curvas con rebote.
- **Don't** poner el fondo animado en pantallas densas ni el grano encima del contenido.
- **Don't** usar Playfair Display ni otra familia en el panel.
- **Don't** usar caracteres (↑ ↓ →) como íconos: usa `MaterialCommunityIcons` con su nombre accesible.
