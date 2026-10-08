# Changelog

All notable changes to Regulate are documented here.

## [0.2.0] - 2026-10-08

### Added
- High-contrast mode with system `prefers-contrast: more` support (#22)
- Configurable rhythm announcer cadence and verbosity (#23)
- Keyboard shortcuts: Space, M, S, F, ? (#24)
- Haptic feedback on mobile for session start/end (#28)
- CONTRIBUTING.md development guide (#34)
- Changelog and release process (#35)
- PWA offline indicator (#14)
- AudioEngine unit tests (34 tests) (#19)
- Automated accessibility testing with axe-core (#21)
- RhythmAnnouncer and ExternalFocusPrompts tests (#18)

### Changed
- Wind-down chime now routes through master gain chain (#31)
- RAF loop stops in static motion mode to save CPU (#12)
- Service worker cache version auto-stamped at build time (#13)

### Fixed
- ToggleSwitch missing aria-label (found by axe-core) (#21)
- Skip-to-content link for keyboard navigation (#10)
- AudioContext error boundary with graceful fallback (#11)

### Removed
- Dead `DEV_SWELL_OPTIONS` constant (#32)

## [0.1.0] - 2026-10-08

### Added
- Initial release of Regulate ambient regulation app
- Three soundscapes: Calm, Ground, Drift
- Ambient Rhythm and External Focus pathways
- 5-minute, 10-minute, and open session modes
- Onboarding flow with safety information
- Settings panel with rhythm, motion, and experience preferences
- PWA support with service worker and offline caching
- GitHub Pages deployment via GitHub Actions
