export default function PlatformerLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body className="platformer-bg">
        {children}
      </body>
    </html>
  );
}
