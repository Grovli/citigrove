import SwiftUI

/// A rendered block of an essay body.
enum JournalBlock {
    case heading(String)
    case subheading(String)
    case quote(String)
    case paragraph(AttributedString)
    case rule
}

/// Lightweight Markdown → blocks for the editorial reader. Handles headings,
/// blockquotes, rules, and inline emphasis/links per paragraph (via
/// AttributedString). Strips the document-api in-content CTA markers
/// (`{{SUBSCRIBE}}` / `{{TRY_GROVLI}}`) — the app renders its own Grovli CTA.
enum JournalMarkdown {
    static func blocks(from body: String) -> [JournalBlock] {
        let cleaned = body
            .replacingOccurrences(of: "{{SUBSCRIBE}}", with: "")
            .replacingOccurrences(of: "{{TRY_GROVLI}}", with: "")

        var blocks: [JournalBlock] = []
        for raw in cleaned.components(separatedBy: "\n\n") {
            let chunk = raw.trimmingCharacters(in: .whitespacesAndNewlines)
            if chunk.isEmpty { continue }

            if chunk == "---" || chunk == "***" || chunk == "___" {
                blocks.append(.rule)
            } else if chunk.hasPrefix("## ") {
                blocks.append(.heading(String(chunk.dropFirst(3))))
            } else if chunk.hasPrefix("### ") {
                blocks.append(.subheading(String(chunk.dropFirst(4))))
            } else if chunk.hasPrefix("# ") {
                blocks.append(.heading(String(chunk.dropFirst(2))))
            } else if chunk.hasPrefix("> ") {
                let quoted = chunk
                    .split(separator: "\n")
                    .map { line in line.hasPrefix("> ") ? String(line.dropFirst(2)) : String(line) }
                    .joined(separator: " ")
                blocks.append(.quote(quoted))
            } else {
                blocks.append(.paragraph(inline(chunk)))
            }
        }
        return blocks
    }

    private static func inline(_ text: String) -> AttributedString {
        let options = AttributedString.MarkdownParsingOptions(
            interpretedSyntax: .inlineOnlyPreservingWhitespace,
            failurePolicy: .returnPartiallyParsedIfPossible
        )
        return (try? AttributedString(markdown: text, options: options)) ?? AttributedString(text)
    }
}
