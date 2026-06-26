import SwiftUI

/// Semantic CitiGrove colors — the warm editorial "Ffern register" shared with
/// citigrove.com (warm cream canvas, soft warm-dark ink, a single coral accent).
///
/// Views reference THESE roles, never the raw generated tokens. Each resolves
/// through `CitiGroveColorTokens` (generated from the shared design-tokens
/// pipeline), which are already adaptive light/dark — so dark mode is free and
/// drift-proof. To retune the palette, edit `tokens/color.json` (+ the tonal
/// merge file) in the Grovli design-tokens repo and re-run `npm run tokens`;
/// never hand-edit colors here.
enum CGColors {
    static let chrome        = CitiGroveColorTokens.chrome        // nav / footer / CTA fill (warm dark ink)
    static let onChrome      = CitiGroveColorTokens.onChrome      // text/icons on chrome + primary fills (cream)
    static let primary       = CitiGroveColorTokens.primary       // dominant near-black fill
    static let primaryDeep   = CitiGroveColorTokens.primaryDeep   // AA-safe deep-terracotta link/text/eyebrow
    static let accent        = CitiGroveColorTokens.accent        // coral — dots + large accents (sub-AA for body)
    static let ink           = CitiGroveColorTokens.ink           // primary text (soft warm dark, not black)
    static let inkSoft       = CitiGroveColorTokens.inkSoft       // secondary text
    static let inkFaint      = CitiGroveColorTokens.inkFaint      // tertiary / hints
    static let page          = CitiGroveColorTokens.page          // page canvas (warm cream)
    static let surface       = CitiGroveColorTokens.surface       // raised card
    static let surfaceSunken = CitiGroveColorTokens.surfaceSunken // inset / recessed panel

    // Tonal section bands — the site's full-width feature panels. Large fills
    // only (decorative); ink/cream text rides on top.
    static let peach         = CitiGroveColorTokens.peach         // warm hero / CTA band
    static let sage          = CitiGroveColorTokens.sage          // cool chapter band
    static let clay          = CitiGroveColorTokens.clay          // warm-neutral alt band
    static let line          = CitiGroveColorTokens.line          // hairline border
}
