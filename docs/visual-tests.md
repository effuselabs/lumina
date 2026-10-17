# Visual tests

`e2e/visual.spec.ts` screenshots the main pages in light and dark, at desktop
(1280px) and phone (390px) width, and compares them pixel for pixel with the
baselines in `e2e/__screenshots__/`.

Every colour, radius, shadow and font on those pages comes from
`lib/design/tokens.ts`. A token change therefore shows up as a diff on every
page it reaches. A diff with no token or component change behind it is a
regression.

## What's covered

| Page             | Why                                                                     |
| ---------------- | ----------------------------------------------------------------------- |
| `/`              | The first thing anyone sees                                             |
| `/auth/signin`   | Every owner, every day                                                  |
| `/auth/signup`   | The start of the booking loop                                           |
| `/design-system` | Every UI primitive, drawn from the tokens (signed in as the demo owner) |

The booking page and the dashboard aren't covered yet, because the seed fills
them with random data and they would differ on every run. Making the seed
reproducible is [#112](https://github.com/effuselabs/lumina/issues/112).

## Where baselines come from

Pixels depend on the browser build and the installed fonts, so baselines are
valid on exactly one platform: the Playwright Docker image matching the
`@playwright/test` version in `package.json`
(`mcr.microsoft.com/playwright:v1.62.0-noble`). CI's `visual` job runs there.
Screenshots taken on a laptop will not match, and must not be committed.

## When the visual job fails

1. Open the failed run and download **visual-report**. Each failing page has
   an `-expected`, an `-actual` and a `-diff` image.
2. **If the change wasn't intended**, it's a bug. Fix the code and push.
3. **If it was intended** (a design change, a new page, a token edit), take
   the new screenshots that run published. The job **Publish new screenshots**
   commits them to `visual-baselines/<your branch>`. Bring them in, check that
   only the images you expected changed, then commit:

   ```bash
   git fetch origin visual-baselines/<your-branch>
   git checkout FETCH_HEAD -- e2e/__screenshots__
   git status   # only the pages you meant to change
   git commit -m "test(visual): update baselines for <what changed>"
   ```

   The next run compares against them and passes. The same images are also
   attached to the run as **visual-baselines**.

New tests work the same way: their first run fails with "a snapshot doesn't
exist", and the published branch contains the new image.

`visual-baselines/*` branches are scratch space. Each failing run replaces its
branch, and they hold nothing but generated images. Pull requests from forks
don't get one, because their token can't push, so take the artifact instead.

## Running it yourself

In the same image as CI, with a seeded database reachable from the container:

```bash
npm run build
docker run --rm --network host -v "$PWD":/work -w /work \
  -e DATABASE_URL -e NEXTAUTH_SECRET -e E2E_SERVER_COMMAND='npm run start' \
  mcr.microsoft.com/playwright:v1.62.0-noble \
  npx playwright test --project=visual
```

Add `--update-snapshots=all` to write new baselines from inside the image.

## Keeping it deterministic

- The browser clock is fixed (`page.clock.setFixedTime`), so dates hold still.
- CSS animations and the text caret are disabled
  (`toHaveScreenshot` defaults in `playwright.config.ts`).
- Anything that animates on its own timer is masked. Today that's the
  count-up demo on `/design-system`.
- The job runs against a production build (`E2E_SERVER_COMMAND='npm run
start'`), because the dev server draws its own indicator on the page.
- No retries. A retry would pass against the image its first attempt just
  wrote.
