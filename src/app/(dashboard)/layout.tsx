export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen bg-heritage-cream">
      {/* Sidebar placeholder */}
      <aside className="w-64 bg-heritage-dark text-heritage-cream shrink-0" />
      <main className="flex-1 p-8">{children}</main>
    </div>
  );
}
