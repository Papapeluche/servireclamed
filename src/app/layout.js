import "./globals.css";

export const metadata = {
  title: "ServiReclaMed",
  description: "Digitación y gestión de reclamaciones médicas para ARS",
  manifest: "/manifest.webmanifest",
};

export const viewport = {
  themeColor: "#1d4ed8",
};

export default function RootLayout({ children }) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
