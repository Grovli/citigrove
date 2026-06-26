// Auto-generated from design-tokens. Do not edit by hand.
// Run: npm run tokens

import SwiftUI
import UIKit

// Adaptive light/dark Color composed from the generated light+dark scalars.
// No hand-written dark-mode hex — the token source is the single authority.
private func cgAdaptive(_ light: Color, _ dark: Color) -> Color {
    Color(UIColor { $0.userInterfaceStyle == .dark ? UIColor(dark) : UIColor(light) })
}

/// CitiGrove "Sea Glass" brand palette — adaptive light/dark, single-sourced
/// from design-tokens/tokens/color.json (color.citigrove.*).
enum CitiGroveColorTokens {
    /// charcoal-green — nav/footer/CTA-band; deepened in dark
    static let chrome = cgAdaptive(Color(red: 0.157, green: 0.200, blue: 0.173), Color(red: 0.059, green: 0.082, blue: 0.071))
    /// cream — text/icons on chrome (and on primary fills)
    static let onChrome = cgAdaptive(Color(red: 0.957, green: 0.949, blue: 0.918), Color(red: 0.925, green: 0.918, blue: 0.886))
    /// eucalyptus — primary fills + large accents; lifted in dark
    static let primary = cgAdaptive(Color(red: 0.431, green: 0.545, blue: 0.451), Color(red: 0.533, green: 0.647, blue: 0.557))
    /// deeper eucalyptus — AA-safe text/link green + pressed state
    static let primaryDeep = cgAdaptive(Color(red: 0.341, green: 0.447, blue: 0.376), Color(red: 0.431, green: 0.545, blue: 0.451))
    /// muted clay — the single warm accent, used sparingly (decorative/fills + eyebrows; low contrast as body text on page ~2.6:1, so not for paragraph copy)
    static let accent = cgAdaptive(Color(red: 0.761, green: 0.541, blue: 0.400), Color(red: 0.824, green: 0.627, blue: 0.494))
    /// primary text (warm near-black)
    static let ink = cgAdaptive(Color(red: 0.129, green: 0.122, blue: 0.102), Color(red: 0.925, green: 0.918, blue: 0.886))
    /// secondary text
    static let inkSoft = cgAdaptive(Color(red: 0.129, green: 0.122, blue: 0.102, opacity: 0.580), Color(red: 0.925, green: 0.918, blue: 0.886, opacity: 0.620))
    /// tertiary text / hints
    static let inkFaint = cgAdaptive(Color(red: 0.129, green: 0.122, blue: 0.102, opacity: 0.360), Color(red: 0.925, green: 0.918, blue: 0.886, opacity: 0.400))
    /// bone — page canvas; warm near-black in dark
    static let page = cgAdaptive(Color(red: 0.957, green: 0.949, blue: 0.918), Color(red: 0.078, green: 0.086, blue: 0.075))
    /// raised card surface
    static let surface = cgAdaptive(Color(red: 0.988, green: 0.984, blue: 0.965), Color(red: 0.110, green: 0.122, blue: 0.106))
    /// recessed / inset surface
    static let surfaceSunken = cgAdaptive(Color(red: 0.925, green: 0.914, blue: 0.871), Color(red: 0.055, green: 0.063, blue: 0.051))
    /// hairline border
    static let line = cgAdaptive(Color(red: 0.902, green: 0.886, blue: 0.843), Color(red: 0.173, green: 0.188, blue: 0.169))
}
