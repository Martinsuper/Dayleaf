// Reproducible vector drawing for the macOS icon. Run: swift scripts/generate-icon.swift
import AppKit
let size = 1024
let bitmap = NSBitmapImageRep(bitmapDataPlanes: nil, pixelsWide: size, pixelsHigh: size, bitsPerSample: 8, samplesPerPixel: 4, hasAlpha: true, isPlanar: false, colorSpaceName: .deviceRGB, bytesPerRow: 0, bitsPerPixel: 0)!
NSGraphicsContext.saveGraphicsState()
NSGraphicsContext.current = NSGraphicsContext(bitmapImageRep: bitmap)
func color(_ r: CGFloat, _ g: CGFloat, _ b: CGFloat) -> NSColor { NSColor(srgbRed:r, green:g, blue:b, alpha:1) }
let base = NSBezierPath(roundedRect:NSRect(x:64,y:64,width:896,height:896),xRadius:205,yRadius:205)
NSGradient(starting:color(0.15,0.36,0.29),ending:color(0.055,0.20,0.17))!.draw(in:base,angle:-90)
NSGraphicsContext.saveGraphicsState()
let shadow = NSShadow(); shadow.shadowColor = NSColor.black.withAlphaComponent(0.24); shadow.shadowBlurRadius = 35; shadow.shadowOffset = NSSize(width:0,height:-16); shadow.set()
color(0.98,0.96,0.87).setFill()
NSBezierPath(roundedRect:NSRect(x:272,y:226,width:480,height:588),xRadius:54,yRadius:54).fill()
NSGraphicsContext.restoreGraphicsState()
color(0.83,0.86,0.76).setFill()
NSBezierPath(roundedRect:NSRect(x:326,y:226,width:12,height:588),xRadius:6,yRadius:6).fill()
color(0.57,0.65,0.55).setStroke()
for y in [360,424] { let line=NSBezierPath(); line.lineWidth=17; line.lineCapStyle = .round; line.move(to:NSPoint(x:393,y:y)); line.line(to:NSPoint(x:635,y:y)); line.stroke() }
let leaf=NSBezierPath(); leaf.move(to:NSPoint(x:465,y:501)); leaf.curve(to:NSPoint(x:678,y:719),controlPoint1:NSPoint(x:414,y:657),controlPoint2:NSPoint(x:567,y:749)); leaf.curve(to:NSPoint(x:465,y:501),controlPoint1:NSPoint(x:705,y:571),controlPoint2:NSPoint(x:602,y:484)); leaf.close()
NSGradient(starting:color(0.42,0.64,0.35),ending:color(0.68,0.80,0.45))!.draw(in:leaf,angle:45)
color(0.22,0.42,0.30).setStroke(); let stem=NSBezierPath(); stem.lineWidth=14; stem.lineCapStyle = .round; stem.move(to:NSPoint(x:437,y:484)); stem.curve(to:NSPoint(x:620,y:666),controlPoint1:NSPoint(x:496,y:552),controlPoint2:NSPoint(x:553,y:601)); stem.stroke()
NSGraphicsContext.restoreGraphicsState()
let data=bitmap.representation(using:.png,properties:[:])!
for path in ["build/icon.png", "src/renderer/assets/icons/app-icon.png", "website/img/app-icon.png"] { try data.write(to:URL(fileURLWithPath:path)) }
