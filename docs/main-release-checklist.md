# Main Release Checklist

Use this before merging into `main` and again before launch.

## Build health

- [ ] `pnpm run typecheck`
- [ ] `pnpm run build`
- [ ] Fresh checkout can install and build with `.env.example` defaults

## Product checks

- [ ] Signed-out user can create and use the app
- [ ] Data persists after reload
- [ ] Passphrase lock and unlock work
- [ ] Library renders correctly and matches generated data
- [ ] No broken settings or subscription paths are visible
- [ ] Deferred features are hidden or absent

## Launch checks

- [ ] Required env vars are documented
- [ ] `main` contains only launch-ready behavior
- [ ] Whoop is either hardened or disabled
- [ ] Billing behavior is either complete or kept off the launch path
- [ ] No known launch blocker remains open
