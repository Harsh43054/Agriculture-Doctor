import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Agriculture Doctor · Your field, understood",
  description: "Plant photo assessments, private field records, soil readings, and local weather in one farming workspace.",
};
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
