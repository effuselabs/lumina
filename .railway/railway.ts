/**
 * Railway configuration for the staging deployment.
 *
 * This replaces `railway.json`. Config as Code stops working on 2026-12-01, and
 * the settings here are load-bearing rather than cosmetic: the pre-deploy
 * migration and the health check are what stop a broken release, or one running
 * against an un-migrated schema, from being promoted. Those guardrails reverted
 * to platform defaults once already without anyone noticing, which is why they
 * belong in a file in the repository rather than only in a dashboard.
 *
 * **Always run `railway config plan` before `railway config apply`.** This file
 * is the complete desired state, so anything it does not declare is deleted.
 * The first draft omitted the source and the variables, and its plan proposed
 * deleting DATABASE_URL and NEXTAUTH_SECRET and disconnecting the repository —
 * which would have taken staging down and undone the GitHub wiring.
 */

import { defineRailway, github, preserve, project, service } from 'railway/iac';

export const partial = 'lumina';

export default defineRailway(() => {
  const lumina = service('lumina', {
    // Declared so IaC does not treat the GitHub connection as undesired and
    // remove it. `checkSuites` is Railway's "wait for CI": without it a merge
    // deploys immediately, whether or not the tests passed.
    source: github('effuselabs/lumina', {
      branch: 'main',
      rootDirectory: '/',
      checkSuites: true,
    }),

    build: {
      // Nixpacks, explicitly. Railway's newer default is Railpack, so leaving
      // this unset does not mean "keep what we have" — it means "take whatever
      // the platform defaults to next", which is how this service once ended up
      // on Railpack with no build command at all.
      builder: 'NIXPACKS',
      buildCommand: 'npm run build',
    },

    deploy: {
      startCommand: 'npm start',

      // Migrations run here, inside Railway, where DATABASE_URL resolves to the
      // Postgres plugin — more reliable than running them from CI. Railway
      // aborts the release if this fails, so new code cannot go live against an
      // un-migrated schema.
      //
      // `railway config migrate` emits this as a *comment* rather than as
      // configuration, so migrating with the generated file would quietly drop
      // it.
      preDeployCommand: ['npx prisma migrate deploy'],

      // `/api/health` checks database connectivity as well as liveness, so a
      // release that cannot reach Postgres is never promoted. 300s because a
      // cold start plus migrations is slower than the default allows.
      healthcheckPath: '/api/health',
      healthcheckTimeout: 300,

      restartPolicyType: 'ON_FAILURE',
      restartPolicyMaxRetries: 3,
    },

    // `preserve()` means "this variable exists and is managed outside this
    // file". Secrets must never be written here — this file is public — and
    // declaring the names without values is what stops IaC deleting them as
    // undeclared. Set and rotate the values in the Railway dashboard.
    env: {
      DATABASE_URL: preserve(),
      NEXTAUTH_SECRET: preserve(),
      NEXTAUTH_URL: preserve(),
      NEXT_PUBLIC_APP_URL: preserve(),
      NIXPACKS_NODE_VERSION: preserve(),
      NODE_OPTIONS: preserve(),
    },
  });

  return project('lumina-staging', {
    resources: [lumina],
  });
});
