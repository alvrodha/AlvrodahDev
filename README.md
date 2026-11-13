# AlvrodahDev

Personal portfolio site built as a static website with Node.js and Vite.

## Requirements

- Node.js 20.19 or newer
- npm

## Getting started

```sh
npm ci
npm run dev
```

Vite prints the local development URL after startup.

## Commands

- `npm run dev` — start the local development server.
- `npm run check` — check the application JavaScript syntax.
- `npm run build` — create the production site in `dist/`.
- `npm run preview` — preview the production build locally.

The site is static; it does not provide a backend or process contact-form
submissions.

## Component library

The portfolio includes searchable, filterable interface snippets with live
previews and copy buttons. Add or edit entries in `src/library.js`; each entry
contains its title, category, description, tags, preview type, and copyable
source. Preview renderers and interactions are in `src/main.js`, and their
styles are in `src/style.css`.

The login component is a visual example only, not an authentication system.
Review and adapt snippets for your project before using them.

## Sensitive files

Keep credentials in local environment files and never commit secrets or private
keys. Local environment files, private keys, archives, and backup directories
are ignored by Git. `.gitignore` does not remove files already tracked or
published; remove exposed credentials and rotate them if necessary.