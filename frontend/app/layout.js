import "./globals.css";

export const metadata = {
  title: "Padosi — Good things live nearby",
  description: "Discover trusted local tutors, borrowable resources, and live neighbourhood vendors.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
