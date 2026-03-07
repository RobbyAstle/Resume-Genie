import type { Metadata } from "next"
import { Geist, Geist_Mono } from "next/font/google"
import Image from "next/image"
import Link from "next/link"
import { Home, Settings, User } from "lucide-react"
import { Toaster } from "@/components/ui/sonner"
import "./globals.css"

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
})

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
})

export const metadata: Metadata = {
  title: "Resume Genie",
  description: "AI-powered resume and interview preparation tool",
}

const navLinks = [
  { href: "/", label: "Home", icon: Home },
  { href: "/profile", label: "Profile", icon: User },
  { href: "/settings", label: "Settings", icon: Settings },
]

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <div className="flex h-screen overflow-hidden">
          {/* Sidebar */}
          <aside className="hidden md:flex flex-col w-56 border-r bg-sidebar shrink-0">
            <div className="flex items-center gap-2 px-4 py-5 border-b">
              <Image src="/Resume Genie.PNG" alt="Resume Genie logo" width={40} height={40} className="size-10" />
              <span className="font-semibold text-sm tracking-tight">
                Resume Genie
              </span>
            </div>
            <nav className="flex flex-col gap-1 p-3 flex-1">
              {navLinks.map(({ href, label, icon: Icon }) => (
                <Link
                  key={href}
                  href={href}
                  className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors"
                >
                  <Icon className="size-4" />
                  {label}
                </Link>
              ))}
            </nav>
          </aside>

          {/* Mobile top bar */}
          <div className="md:hidden fixed top-0 left-0 right-0 z-50 flex items-center gap-3 px-4 py-3 border-b bg-background">
            <Image src="/Resume Genie.PNG" alt="Resume Genie logo" width={32} height={32} className="size-8" />
            <span className="font-semibold text-sm">Resume Genie</span>
            <nav className="flex items-center gap-4 ml-auto">
              {navLinks.map(({ href, icon: Icon, label }) => (
                <Link key={href} href={href} title={label}>
                  <Icon className="size-4" />
                </Link>
              ))}
            </nav>
          </div>

          {/* Main content */}
          <main className="flex-1 overflow-auto pt-14 md:pt-0">
            {children}
          </main>
        </div>

        <Toaster richColors closeButton />
      </body>
    </html>
  )
}
