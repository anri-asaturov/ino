# Structure contract for services folder

- Keep exported service entry points in the root of `services/`.
- Keep implementation helpers and internal domain/feature files in domain-specific folders.
- Code outside `services/` should import root service entry points, not internal domain helpers.
