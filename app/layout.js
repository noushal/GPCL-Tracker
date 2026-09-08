import { Inter } from "next/font/google";
import "./globals.css";
import UsernameGate from "@/components/UsernameGate";

const inter = Inter({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
});

export const metadata = {
  title: "GPCL Transfer Tracker",
  description: "GPCL transfer window tracker and lock calculator",
  icons: {
    icon: [
      { url: "/icon.svg", type: "image/svg+xml" },
      { url: "/icon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/favicon.ico", sizes: "any" },
    ],
    apple: "/apple-touch-icon.png",
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={inter.className}>
      <body
        className="bg-neutral-900 text-neutral-100 antialiased overflow-y-scroll"
        suppressHydrationWarning
      >
        {children}
        <UsernameGate />
      </body>
    </html>
  );
}
