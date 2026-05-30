import SidebarAdmin from "@/components/admin/SidebarAdmin";
import AdminRouteGuard from "@/components/admin/admin-route-guard";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AdminRouteGuard>
      <div className="min-h-screen bg-slate-50">
        <div className="flex flex-col lg:flex-row">
          <aside className="w-full border-b bg-white shadow-sm lg:min-h-screen lg:w-[280px] lg:border-b-0 lg:border-r">
            <SidebarAdmin />
          </aside>

          <main className="min-w-0 flex-1">
            <div className="p-0 lg:p-8">
              {children}
            </div>
          </main>
        </div>
      </div>
    </AdminRouteGuard>
  );
}
