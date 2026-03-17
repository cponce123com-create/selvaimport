# Informe de Rendimiento Detallado - SELVA IMPORT
**Fecha:** 17 de marzo de 2026
**Herramienta:** Google Lighthouse 13.0.3
**URL:** [https://selvaimport.onrender.com/](https://selvaimport.onrender.com/)

---

## 1. Resumen de Puntuaciones
Tras la implementación de las optimizaciones (Compresión Gzip, Caché agresiva, Imágenes WebP responsivas y Lazy Loading), se han obtenido los siguientes resultados:

| Categoría | Escritorio (Desktop) | Móvil (Mobile) |
| :--- | :---: | :---: |
| **Rendimiento** | **78/100** | **52/100** |
| **Accesibilidad** | **92/100** | **92/100** |
| **Buenas Prácticas** | **100/100** | **100/100** |
| **SEO** | **91/100** | **91/100** |

---

## 2. Métricas Clave de Rendimiento (Web Vitals)

### Escritorio (Desktop)
*   **First Contentful Paint (FCP):** 0.8 s ✅ (Excelente)
*   **Largest Contentful Paint (LCP):** 2.8 s ⚠️ (Necesita mejora leve)
*   **Speed Index:** 5.4 s ⚠️
*   **Total Blocking Time (TBT):** 110 ms ✅ (Excelente)
*   **Cumulative Layout Shift (CLS):** 0.001 ✅ (Excelente)

### Móvil (Mobile)
*   **First Contentful Paint (FCP):** 2.4 s ⚠️
*   **Largest Contentful Paint (LCP):** 13.6 s ❌ (Crítico)
*   **Speed Index:** 3.6 s ✅
*   **Total Blocking Time (TBT):** 1,250 ms ❌
*   **Cumulative Layout Shift (CLS):** 0.005 ✅

---

## 3. Análisis de Optimizaciones Aplicadas

### ✅ Éxitos Confirmados
1.  **Compresión y Caché**: El servidor ahora sirve recursos con Gzip y políticas de caché `immutable`, lo que ha llevado la puntuación de "Buenas Prácticas" al **100%**.
2.  **Estabilidad Visual (CLS)**: Gracias a la reserva de espacio para imágenes y componentes, el CLS es prácticamente cero, ofreciendo una experiencia de navegación fluida.
3.  **SEO y Accesibilidad**: La estructura semántica y las etiquetas meta aseguran una excelente visibilidad en buscadores.

### ⚠️ Áreas de Oportunidad (Especialmente en Móvil)
1.  **LCP en Móvil (13.6s)**: Aunque se implementó `fetchPriority="high"`, el tiempo de respuesta inicial del servidor de Render (Free Tier) y la carga de scripts de terceros (como Google Identity Services) impactan el renderizado del elemento más grande.
2.  **Tiempo de Bloqueo (TBT)**: La hidratación de React y la inicialización de librerías externas consumen tiempo de CPU en dispositivos móviles menos potentes.

---

## 4. Próximos Pasos Recomendados
1.  **Upgrade de Hosting**: El tiempo de respuesta del servidor (TTFB) es el principal cuello de botella en el plan gratuito de Render.
2.  **Carga Diferida de Scripts**: Mover la carga de Google Identity Services a un evento de interacción del usuario o después de que el LCP se haya completado.
3.  **Pre-renderizado (SSG/SSR)**: Considerar la migración a un framework como Next.js para servir HTML estático y reducir el tiempo de ejecución de JavaScript en el cliente.

---
*Informe generado automáticamente por Manus.*
