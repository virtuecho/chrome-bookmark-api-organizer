# AI Code Review Checklist

Use this checklist when reviewing AI-generated or human-written changes.

## Product Boundary

- [ ] Does the change support local bookmark assignment generation or Chrome API organizing?
- [ ] Does it avoid turning the project into a hosted service?
- [ ] Does it preserve the `assignments.js` contract unless explicitly changed?

## Privacy And Security

- [ ] No real `assignments.js` is committed.
- [ ] No real bookmark export, backup, cookie, key, token, or profile data is committed.
- [ ] Chrome permissions remain limited to the required set.

## Code Quality

- [ ] Scripts are cross-platform where practical.
- [ ] Error messages explain how to recover.
- [ ] Generated files are ignored or synthetic.
- [ ] No unnecessary dependencies are added.

## Validation

- [ ] The extension remains loadable as an unpacked Chrome extension.
- [ ] Template generation still uses live Chrome bookmarks.
- [ ] Dry Run still refuses mismatched IDs.
- [ ] Failures are reported honestly.

## Documentation

- [ ] README is updated.
- [ ] AGENTS.md is updated if the agent workflow changed.
- [ ] Data model and operation workflow docs stay aligned.
