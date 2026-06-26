// Auto-generated from design-tokens. Do not edit by hand.
// Run: npm run tokens

import SwiftUI

/// CitiGrove typography — single-sourced from
/// design-tokens/tokens/typography.citigrove.json. The editorial 'Ffern
/// register' that citigrove.com uses: Newsreader display serif + Inter text.
///
/// Views go through the `CGType` semantic layer; this is the generated
/// token floor it rests on (mirrors CGColors → CitiGroveColorTokens).
enum CitiGroveTypeTokens {

    // MARK: - Family composers

    /// Newsreader editorial serif at any size/weight.
    static func displayFont(_ size: CGFloat, _ weight: Font.Weight = .regular) -> Font {
        .custom(newsreaderFace(for: weight), size: size)
    }

    /// Inter sans at any size/weight.
    static func textFont(_ size: CGFloat, _ weight: Font.Weight = .regular) -> Font {
        .custom(interFace(for: weight), size: size)
    }

    /// Newsreader italic — pull-quotes and editorial emphasis.
    static func serifItalic(_ size: CGFloat, _ weight: Font.Weight = .regular) -> Font {
        let face = (weight == .medium || weight == .semibold)
            ? "Newsreader-MediumItalic" : "Newsreader-Italic"
        return .custom(face, size: size)
    }

    // MARK: - Semantic roles (the type scale)

    /// Page hero headline — light editorial serif. Mirrors site h1 (Newsreader 400, lh 1.1, -0.012em).
    static let hero = displayFont(40, .regular)

    /// Screen / section headline — site h2 (Newsreader 400).
    static let title = displayFont(28, .regular)

    /// Sub-section / step head / product name — site uses Newsreader 500 at ~21-22px.
    static let section = displayFont(22, .medium)

    /// Editorial serif body / pull-quote (italic variant available) — site manifesto + blockquote register.
    static let serifBody = displayFont(19, .regular)

    /// Sans emphasis — list rows, dense UI labels.
    static let heading = textFont(17, .semibold)

    /// Primary body copy — site Inter body (lh ~1.6-1.72).
    static let body = textFont(16, .regular)

    /// Secondary body / descriptions — site soft-ink supporting copy.
    static let callout = textFont(15, .regular)

    /// Metadata, notes, prices, dates.
    static let caption = textFont(13, .regular)

    /// Uppercase micro-label above a headline — site label() (10.5px, 0.2em). Apply .uppercased() at call site.
    static let eyebrow = textFont(11, .medium)

    /// Button / CTA label — site uppercase 11.5px 0.16em ink-fill. Apply .uppercased() at call site.
    static let actionLabel = textFont(12, .semibold)

    /// Letter-spacing per role, in POINTS (letterSpacing-em × size).
    /// Apply via `.tracking(CitiGroveTypeTokens.Tracking.eyebrow)`.
    enum Tracking {
        static let hero: CGFloat = -0.480
        static let title: CGFloat = -0.280
        static let section: CGFloat = -0.132
        static let serifBody: CGFloat = 0.000
        static let heading: CGFloat = -0.170
        static let body: CGFloat = 0.000
        static let callout: CGFloat = 0.000
        static let caption: CGFloat = 0.052
        static let eyebrow: CGFloat = 1.980
        static let actionLabel: CGFloat = 1.680
    }

    /// Line-height multiplier per role (for `.lineSpacing` math at call sites).
    enum LineHeight {
        static let hero: CGFloat = 1.08
        static let title: CGFloat = 1.12
        static let section: CGFloat = 1.18
        static let serifBody: CGFloat = 1.45
        static let heading: CGFloat = 1.35
        static let body: CGFloat = 1.6
        static let callout: CGFloat = 1.55
        static let caption: CGFloat = 1.45
        static let eyebrow: CGFloat = 1.4
        static let actionLabel: CGFloat = 1.3
    }

    // MARK: - Weight → bundled face

    private static func newsreaderFace(for w: Font.Weight) -> String {
        switch w {
        case .ultraLight, .thin, .light:    return "Newsreader-Light"
        case .regular:                      return "Newsreader-Regular"
        case .medium:                       return "Newsreader-Medium"
        case .semibold, .bold, .heavy, .black: return "Newsreader-SemiBold"
        default:                            return "Newsreader-Regular"
        }
    }

    private static func interFace(for w: Font.Weight) -> String {
        switch w {
        case .ultraLight, .thin, .light: return "Inter18pt-Light"
        case .regular:                   return "Inter18pt-Regular"
        case .medium:                    return "Inter18pt-Medium"
        case .semibold:                  return "Inter18pt-SemiBold"
        case .bold, .heavy, .black:      return "Inter18pt-Bold"
        default:                         return "Inter18pt-Regular"
        }
    }
}
