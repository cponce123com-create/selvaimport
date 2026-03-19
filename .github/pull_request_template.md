# Pull Request

## Descripción
<!-- Describe brevemente qué cambios introduce este PR y por qué -->

## Tipo de cambio
- [ ] 🐛 Bug fix
- [ ] ✨ Nueva funcionalidad
- [ ] ♻️ Refactor (sin cambios funcionales)
- [ ] 🚀 Mejora de rendimiento
- [ ] 📝 Documentación
- [ ] 🔧 Configuración / infraestructura

---

## Checklist de revisión — selvaimport
> Marca cada punto antes de solicitar review. Los ítems **críticos** deben estar completos para aprobar el merge.

### TypeScript
- [ ] No hay uso de `any` sin justificación — usar `unknown` + type guard
- [ ] **[crítico]** Interfaces de Zod y tipos de Drizzle están sincronizados en `shared/`
- [ ] Props de componentes tienen tipos explícitos (no inferidos)
- [ ] Funciones `async` tienen tipo de retorno `Promise<T>` explícito

### React / UI
- [ ] Hooks personalizados extraídos a `/hooks`, no embebidos en componentes
- [ ] **[crítico]** Queries de React Query tienen `queryKey` consistente (usar constantes)
- [ ] **[crítico]** No hay fetches directos con `fetch()` en componentes — todo vía React Query
- [ ] Formularios usan `react-hook-form` + `zodResolver`
- [ ] Estados de carga (`isLoading`) y error (`isError`) manejados en UI

### API / Server
- [ ] **[crítico]** Todas las rutas validan el body con Zod antes de procesar
- [ ] Errores de Zod transformados con `zod-validation-error` para mensajes legibles
- [ ] Rutas usan códigos HTTP correctos (201, 404, 422...)
- [ ] **[crítico]** Sin credenciales ni secrets hardcodeados — verificar `.env.example`

### Base de datos
- [ ] Queries de Drizzle usan `where()` sobre columnas indexadas
- [ ] **[crítico]** Sin N+1 queries en listados — usar joins o batch queries
- [ ] **[crítico]** Mutaciones con múltiples writes usan `db.transaction()`

### Rendimiento
- [ ] Imágenes de productos pasan por `sharp` antes de subir a Cloudinary
- [ ] Componentes pesados (editor Tiptap, páginas admin) usan `React.lazy` + `Suspense`
- [ ] **[crítico]** Endpoints de listados tienen paginación (`limit` / `offset` o cursor)
- [ ] Endpoints frecuentes tienen caché (`Cache-Control` o `memorystore`)

---

## Screenshots / evidencia
<!-- Si hay cambios visuales, agrega capturas de pantalla -->

## Notas para el reviewer
<!-- Algo que el reviewer deba saber: decisiones de diseño, áreas de incertidumbre, etc. -->
