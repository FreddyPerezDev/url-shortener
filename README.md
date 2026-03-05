# 🔗 Acortador de URLs — LinkShort

Una aplicación web moderna y minimalista para acortar URLs, construida con **Astro 5**, **TailwindCSS 4** y **Turso** como base de datos edge. Diseñada para ser rápida, segura y sin seguimiento de datos de usuario.

---

## ✨ Características

- **Acortamiento instantáneo** — Genera un ID único de 8 caracteres alfanuméricos con `nanoid`.
- **Deduplicación inteligente** — Si la URL ya fue acortada antes, devuelve el mismo enlace sin duplicar registros en la base de datos.
- **Redirecciones rápidas** — Ruta dinámica `[id].ts` que resuelve el enlace original y redirige al usuario con un `302`.
- **Contador de clics** — Cada redirección incrementa el contador de visitas almacenado en la base de datos.
- **Rate Limiting propio** — Sistema de limitación de solicitudes implementado desde cero (sin librerías externas):
  - Acortamiento: máximo **5 solicitudes cada 15 minutos** por IP.
  - Redirecciones: máximo **30 solicitudes por minuto** por IP.
- **Validación estricta de URLs** — Bloquea direcciones locales, IPs privadas, protocolos no permitidos y dominios internos.
- **Copiar al portapapeles** — Feedback visual al copiar el enlace acortado.
- **Diseño responsive** — UI adaptable a cualquier dispositivo, con tema oscuro y minimalista.
- **Página 404 personalizada** — Manejo elegante de IDs inexistentes o inválidos.

---

## �️ Stack Tecnológico

| Tecnología                                                   | Rol en el proyecto                                                  |
| :----------------------------------------------------------- | :------------------------------------------------------------------ |
| [Astro 5](https://astro.build)                               | Framework principal con modo SSR (`output: "server"`)               |
| [TailwindCSS 4](https://tailwindcss.com)                     | Estilos utilitarios integrados via plugin de Vite                   |
| [TypeScript](https://www.typescriptlang.org)                 | Tipado estático en toda la aplicación                               |
| [Turso (libSQL)](https://turso.tech)                         | Base de datos SQLite edge para almacenar los enlaces                |
| [nanoid](https://github.com/ai/nanoid)                       | Generación de IDs cortos únicos y seguros                           |
| [Astro Actions](https://docs.astro.build/en/guides/actions/) | Manejo type-safe de acciones del servidor                           |
| [Zod](https://zod.dev)                                       | Validación de esquemas de entrada (incluido en Astro)               |
| [Vercel](https://vercel.com)                                 | Plataforma de despliegue con el adaptador oficial `@astrojs/vercel` |
| [Biome](https://biomejs.dev)                                 | Linting y formateo de código (reemplaza ESLint + Prettier)          |
| [pnpm](https://pnpm.io)                                      | Gestor de paquetes rápido y eficiente                               |

---

## 🏗️ Arquitectura del Proyecto

```text
/
├── public/
│   └── favicon.svg
├── src/
│   ├── actions/
│   │   └── index.ts          # Astro Action: lógica de acortamiento (validación, rate limit, DB)
│   ├── components/
│   │   ├── Button.astro
│   │   ├── CardFeatures.astro
│   │   ├── Footer.astro
│   │   ├── Header.astro
│   │   ├── Input.astro
│   │   ├── ShortenForm.astro  # Formulario con cliente JS para llamar a la Action
│   │   └── ShortenResult.astro
│   ├── layouts/
│   │   └── Layout.astro       # Layout base: HTML, meta tags, Header y Footer
│   ├── lib/
│   │   ├── rate-limiter.ts    # Rate limiter in-memory implementado desde cero
│   │   └── turso.ts           # Cliente de base de datos Turso (libSQL)
│   ├── pages/
│   │   ├── index.astro        # Página principal
│   │   ├── 404.astro          # Página de error personalizada
│   │   └── [id].ts            # Ruta dinámica: resolución y redirección de enlaces
│   ├── sections/
│   │   ├── HeroSection.astro
│   │   ├── FeaturesSection.astro
│   │   └── HowItWorksSection.astro
│   └── styles/
│       └── global.css
├── astro.config.mjs
├── biome.json
└── package.json
```

---

## 🔐 Seguridad

La aplicación implementa múltiples capas de seguridad:

- **Validación de protocolo** — Solo se permiten URLs con esquema `http:` o `https:`.
- **Bloqueo de hosts privados** — Se rechazan peticiones a `localhost`, `127.0.0.1`, `0.0.0.0`, `[::1]` y cualquier IP de rango privado (10.x, 172.16-31.x, 192.168.x).
- **Bloqueo de dominios internos** — Se bloquean dominios terminados en `.local` o `.internal`.
- **Longitud máxima** — Las URLs no pueden superar los 2048 caracteres.
- **Validación del slug** — Los IDs en las redirecciones se validan con regex `^[A-Za-z0-9]{1,20}$` antes de consultar la base de datos.
- **Rate Limiting por IP** — Protección contra abuso tanto en la creación de enlaces como en las redirecciones.

---

## ⚙️ Variables de Entorno

Crea un archivo `.env` en la raíz del proyecto con las siguientes variables:

```env
TURSO_DATABASE_URL=libsql://your-database.turso.io
TURSO_AUTH_TOKEN=your-auth-token
```

---

## 🚀 Comandos

Todos los comandos se ejecutan desde la raíz del proyecto:

| Comando          | Acción                                               |
| :--------------- | :--------------------------------------------------- |
| `pnpm install`   | Instala las dependencias                             |
| `pnpm dev`       | Inicia el servidor de desarrollo en `localhost:4321` |
| `pnpm build`     | Compila el proyecto para producción en `./dist/`     |
| `pnpm preview`   | Previsualiza el build antes de desplegar             |
| `pnpm astro ...` | Ejecuta comandos de la CLI de Astro                  |

---

## 📦 Cómo Funciona

1. **El usuario ingresa una URL larga** en el formulario de la página principal.
2. **Astro Actions** recibe la solicitud en el servidor, valida la URL con Zod y verifica el rate limit por IP.
3. **Turso** comprueba si la URL ya existe en la base de datos para evitar duplicados.
4. Si es nueva, **nanoid** genera un ID único de 8 caracteres y se guarda en la base de datos.
5. El usuario recibe su **enlace acortado** con opción de copiarlo al portapapeles.
6. Al visitar el enlace corto, la ruta dinámica `[id].ts` consulta la base de datos, incrementa el contador de clics y realiza la redirección `302` al destino original.
