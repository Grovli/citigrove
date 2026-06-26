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
    /// warm dark ink — nav/footer/CTA fills; inverts in dark
    static let chrome = cgAdaptive(Color(red: 0.231, green: 0.212, blue: 0.176), Color(red: 0.929, green: 0.902, blue: 0.847))
    /// warm cream — text/icons on chrome (and on primary fills)
    static let onChrome = cgAdaptive(Color(red: 0.945, green: 0.925, blue: 0.882), Color(red: 0.165, green: 0.149, blue: 0.125))
    /// warm dark ink — dominant action fills
    static let primary = cgAdaptive(Color(red: 0.231, green: 0.212, blue: 0.176), Color(red: 0.929, green: 0.902, blue: 0.847))
    /// deep terracotta — AA-safe text/link/eyebrow accent (~5.8:1)
    static let primaryDeep = cgAdaptive(Color(red: 0.541, green: 0.290, blue: 0.157), Color(red: 0.831, green: 0.608, blue: 0.494))
    /// coral — warm dot/accent; fills/dots/large only (sub-AA for body)
    static let accent = cgAdaptive(Color(red: 0.761, green: 0.439, blue: 0.243), Color(red: 0.835, green: 0.537, blue: 0.353))
    /// primary text (soft warm dark, not black)
    static let ink = cgAdaptive(Color(red: 0.231, green: 0.212, blue: 0.176), Color(red: 0.929, green: 0.902, blue: 0.847))
    /// secondary text
    static let inkSoft = cgAdaptive(Color(red: 0.231, green: 0.212, blue: 0.176, opacity: 0.620), Color(red: 0.929, green: 0.902, blue: 0.847, opacity: 0.620))
    /// tertiary text / hints
    static let inkFaint = cgAdaptive(Color(red: 0.231, green: 0.212, blue: 0.176, opacity: 0.400), Color(red: 0.929, green: 0.902, blue: 0.847, opacity: 0.400))
    /// warm cream canvas; warm dark in dark mode
    static let page = cgAdaptive(Color(red: 0.945, green: 0.925, blue: 0.882), Color(red: 0.129, green: 0.118, blue: 0.094))
    /// raised card surface (brighter than page)
    static let surface = cgAdaptive(Color(red: 0.973, green: 0.957, blue: 0.925), Color(red: 0.165, green: 0.149, blue: 0.125))
    /// recessed / inset panel
    static let surfaceSunken = cgAdaptive(Color(red: 0.914, green: 0.886, blue: 0.827), Color(red: 0.094, green: 0.082, blue: 0.059))
    /// hairline border
    static let line = cgAdaptive(Color(red: 0.855, green: 0.827, blue: 0.769), Color(red: 0.224, green: 0.200, blue: 0.165))
}
