import SwiftUI

/// CitiGrove type system — serif display + sans text, the luxury-editorial
/// pairing citigrove.com uses (Playfair Display + Inter).
///
/// The two `provider` functions are the ONLY place the families are chosen.
/// They currently use the system serif (New York) + sans (SF Pro) as the
/// bundled-font placeholder; when Playfair Display + Inter `.ttf`s are added to
/// Resources/Fonts and registered, swap these two functions to `.custom(...)`
/// and the whole app re-skins. (No call site hardcodes a font.)
enum CGType {
    static func display(_ size: CGFloat, _ weight: Font.Weight = .semibold) -> Font {
        .system(size: size, weight: weight, design: .serif)
    }
    static func text(_ size: CGFloat, _ weight: Font.Weight = .regular) -> Font {
        .system(size: size, weight: weight, design: .default)
    }

    // Roles (sizes mirror citigrove.com's scale).
    static var hero: Font     { display(40, .semibold) }
    static var title: Font    { display(28, .semibold) }
    static var section: Font  { display(22, .medium) }
    static var serifBody: Font { display(18, .regular) }
    static var heading: Font  { text(17, .semibold) }
    static var body: Font     { text(16, .regular) }
    static var callout: Font  { text(15, .regular) }
    static var caption: Font  { text(13, .regular) }
    static var eyebrow: Font  { text(11, .semibold) }
}
