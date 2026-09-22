# FACTORY OS — V32 Architecture

## Principle
V32 is a **presentation and shell refactor**, not a rewrite of the TPM business logic.

### Protected foundation
- Firebase authentication/database/storage
- TPM domain model and role policy
- Audit, tag, task, Kaizen and reporting workflows
- Existing screen IDs and global handlers used by legacy modules
- Export/PDF and scanner integrations

### UI layers
1. **Legacy foundation**
   - `styles.css`
   - `css/style.css`
   - `css/enterprise-v26.css`
   - `css/mobile-v27.css`
   - `css/ux-v28-polish.css`

   These remain in place for compatibility.

2. **Factory OS shell**
   - `css/factory-os-executive-v32.css`
   - `css/factory-os-v32-industrial.css`

   The V32 industrial layer is loaded last and owns the visual language: spacing, surfaces, typography, controls, navigation, cards and home presentation.

3. **Application modules**
   - `js/core/` — domain, Firebase, workflow, KPI and policy
   - `js/modules/` — feature modules
   - `js/utils/` — UI utilities
   - `js/auth/` — authentication

## Design language
**Quiet Industrial / Operations Room**

The interface intentionally avoids:
- neon/glow effects
- AI-dashboard visual clichés
- excessive gradients
- decorative glassmorphism
- oversized rounded cards
- duplicated navigation

The visual hierarchy is built around:
- graphite/navy structure
- steel-grey surfaces
- warm copper as the primary action accent
- restrained green/red operational states
- thin borders
- low-elevation shadows
- compact information density

## Autonomous Maintenance
The experimental V2 Autonomous Maintenance Maps layer was removed from the application shell. The existing TPM/JH foundation remains protected.

## Refactor rule
Future UI work should be added as a dedicated CSS/module layer instead of repeatedly editing the legacy global stylesheet. Business logic changes must remain separate from visual refactors.
