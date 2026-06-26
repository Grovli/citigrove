import SwiftUI

/// The bag. Subtotal is a display-only preview; the server (citigrove-store-api)
/// re-prices and adds tax + carrier shipping at checkout. Checkout is gated on
/// auth and settled via Apple Pay (Phase 2) — never IAP (physical goods).
struct BagView: View {
    @EnvironmentObject private var bag: BagStore
    @EnvironmentObject private var auth: AuthManager
    @StateObject private var applePay = ApplePayCheckout()
    @State private var showConfirmation = false
    @State private var checkoutError: String?

    var body: some View {
        Group {
            if bag.isEmpty {
                emptyState
            } else {
                filled
            }
        }
        .background(CGColors.page)
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            ToolbarItem(placement: .principal) {
                Text("Bag").font(CGType.display(20, .medium)).foregroundStyle(CGColors.ink)
            }
        }
        .alert("Order placed", isPresented: $showConfirmation) {
            Button("Done", role: .cancel) {}
        } message: {
            Text("Thank you — we'll email your receipt and shipping details.")
        }
        .alert(
            "Checkout",
            isPresented: Binding(get: { checkoutError != nil }, set: { if !$0 { checkoutError = nil } }))
        {
            Button("OK", role: .cancel) { checkoutError = nil }
        } message: {
            Text(checkoutError ?? "")
        }
    }

    private func startCheckout() {
        guard auth.user != nil else { auth.signIn(); return }
        let items = bag.lines.map { CheckoutCartItem(sku: $0.product.id, quantity: $0.quantity) }
        applePay.start(items: items) { outcome in
            switch outcome {
            case .success:
                bag.clear()
                showConfirmation = true
            case .cancelled:
                break
            case .failed(let message):
                checkoutError = message
            }
        }
    }

    private var checkoutLabel: String {
        if auth.user == nil { return "Sign in to check out" }
        if applePay.isBusy { return "Processing…" }
        return "Check out"
    }

    private var emptyState: some View {
        VStack {
            Spacer()
            CGEmptyState(
                icon: "cart",
                title: "Your bag is empty",
                message: "When you find something worth keeping, it'll wait for you here."
            )
            Spacer()
            Spacer()
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }

    private var filled: some View {
        ScrollView {
            VStack(spacing: CGSpace.md) {
                ForEach(bag.lines) { line in
                    BagLineRow(line: line)
                }
                summary
            }
            .padding(.horizontal, CGSpace.lg)
            .padding(.top, CGSpace.sm)
            .padding(.bottom, CGSpace.xxl)
        }
        .scrollIndicators(.hidden)
    }

    private var summary: some View {
        VStack(alignment: .leading, spacing: CGSpace.md) {
            HStack {
                Text("Subtotal").font(CGType.body).foregroundStyle(CGColors.inkSoft)
                Spacer()
                Text(CGMoney.string(bag.subtotalCents))
                    .font(CGType.text(17, .semibold))
                    .foregroundStyle(CGColors.ink)
            }
            Text("Shipping and tax are calculated at checkout.")
                .font(CGType.caption)
                .foregroundStyle(CGColors.inkFaint)
            Button { startCheckout() } label: {
                Text(checkoutLabel)
            }
            .buttonStyle(.cgPrimary)
            .disabled(applePay.isBusy)
        }
        .cgCard()
        .padding(.top, CGSpace.sm)
    }
}

private struct BagLineRow: View {
    @EnvironmentObject private var bag: BagStore
    let line: BagLine

    var body: some View {
        HStack(spacing: CGSpace.md) {
            RoundedRectangle(cornerRadius: CGRadius.md, style: .continuous)
                .fill(CGColors.primary.opacity(0.16))
                .frame(width: 60, height: 60)
                .overlay(
                    Image(systemName: line.product.category.glyph)
                        .font(.system(size: 20, weight: .light))
                        .foregroundStyle(CGColors.primaryDeep)
                )
            VStack(alignment: .leading, spacing: 3) {
                Text(line.product.name)
                    .font(CGType.display(16, .medium))
                    .foregroundStyle(CGColors.ink)
                    .fixedSize(horizontal: false, vertical: true)
                Text(CGMoney.string(line.product.priceCents))
                    .font(CGType.caption)
                    .foregroundStyle(CGColors.inkSoft)
            }
            Spacer(minLength: CGSpace.sm)
            stepper
        }
        .cgCard(padding: CGSpace.md)
    }

    private var stepper: some View {
        HStack(spacing: CGSpace.md) {
            Button { bag.setQuantity(line.quantity - 1, for: line) } label: {
                Image(systemName: "minus").font(.system(size: 12, weight: .semibold))
            }
            Text("\(line.quantity)")
                .font(CGType.text(14, .semibold))
                .foregroundStyle(CGColors.ink)
                .frame(minWidth: 16)
            Button { bag.setQuantity(line.quantity + 1, for: line) } label: {
                Image(systemName: "plus").font(.system(size: 12, weight: .semibold))
            }
        }
        .foregroundStyle(CGColors.primaryDeep)
        .padding(.horizontal, CGSpace.md)
        .padding(.vertical, CGSpace.sm)
        .overlay(
            RoundedRectangle(cornerRadius: CGRadius.sm, style: .continuous)
                .strokeBorder(CGColors.line, lineWidth: 1)
        )
    }
}
