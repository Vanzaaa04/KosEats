import "./globals.css";

export const metadata = {
  title: "KosEats — Gak Pake Ribet, Makanan Enak Langsung Mendarat di Kamar",
  description:
    "Marketplace masakan rumahan hiperlokal #1 untuk anak kos. Pesan makanan murah, dekat, dan transparan gizinya.",
  keywords: "pesan makan murah Malang, makanan kos, masakan rumahan, KosEats",
};

export default function RootLayout({ children }) {
  return (
    <html lang="id" data-scroll-behavior="smooth">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800&display=swap"
          rel="stylesheet"
        />
        <link rel="icon" href="/logo.png" />
      </head>
      <body>{children}</body>
    </html>
  );
}
