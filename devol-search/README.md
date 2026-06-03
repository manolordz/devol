# DEVOL Search

Herramienta interna para buscar artículos de diseñador pre-loved en múltiples tiendas japonesas simultáneamente.

---

## Requisitos

- Python 3.11+
- Node.js 18+

---

## Instalación y arranque

### Backend

```bash
cd devol-search/backend

# Instalar dependencias
pip install -r requirements.txt

# Instalar Chromium para Playwright
playwright install chromium

# Correr el servidor
uvicorn main:app --reload
```

El backend estará disponible en **http://localhost:8000**  
Documentación interactiva de la API: **http://localhost:8000/docs**

---

### Frontend

```bash
cd devol-search/frontend

# Instalar dependencias
npm install

# Correr en modo desarrollo
npm run dev
```

El frontend estará disponible en **http://localhost:5173**

---

## Uso

### Buscar artículos
1. Abre http://localhost:5173
2. Llena los campos que apliquen (todos son opcionales)
3. Selecciona las tiendas donde quieres buscar
4. Haz clic en **Buscar**
5. Los resultados se separan en **Exactos** y **Similares**
6. Guarda artículos de interés con el botón de corazón ♡

### Guardar favoritos
Al guardar un favorito puedes agregar:
- **Notas**: condición real, detalles del artículo
- **Clientes interesados**: nombres separados por coma

### Gestionar favoritos
Ve a la sección **Favoritos** para:
- Filtrar por nombre, tienda o cliente
- Editar notas y clientes directamente en la tarjeta
- Eliminar favoritos que ya no apliquen

---

## Panel Admin

Ve a la sección **Admin** para:

### Tiendas
- Ver todas las tiendas configuradas
- Activar/desactivar tiendas sin borrarlas
- Editar URL, tipo o plantilla de búsqueda
- Agregar nuevas tiendas con estos tipos:
  - `shopify`: tiendas con API pública de Shopify (más rápido y confiable)
  - `playwright`: sitios que requieren JavaScript (headless browser)
  - `static`: sitios estáticos (también usa playwright)

### Campos de búsqueda
- Activar/desactivar campos visibles en el formulario
- Agregar campos nuevos (tipo text, select o range)
- Los cambios se reflejan de inmediato en el formulario de búsqueda

---

## Agregar una nueva tienda

1. Ve a **Admin → Tiendas**
2. Clic en **+ Agregar tienda**
3. Llena los campos:
   - **ID**: identificador único sin espacios (ej: `brand_jp`)
   - **Nombre**: nombre que se mostrará (ej: `Brand JP`)
   - **URL base**: URL raíz de la tienda (ej: `https://brand.jp`)
   - **Tipo**: `shopify` si la tienda usa Shopify, `playwright` para el resto
   - **URL de búsqueda**: usa `{query}` como placeholder (ej: `https://brand.jp/search?q={query}`)
4. Clic en **Guardar**

La tienda aparecerá inmediatamente en el formulario de búsqueda.

---

## Configuración

| Variable | Ubicación | Descripción |
|----------|-----------|-------------|
| `JPY_TO_MXN` | `backend/main.py` | Tipo de cambio JPY → MXN (referencial) |
| Tiendas | `backend/config/stores.json` | Configuración de tiendas |
| Campos | `backend/config/search_fields.json` | Campos del formulario |

---

## Notas técnicas

- Las búsquedas se ejecutan en **paralelo** — todas las tiendas se consultan simultáneamente
- Si una tienda falla (timeout, bloqueo), retorna lista vacía con mensaje de error sin interrumpir el resto
- El score de similitud compara los términos del query contra el título del producto de forma case-insensitive
- Los sitios con Playwright pueden ser más lentos (30s timeout por tienda) por el renderizado JavaScript
