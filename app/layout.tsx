import type React from "react"
import type { Metadata } from "next"
import { GeistSans } from "geist/font/sans"
import { GeistMono } from "geist/font/mono"
import "./globals.css"

export const metadata: Metadata = {
  title: "Sitemap to CSV Converter",
  description: "Transform XML sitemaps into structured CSV data for analysis and reporting",
  generator: "v0.dev",
  openGraph: {
    title: "Sitemap to CSV Converter",
    description: "Transform XML sitemaps into structured CSV data for analysis and reporting",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Sitemap to CSV Converter",
      },
    ],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Sitemap to CSV Converter",
    description: "Transform XML sitemaps into structured CSV data for analysis and reporting",
    images: ["/og-image.png"],
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <head>
        <style>{`
html {
  font-family: ${GeistSans.style.fontFamily};
  --font-sans: ${GeistSans.variable};
  --font-mono: ${GeistMono.variable};
}
        `}</style>
      </head>
      <body>{children}</body>
    </html>
  )
}
