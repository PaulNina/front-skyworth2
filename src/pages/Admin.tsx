import { useState } from 'react';
import { Routes, Route, Link, useLocation, Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  LayoutDashboard, Package, Users, ShoppingCart, 
  Trophy, Settings, Bot, FileText, LogOut, Menu, X,
  ChevronRight, Gift, Store, TrendingUp, MessageCircle, PanelLeftClose
} from 'lucide-react';

// Admin sub-pages
import AdminDashboard from '@/components/admin/AdminDashboard';
import AdminProducts from '@/components/admin/AdminProducts';
import AdminCustomerPurchases from '@/components/admin/AdminCustomerPurchases';
import AdminVendorSales from '@/components/admin/AdminVendorSales';
import AdminSellers from '@/components/admin/AdminSellers';
import AdminDraw from '@/components/admin/AdminDraw';
import AdminKnowledgeBase from '@/components/admin/AdminKnowledgeBase';
import AdminSettings from '@/components/admin/AdminSettings';
import AdminSerialRegistry from '@/components/admin/AdminSerialRegistry';
import AdminCoupons from '@/components/admin/AdminCoupons';
import AdminRanking from '@/components/admin/AdminRanking';
import AdminWhatsApp from './AdminWhatsApp';

const menuItems = [
  { path: '/admin/dashboard', icon: LayoutDashboard, label: 'Dashboard', end: true },
  { path: '/admin/products', icon: Package, label: 'Productos' },
  { path: '/admin/serials', icon: FileText, label: 'Seriales TV' },
  { path: '/admin/coupons', icon: Gift, label: 'Cupones' },
  { path: '/admin/purchases/customers', icon: ShoppingCart, label: 'Compras Clientes' },
  { path: '/admin/purchases/vendors', icon: Store, label: 'Ventas Vendedores' },
  { path: '/admin/ranking', icon: TrendingUp, label: 'Ranking Vendedores' },
  { path: '/admin/sellers', icon: Users, label: 'Vendedores' },
  { path: '/admin/whatsapp-chat', icon: MessageCircle, label: 'Mensajes WhatsApp' },
  { path: '/admin/draw', icon: Trophy, label: 'Sorteo' },
  { path: '/admin/kb', icon: Bot, label: 'Base Conocimientos' },
  { path: '/admin/settings', icon: Settings, label: 'Configuración' },
];

export default function Admin() {
  const { signOut } = useAuth();
  const location = useLocation();
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [desktopSidebarOpen, setDesktopSidebarOpen] = useState(true);

  const isActive = (path: string, end?: boolean) => {
    if (end) {
      return location.pathname === path;
    }
    return location.pathname.startsWith(path);
  };

  return (
    <div className="min-h-screen bg-gray-900 flex transition-all duration-300">
      {/* Mobile sidebar toggle */}
      <Button
        variant="ghost"
        size="icon"
        className="fixed top-4 left-4 z-50 lg:hidden text-white"
        onClick={() => setMobileSidebarOpen(!mobileSidebarOpen)}
      >
        {mobileSidebarOpen ? <X /> : <Menu />}
      </Button>

      {/* Desktop sidebar toggle (Visible when sidebar is closed) */}
      {!desktopSidebarOpen && (
        <Button
          variant="ghost"
          size="icon"
          className="fixed top-4 left-4 z-50 hidden lg:flex text-gray-500 hover:text-white bg-gray-800/50 hover:bg-gray-800 rounded-full"
          onClick={() => setDesktopSidebarOpen(true)}
          title="Mostrar Menú"
        >
          <Menu className="h-5 w-5" />
        </Button>
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-40 h-screen bg-gray-800 transform transition-all duration-300 ease-in-out w-64
          ${mobileSidebarOpen ? 'translate-x-0' : '-translate-x-full'} 
          ${desktopSidebarOpen ? 'lg:translate-x-0 lg:static' : 'lg:-translate-x-full lg:absolute'}
        `}
      >
        <div className="flex flex-col h-full overflow-hidden w-64">
          {/* Logo */}
          <div className="p-6 border-b border-gray-700 flex justify-between items-center">
            <Link to="/admin/dashboard" className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-skyworth-gold to-yellow-600 rounded-lg flex items-center justify-center">
                <span className="text-skyworth-dark font-bold text-lg">S</span>
              </div>
              <div className={`transition-opacity duration-200 ${!desktopSidebarOpen && 'lg:opacity-0'}`}>
                <h1 className="font-bold text-white">Skyworth</h1>
                <p className="text-xs text-gray-400">Admin Panel</p>
              </div>
            </Link>
            
             {/* Desktop Toggle Close */}
            <Button 
                variant="ghost" 
                size="icon" 
                className="hidden lg:flex text-gray-400 hover:text-white"
                onClick={() => setDesktopSidebarOpen(false)}
            >
                <PanelLeftClose className="h-5 w-5" />
            </Button>
             {/* Mobile Close */}
            <Button 
                variant="ghost" 
                size="icon" 
                className="lg:hidden text-gray-400 hover:text-white"
                onClick={() => setMobileSidebarOpen(false)}
            >
                <X className="h-5 w-5" />
            </Button>
          </div>

          {/* Navigation */}
          <ScrollArea className="flex-1 p-4 w-64">
            <nav className="space-y-1">
              {menuItems.map((item) => {
                const Icon = item.icon;
                const active = isActive(item.path, item.end);
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={() => setMobileSidebarOpen(false)}
                    className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                      active
                        ? 'bg-skyworth-gold text-skyworth-dark font-medium'
                        : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                    }`}
                  >
                    <Icon className="h-5 w-5 flex-shrink-0" />
                    <span className="whitespace-nowrap">{item.label}</span>
                    {active && <ChevronRight className="h-4 w-4 ml-auto" />}
                  </Link>
                );
              })}
            </nav>
          </ScrollArea>

          {/* Footer */}
          <div className="p-4 border-t border-gray-700 w-64">
            <Button
              variant="ghost"
              className="w-full justify-start text-gray-400 hover:text-white hover:bg-gray-700"
              onClick={async () => {
                await signOut();
              }}
            >
              <LogOut className="h-5 w-5 mr-3" />
              Cerrar Sesión
            </Button>
          </div>
        </div>
      </aside>

      {/* Overlay for mobile */}
      {mobileSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 lg:hidden"
          onClick={() => setMobileSidebarOpen(false)}
        />
      )}

      {/* Main Content */}
      <main className="flex-1 overflow-hidden h-screen bg-gray-900">
        <div className="p-4 lg:p-8 h-full overflow-y-auto">
          <Routes>
            <Route index element={<Navigate to="dashboard" replace />} />
            <Route path="dashboard" element={<AdminDashboard />} /> 
            <Route path="products" element={<AdminProducts />} />
            <Route path="serials" element={<AdminSerialRegistry />} />
            <Route path="coupons" element={<AdminCoupons />} />
            <Route path="purchases/customers" element={<AdminCustomerPurchases />} />
            <Route path="purchases/vendors" element={<AdminVendorSales />} />
            <Route path="ranking" element={<AdminRanking />} />
            <Route path="sellers" element={<AdminSellers />} />
            <Route path="whatsapp-chat" element={<AdminWhatsApp />} />
            <Route path="draw" element={<AdminDraw />} />
            <Route path="kb" element={<AdminKnowledgeBase />} />
            <Route path="settings" element={<AdminSettings />} />
            <Route path="*" element={<Navigate to="/admin/dashboard" replace />} />
          </Routes>
        </div>
      </main>
    </div>
  );
}
