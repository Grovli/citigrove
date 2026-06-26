#!/usr/bin/env swift
// Generates the placeholder CitiGrove app icon — a chrome (#28332C) square with
// a cream serif "CG". Run: swift scripts/generate_app_icon.swift <out.png>
// Replace when the real CitiGrove logo is designed.
import AppKit
import Foundation

let outPath = CommandLine.arguments.count > 1
    ? CommandLine.arguments[1]
    : "CitiGrove/Resources/Assets.xcassets/AppIcon.appiconset/AppIcon.png"

let side: CGFloat = 1024
let image = NSImage(size: NSSize(width: side, height: side))
image.lockFocus()

NSColor(srgbRed: 0.157, green: 0.200, blue: 0.173, alpha: 1).setFill() // chrome
NSBezierPath(rect: NSRect(x: 0, y: 0, width: side, height: side)).fill()

let cream = NSColor(srgbRed: 0.957, green: 0.949, blue: 0.918, alpha: 1)
let font = NSFont(name: "Georgia-Bold", size: 520)
    ?? NSFont(name: "TimesNewRomanPS-BoldMT", size: 520)
    ?? NSFont.boldSystemFont(ofSize: 520)
let paragraph = NSMutableParagraphStyle()
paragraph.alignment = .center
let attrs: [NSAttributedString.Key: Any] = [
    .foregroundColor: cream,
    .font: font,
    .paragraphStyle: paragraph,
    .kern: 12.0,
]
let text = "CG" as NSString
let textSize = text.size(withAttributes: attrs)
text.draw(
    in: NSRect(x: 0, y: (side - textSize.height) / 2, width: side, height: textSize.height),
    withAttributes: attrs
)

image.unlockFocus()

guard let tiff = image.tiffRepresentation,
      let rep = NSBitmapImageRep(data: tiff),
      let png = rep.representation(using: .png, properties: [:]) else {
    FileHandle.standardError.write(Data("icon render failed\n".utf8))
    exit(1)
}
try png.write(to: URL(fileURLWithPath: outPath))
print("wrote \(outPath)")
