import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
});

export const metadata = {
  title: "GPCL Transfer Tracker",
  description: "GPCL transfer window tracker and lock calculator",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={inter.className}>
      <body
        className="bg-neutral-900 text-neutral-100 antialiased overflow-y-scroll"
        suppressHydrationWarning
      >
        {children}
      </body>
    </html>
  );
}
