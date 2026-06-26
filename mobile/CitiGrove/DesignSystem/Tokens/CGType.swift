import SwiftUI

/// CitiGrove type system — Newsreader editorial serif + Inter, the exact pairing
/// citigrove.com uses (the "Ffern register"). Display headlines are LIGHT serif
/// (regular/medium, never bold); body + dense UI are Inter.
///
/// Every call site routes through this semantic layer. The generated
/// `CitiGroveTypeTokens` — built from `design-tokens/tokens/typography.citigrove.json`
/// and synced into this repo — is the single source of truth, so the app and the
/// site can no longer drift on type, weight, or tracking (mirrors how `CGColors`
/// rests on `CitiGroveColorTokens`). To retune, edit the token JSON and re-run
/// `npm run tokens`; never hardcode a font or size here.
enum CGType {

    // MARK: - Family composers (arbitrary size/weight)

    /// Newsreader editorial serif. Default weight is REGULAR — the light
    /// editorial register, not the old system-serif semibold.
    static func display(_ size: CGFloat, _ weight: Font.Weight = .regular) -> Font {
        CitiGroveTypeTokens.displayFont(size, weight)
    }

    /// Inter sans — body + dense numeric UI.
    static func text(_ size: CGFloat, _ weight: Font.Weight = .regular) -> Font {
        CitiGroveTypeTokens.textFont(size, weight)
    }

    /// Newsreader italic — pull-quotes and editorial emphasis (site blockquote).
    static func serifItalic(_ size: CGFloat, _ weight: Font.Weight = .regular) -> Font {
        CitiGroveTypeTokens.serifItalic(size, weight)
    }

    // MARK: - Semantic roles (the type scale — single-sourced)

    static var hero: Font        { CitiGroveTypeTokens.hero }
    static var title: Font       { CitiGroveTypeTokens.title }
    static var section: Font     { CitiGroveTypeTokens.section }
    static var serifBody: Font   { CitiGroveTypeTokens.serifBody }
    static var heading: Font     { CitiGroveTypeTokens.heading }
    static var body: Font        { CitiGroveTypeTokens.body }
    static var callout: Font     { CitiGroveTypeTokens.callout }
    static var caption: Font     { CitiGroveTypeTokens.caption }
    static var eyebrow: Font     { CitiGroveTypeTokens.eyebrow }
    static var actionLabel: Font { CitiGroveTypeTokens.actionLabel }

    // MARK: - Per-role metrics a Font can't carry

    /// Letter-spacing in points per role. Apply via `.tracking(CGType.Tracking.eyebrow)`.
    typealias Tracking = CitiGroveTypeTokens.Tracking
    /// Line-height multiplier per role (for `.lineSpacing` math).
    typealias LineHeight = CitiGroveTypeTokens.LineHeight
}
