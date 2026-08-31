# JADSTACK LOTTO

Plateforme de gestion de loterie (borlette, lotto 3/4/5, mariage) — interfaces
Agent, Employeur, Compagnie et Super Admin, avec backend Supabase (PostgreSQL,
RLS, Storage) et frontend JavaScript natif.

## Development

Node.js ak npm oswa bun requis.

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```

## Built with

- TanStack Start
- TypeScript
- React
- Tailwind CSS

## V77 Commission — Backend JL68 conservé

Le backend JL68 existant est conservé. La gestion de commission V77 est une extension additive.

Permissions:
- Agent: lecture de sa propre commission uniquement.
- Employeur: lecture seule.
- Admin Compagnie: création/modification des commissions de sa compagnie.
- Super Admin: gestion de toutes les commissions.

Aucun système V76 de commission n'est chargé par les pages V77.

## V80 biometric admin login

Super Admin and Mini Super Admin accounts can be gated by the Android OS
biometric authenticator. No face image or biometric template is stored by
the app.
