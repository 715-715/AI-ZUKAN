import "./globals.css";
import AgeGate from "@/components/AgeGate";

export const metadata = {
  title: "AI美女図鑑",
  description: "AIモデルのプロフィール図鑑",
};

export default function RootLayout({ children }) {
  return (
    <html lang="ja">
      <body>
        <AgeGate>{children}</AgeGate>
      </body>
    </html>
  );
}
