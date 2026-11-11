# SwoleUp

A Hebrew personal fitness app. Workout planning, food suggestions, progress tracking, and an optional AI coach.

## Build and publish

```sh
npm ci
npm run build
git add src build.mjs package.json package-lock.json docs
git commit -m "Update SwoleUp"
git push
```

GitHub Pages publishes the `docs/` directory on `main`. No backend is required. App data is stored only in the browser on the current device and origin. Export a backup regularly. Never commit API keys or personal backups.

## Install

Open the HTTPS site in Safari on iPhone and choose Share > Add to Home Screen. On Android Chrome choose Install app or Add to Home screen. The app includes its own icon, standalone manifest, and offline app shell. AI requests require internet access and the user's own provider key.

## Move data from the previous site

1. On the previous site, open Profile > Settings > Backup and restore, then export the JSON backup.
2. On this site, complete the short setup to reach Profile > Settings > Backup and restore, then restore the JSON file or paste its text. The imported profile and workout plan replace the temporary setup.
3. Re-enter your AI provider key in Settings. Keys are deliberately excluded from backups.
4. A paused, unfinished workout session is not included in backups. Finish it before migrating.

The old site remains available. Data does not sync between the two origins.
