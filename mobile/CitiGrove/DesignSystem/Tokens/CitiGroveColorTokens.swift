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
    /// near-black — nav/footer/CTA fills; inverts to near-white in dark
    static let chrome = cgAdaptive(Color(red: 0.086, green: 0.078, blue: 0.059), Color(red: 0.929, green: 0.914, blue: 0.875))
    /// near-white — text/icons on chrome (and on primary fills)
    static let onChrome = cgAdaptive(Color(red: 0.969, green: 0.961, blue: 0.937), Color(red: 0.086, green: 0.078, blue: 0.059))
    /// near-black — dominant action fills (monochrome)
    static let primary = cgAdaptive(Color(red: 0.086, green: 0.078, blue: 0.059), Color(red: 0.929, green: 0.914, blue: 0.875))
    /// deep clay — AA-safe text/link/eyebrow accent (~5.5:1); lifted in dark
    static let primaryDeep = cgAdaptive(Color(red: 0.604, green: 0.290, blue: 0.149), Color(red: 0.859, green: 0.549, blue: 0.373))
    /// clay — the single warm accent; fills/eyebrows/large only (~4.2:1, sub-AA for body)
    static let accent = cgAdaptive(Color(red: 0.710, green: 0.345, blue: 0.184), Color(red: 0.824, green: 0.467, blue: 0.290))
    /// primary text (warm near-black)
    static let ink = cgAdaptive(Color(red: 0.086, green: 0.078, blue: 0.059), Color(red: 0.949, green: 0.937, blue: 0.906))
    /// secondary text
    static let inkSoft = cgAdaptive(Color(red: 0.086, green: 0.078, blue: 0.059, opacity: 0.580), Color(red: 0.949, green: 0.937, blue: 0.906, opacity: 0.620))
    /// tertiary text / hints
    static let inkFaint = cgAdaptive(Color(red: 0.086, green: 0.078, blue: 0.059, opacity: 0.340), Color(red: 0.949, green: 0.937, blue: 0.906, opacity: 0.400))
    /// warm near-white canvas; near-black in dark
    static let page = cgAdaptive(Color(red: 0.969, green: 0.961, blue: 0.937), Color(red: 0.078, green: 0.075, blue: 0.059))
    /// raised card surface (brighter than page)
    static let surface = cgAdaptive(Color(red: 0.988, green: 0.984, blue: 0.969), Color(red: 0.110, green: 0.106, blue: 0.086))
    /// recessed / inset surface
    static let surfaceSunken = cgAdaptive(Color(red: 0.937, green: 0.929, blue: 0.894), Color(red: 0.055, green: 0.051, blue: 0.039))
    /// hairline border
    static let line = cgAdaptive(Color(red: 0.894, green: 0.882, blue: 0.839), Color(red: 0.173, green: 0.165, blue: 0.141))
}
