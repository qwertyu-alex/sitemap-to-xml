export class FaviconManager {
  private static instance: FaviconManager
  private originalFavicon = "/favicon-32x32.png"
  private processingFavicon = "/favicon-processing.png"
  private currentFavicon: HTMLLinkElement | null = null
  private animationFrame: number | null = null
  private isProcessing = false

  private constructor() {
    if (typeof window !== "undefined") {
      this.currentFavicon = document.querySelector('link[rel="icon"]') || this.createFaviconLink()
    }
  }

  static getInstance(): FaviconManager {
    if (!FaviconManager.instance) {
      FaviconManager.instance = new FaviconManager()
    }
    return FaviconManager.instance
  }

  private createFaviconLink(): HTMLLinkElement {
    const link = document.createElement("link")
    link.rel = "icon"
    link.type = "image/png"
    link.href = this.originalFavicon
    document.head.appendChild(link)
    return link
  }

  private updateFavicon(href: string) {
    if (this.currentFavicon) {
      this.currentFavicon.href = href
    }
  }

  startProcessing() {
    if (this.isProcessing) return

    this.isProcessing = true
    this.animateProcessing()
  }

  stopProcessing() {
    this.isProcessing = false

    if (this.animationFrame) {
      cancelAnimationFrame(this.animationFrame)
      this.animationFrame = null
    }

    this.updateFavicon(this.originalFavicon)
  }

  private animateProcessing() {
    if (!this.isProcessing) return

    // Create a canvas to draw animated favicon
    const canvas = document.createElement("canvas")
    const ctx = canvas.getContext("2d")
    canvas.width = 32
    canvas.height = 32

    if (!ctx) return

    const img = new Image()
    img.crossOrigin = "anonymous"

    img.onload = () => {
      let rotation = 0

      const animate = () => {
        if (!this.isProcessing) return

        // Clear canvas
        ctx.clearRect(0, 0, 32, 32)

        // Draw base icon
        ctx.drawImage(img, 0, 0, 32, 32)

        // Draw spinning indicator
        ctx.save()
        ctx.translate(24, 8) // Top right corner
        ctx.rotate(rotation)

        // Draw spinning circle
        ctx.strokeStyle = "#3b82f6" // Blue color
        ctx.lineWidth = 2
        ctx.beginPath()
        ctx.arc(0, 0, 4, 0, Math.PI * 1.5)
        ctx.stroke()

        ctx.restore()

        // Update favicon
        const dataUrl = canvas.toDataURL("image/png")
        this.updateFavicon(dataUrl)

        rotation += 0.2
        this.animationFrame = requestAnimationFrame(animate)
      }

      animate()
    }

    img.src = this.originalFavicon
  }

  // Alternative simpler approach - just switch between two states
  startSimpleProcessing() {
    if (this.isProcessing) return

    this.isProcessing = true
    this.updateFavicon(this.processingFavicon)
  }

  stopSimpleProcessing() {
    this.isProcessing = false
    this.updateFavicon(this.originalFavicon)
  }
}

// Hook for React components
export const useFavicon = () => {
  const faviconManager = FaviconManager.getInstance()

  return {
    startProcessing: () => faviconManager.startProcessing(),
    stopProcessing: () => faviconManager.stopProcessing(),
    startSimpleProcessing: () => faviconManager.startSimpleProcessing(),
    stopSimpleProcessing: () => faviconManager.stopSimpleProcessing(),
  }
}
