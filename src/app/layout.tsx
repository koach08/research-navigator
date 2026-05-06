import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Research Navigator",
  description: "文献管理・分析ダッシュボード",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja" className="dark">
      <body
        className="antialiased bg-zinc-950 text-white font-sans"
      >
        {children}
      </body>
    </html>
  );
}
