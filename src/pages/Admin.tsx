import { useState } from 'react';
import { Routes, Route, Link, useLocation, Navigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  LayoutDashboard, Package, Ticket, Users, ShoppingCart, 
  Trophy, Settings, Bell, Bot, FileText, LogOut, Menu, X,
  ChevronRight
} from 'lucide-react';

// Admin sub-pages
import AdminDashboard from '@/components/admin/AdminDashboard';
import AdminProducts from '@/components/admin/AdminProducts';
import AdminTickets from '@/components/admin/AdminTickets';
import AdminPurchases from '@/components/admin/AdminPurchases';
import AdminSellers from '@/components/admin/AdminSellers';
import AdminDraw from '@/components/admin/AdminDraw';
import AdminKnowledgeBase from '@/components/admin/AdminKnowledgeBase';
import AdminSettings from '@/components/admin/AdminSettings';

const menuItems = [
  { path: '/admin', icon: LayoutDashboard, label: 'Dashboard', end: true },
  { path: '/admin/products', icon: Package, label: 'Productos' },
  { path: '/admin/tickets', icon: Ticket, label: 'Pool Tickets' },
  { path: '/admin/purchases', icon: ShoppingCart, label: 'Compras' },
  { path: '/admin/sellers', icon: Users, label: 'Vendedores' },
  { path: '/admin/draw', icon: Trophy, label: 'Sorteo' },
  { path: '/admin/kb', icon: Bot, label: 'Base Conocimientos' },
  { path: '/admin/settings', icon: Settings, label: 'Configuración' },
];

export default function Admin() {
  const { signOut } = useAuth();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const isActive = (path: string, end?: boolean) => {
    if (end) {
      return location.pathname === path;
    }
    return location.pathname.startsWith(path);
  };

  return (
    <div className="min-h-screen bg-gray-900 flex">
      {/* Mobile sidebar toggle */}
      <Button
        variant="ghost"
        size="icon"
        className="fixed top-4 left-4 z-50 lg:hidden text-white"
        onClick={() => setSidebarOpen(!sidebarOpen)}
      >
        {sidebarOpen ? <X /> : <Menu />}
      </Button>

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 w-64 bg-gray-800 transform transition-transform duration-200 ease-in-out lg:translate-x-0 lg:static ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="p-6 border-b border-gray-700">
            <Link to="/admin" className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-skyworth-gold to-yellow-600 rounded-lg flex items-center justify-center">
                <span className="text-skyworth-dark font-bold text-lg">S</span>
              </div>
              <div>
                <h1 className="font-bold text-white">Skyworth</h1>
                <p className="text-xs text-gray-400">Admin Panel</p>
              </div>
            </Link>
          </div>

          {/* Navigation */}
          <ScrollArea className="flex-1 p-4">
            <nav className="space-y-1">
              {menuItems.map((item) => {
                const Icon = item.icon;
                const active = isActive(item.path, item.end);
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={() => setSidebarOpen(false)}
                    className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                      active
                        ? 'bg-skyworth-gold text-skyworth-dark font-medium'
                        : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                    }`}
                  >
                    <Icon className="h-5 w-5" />
                    <span>{item.label}</span>
                    {active && <ChevronRight className="h-4 w-4 ml-auto" />}
                  </Link>
                );
              })}
            </nav>
          </ScrollArea>

          {/* Footer */}
          <div className="p-4 border-t border-gray-700">
            <Button
              variant="ghost"
              className="w-full justify-start text-gray-400 hover:text-white hover:bg-gray-700"
              onClick={() => signOut()}
            >
              <LogOut className="h-5 w-5 mr-3" />
              Cerrar Sesión
            </Button>
          </div>
        </div>
      </aside>

      {/* Overlay for mobile */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        <div className="p-6 lg:p-8">
          <Routes>
            <Route index element={<AdminDashboard />} />
            <Route path="products" element={<AdminProducts />} />
            <Route path="tickets" element={<AdminTickets />} />
            <Route path="purchases" element={<AdminPurchases />} />
            <Route path="sellers" element={<AdminSellers />} />
            <Route path="draw" element={<AdminDraw />} />
            <Route path="kb" element={<AdminKnowledgeBase />} />
            <Route path="settings" element={<AdminSettings />} />
            <Route path="*" element={<Navigate to="/admin" replace />} />
          </Routes>
        </div>
      </main>
    </div>
  );
}
