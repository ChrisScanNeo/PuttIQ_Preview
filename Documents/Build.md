- Kick off a distribution build instead: run eas build --platform ios --profile production (or
    --profile preview if you just need an internal testflight). This produces the App Store–ready
    archive.
  - Watch eas build:list --status in-queue,in-progress,finished --limit 5 to confirm the new build
    lands; note its ID once it finishes.
  - Submit that build: eas submit -p ios --profile production, select the fresh build when prompted, and
    let it upload to App Store Connect.

  If you really need the dev client too, keep using the development profile, but only the production/
  preview build can be submitted.