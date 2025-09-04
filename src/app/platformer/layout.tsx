
export default function PlatformerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="platformer-bg min-h-screen">
      {children}
    </div>
  );
}
