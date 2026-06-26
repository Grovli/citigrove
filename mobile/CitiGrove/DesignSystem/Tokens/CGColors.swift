import SwiftUI

/// Semantic CitiGrove colors — the "Sea Glass" brand.
///
/// Views reference THESE roles, never the raw generated tokens. Each resolves
/// through `CitiGroveColorTokens` (generated from the shared design-tokens
/// pipeline), which are already adaptive light/dark — so dark mode is free and
/// drift-proof. To retune the palette, edit `tokens/color.json` in the Grovli
/// design-tokens repo and re-run `npm run tokens`; never hand-edit colors here.
enum CGColors {
    static let chrome        = CitiGroveColorTokens.chrome        // nav / footer / CTA fill
    static let onChrome      = CitiGroveColorTokens.onChrome      // text/icons on chrome + primary fills
    static let primary       = CitiGroveColorTokens.primary       // eucalyptus — fills + large accents
    static let primaryDeep   = CitiGroveColorTokens.primaryDeep   // AA-safe link/text green + pressed
    static let accent        = CitiGroveColorTokens.accent        // muted clay — sparing warm accent
    static let ink           = CitiGroveColorTokens.ink           // primary text
    static let inkSoft       = CitiGroveColorTokens.inkSoft       // secondary text
    static let inkFaint      = CitiGroveColorTokens.inkFaint      // tertiary / hints
    static let page          = CitiGroveColorTokens.page          // page canvas (bone)
    static let surface       = CitiGroveColorTokens.surface       // raised card
    static let surfaceSunken = CitiGroveColorTokens.surfaceSunken // inset / recessed
    static let line          = CitiGroveColorTokens.line          // hairline border
}
