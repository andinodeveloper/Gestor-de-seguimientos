# Gestor de Seguimientos

Aplicacion `Next.js` exportada de forma estatica para `GitHub Pages`, con autenticacion y persistencia en `Supabase`.

## Stack

- Next.js App Router
- TypeScript
- Tailwind CSS
- Supabase Auth + Postgres + RLS
- JSZip para backups ZIP
- PptxGenJS cargado en navegador para exporte PPTX
- Supabase Edge Function para alta o invitacion segura de usuarios admin

## Variables de entorno del frontend

Usa `.env.example` como base y crea `.env.local`:

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
```

Estas variables se incrustan en el build estatico. En GitHub se configuran como secrets del repositorio.

## Base de datos

1. Crea el proyecto en Supabase.
2. Ejecuta [supabase/schema.sql](supabase/schema.sql) en el SQL Editor.
3. Crea manualmente el primer usuario en Supabase Auth.
4. Cambia su perfil a `admin` en la tabla `profiles`.

## Edge Function para usuarios admin

La app en GitHub Pages no expone la service role key. Para mantener la creacion o invitacion de usuarios desde la interfaz admin, la parte sensible va en la funcion:

- [supabase/functions/admin-users/index.ts](supabase/functions/admin-users/index.ts)

Pasos manuales recomendados:

1. Instala o abre el Supabase CLI en tu equipo.
2. Haz login y link al proyecto.
3. Configura el secreto `SUPABASE_SERVICE_ROLE_KEY` en Supabase Functions.
4. Despliega la funcion `admin-users`.

Referencia de flujo:

```bash
supabase login
supabase link --project-ref <tu-project-ref>
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=<tu-service-role-key>
supabase functions deploy admin-users
```

## Configuracion de Auth en Supabase

Para que las invitaciones por correo regresen correctamente a GitHub Pages, configura en `Authentication > URL Configuration`:

- `Site URL`: `https://andinodeveloper.github.io/Gestor-de-seguimientos/`
- `Redirect URL`: `https://andinodeveloper.github.io/Gestor-de-seguimientos/login/`

Si usas otro usuario u otro nombre de repositorio, ajusta ambas URLs.

## GitHub Pages

El workflow ya esta listo en:

- [.github/workflows/deploy-pages.yml](.github/workflows/deploy-pages.yml)

Secrets requeridos en GitHub:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

Configuracion manual en GitHub:

1. Sube el codigo a la rama `main`.
2. En `Settings > Pages`, selecciona `GitHub Actions` como source.
3. Agrega los dos secrets del frontend.
4. Ejecuta el workflow o haz push a `main`.

## Desarrollo local

Si `npm` no esta en `PATH`, puedes usar `node.exe` directo:

```bash
"C:\Program Files\nodejs\node.exe" .\node_modules\next\dist\bin\next dev
```

Si `npm` si esta disponible:

```bash
npm install
npm run dev
```

## Rutas principales

- `/login`
- `/seguimientos`
- `/seguimientos/nuevo`
- `/seguimientos/detalle?id=<uuid>`
- `/admin/usuarios`

## Alcance implementado

- Login por correo y contrasena
- Roles `admin`, `editor`, `viewer`
- Listado filtrable de seguimientos
- Editor persistente de cabecera, documentos, actividades y proyectos
- Archivado de seguimientos
- Panel admin de usuarios
- Exporte `PPTX`
- Backup `ZIP` con `seguimiento.json`
- Auditoria basica en `audit_events`
- Build estatico compatible con GitHub Pages

## Archivos sensibles

`ContraSupabase.txt` queda ignorado por `.gitignore` y no debe publicarse.
