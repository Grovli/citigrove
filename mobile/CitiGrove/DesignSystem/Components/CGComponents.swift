import SwiftUI

// MARK: - Eyebrow

/// Uppercase letterspaced micro-label — the site's editorial `label()` above a
/// heading. Muted ink by default (the site's restraint); pass `CGColors.accent`
/// or `.primaryDeep` for an actionable / "in season" accent.
struct CGEyebrow: View {
    let text: String
    var color: Color = CGColors.inkSoft
    var body: some View {
        Text(text.uppercased())
            .font(CGType.eyebrow)
            .tracking(CGType.Tracking.eyebrow)
            .foregroundStyle(color)
    }
}

// MARK: - Accent dot

/// The site's signature coral accent dot (status pills, "open", CTA tails).
struct CGDot: View {
    var color: Color = CGColors.accent
    var size: CGFloat = 6
    var body: some View {
        Circle().fill(color).frame(width: size, height: size)
    }
}

// MARK: - Hairline

/// Full-bleed 1px editorial divider — the site separates every section with one.
struct CGHairline: View {
    var body: some View {
        Rectangle().fill(CGColors.line).frame(height: 1)
    }
}

// MARK: - Section header

struct CGSectionHeader: View {
    let eyebrow: String
    let title: String
    var eyebrowColor: Color = CGColors.inkSoft
    var body: some View {
        VStack(alignment: .leading, spacing: CGSpace.sm) {
            CGEyebrow(text: eyebrow, color: eyebrowColor)
            Text(title)
                .font(CGType.section)
                .foregroundStyle(CGColors.ink)
                .fixedSize(horizontal: false, vertical: true)
        }
    }
}

// MARK: - Editorial link

/// The site's uppercase coral link with a trailing arrow — "Read the Journal ↗".
/// Use for inline navigational affordances. Wrap in a Button for taps.
struct CGTextLink: View {
    let text: String
    var arrow: String = "↗"
    var color: Color = CGColors.primaryDeep
    var body: some View {
        HStack(spacing: 5) {
            Text(text.uppercased())
                .font(CGType.eyebrow)
                .tracking(CGType.Tracking.eyebrow)
            Text(arrow).font(CGType.caption)
        }
        .foregroundStyle(color)
    }
}

// MARK: - Tonal band

/// A full-width tonal feature band — the site's signature section (peach hero,
/// sage Grovli chapter, peach membership CTA). Hairline top + bottom, generous
/// vertical rhythm, ink (or cream in dark) riding on the warm tone. Caller
/// supplies the content: eyebrow + light serif headline + body + CTA.
struct CGTonalBand<Content: View>: View {
    var tone: Color = CGColors.peach
    var hairlineTop: Bool = true
    var hairlineBottom: Bool = true
    @ViewBuilder var content: () -> Content
    var body: some View {
        content()
            .frame(maxWidth: .infinity, alignment: .leading)
            .padding(.horizontal, CGSpace.xl)
            .padding(.vertical, CGSpace.xxxl)
            .frame(maxWidth: .infinity)
            .background(tone)
            .overlay(alignment: .top) { if hairlineTop { CGHairline() } }
            .overlay(alignment: .bottom) { if hairlineBottom { CGHairline() } }
    }
}

// MARK: - Card surface

struct CGCardSurface: ViewModifier {
    var padding: CGFloat = CGSpace.lg
    func body(content: Content) -> some View {
        content
            .padding(padding)
            .background(CGColors.surface)
            .clipShape(RoundedRectangle(cornerRadius: CGRadius.md, style: .continuous))
            .overlay(
                RoundedRectangle(cornerRadius: CGRadius.md, style: .continuous)
                    .strokeBorder(CGColors.line, lineWidth: 0.5)
            )
    }
}

extension View {
    /// Squared editorial surface — site card (radius 3, hairline border). Reserve
    /// for genuinely raised panels; prefer top-hairline cells for lists/grids.
    func cgCard(padding: CGFloat = CGSpace.lg) -> some View {
        modifier(CGCardSurface(padding: padding))
    }
}

// MARK: - Buttons

/// Primary CTA — ink fill, cream text, UPPERCASE letterspaced, near-square.
/// Mirrors the site's `background: ink; color: cream; letter-spacing: 0.16em;
/// border-radius: 2`. No pill, no scale-bounce — the Ffern restraint.
struct CGPrimaryButtonStyle: ButtonStyle {
    var fullWidth: Bool = true
    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .font(CGType.actionLabel)
            .textCase(.uppercase)
            .tracking(CGType.Tracking.actionLabel)
            .foregroundStyle(CGColors.onChrome)
            .padding(.vertical, 16)
            .padding(.horizontal, 28)
            .frame(maxWidth: fullWidth ? .infinity : nil)
            .background(CGColors.chrome)
            .clipShape(RoundedRectangle(cornerRadius: CGRadius.sm, style: .continuous))
            .opacity(configuration.isPressed ? 0.9 : 1)
            .animation(.easeOut(duration: 0.15), value: configuration.isPressed)
    }
}

/// Secondary — quiet squared outline, deep-terracotta text.
struct CGSecondaryButtonStyle: ButtonStyle {
    var fullWidth: Bool = false
    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .font(CGType.actionLabel)
            .textCase(.uppercase)
            .tracking(CGType.Tracking.actionLabel)
            .foregroundStyle(CGColors.primaryDeep)
            .padding(.vertical, 15)
            .padding(.horizontal, 24)
            .frame(maxWidth: fullWidth ? .infinity : nil)
            .overlay(
                RoundedRectangle(cornerRadius: CGRadius.sm, style: .continuous)
                    .strokeBorder(CGColors.line, lineWidth: 1)
            )
            .opacity(configuration.isPressed ? 0.7 : 1)
            .animation(.easeOut(duration: 0.15), value: configuration.isPressed)
    }
}

extension ButtonStyle where Self == CGPrimaryButtonStyle {
    static var cgPrimary: CGPrimaryButtonStyle { CGPrimaryButtonStyle() }
    static func cgPrimary(fullWidth: Bool) -> CGPrimaryButtonStyle { CGPrimaryButtonStyle(fullWidth: fullWidth) }
}
extension ButtonStyle where Self == CGSecondaryButtonStyle {
    static var cgSecondary: CGSecondaryButtonStyle { CGSecondaryButtonStyle() }
}

// MARK: - Empty state

struct CGEmptyState: View {
    let icon: String
    let title: String
    let message: String
    var body: some View {
        VStack(spacing: CGSpace.md) {
            Image(systemName: icon)
                .font(.system(size: 28, weight: .light))
                .foregroundStyle(CGColors.primaryDeep)
            Text(title)
                .font(CGType.section)
                .foregroundStyle(CGColors.ink)
            Text(message)
                .font(CGType.callout)
                .foregroundStyle(CGColors.inkSoft)
                .multilineTextAlignment(.center)
        }
        .frame(maxWidth: 320)
        .padding(CGSpace.xl)
    }
}
