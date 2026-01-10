import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, ShoppingCart, Ticket, TrendingUp } from 'lucide-react';

export default function AdminDashboard() {
  return (
    <div>
      <h1 className="text-3xl font-bold text-white mb-8">Dashboard</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="bg-gray-800 border-gray-700">
          <CardHeader className="pb-2"><CardTitle className="text-gray-400 text-sm">Compras Registradas</CardTitle></CardHeader>
          <CardContent><div className="flex items-center gap-3"><ShoppingCart className="h-8 w-8 text-skyworth-gold" /><span className="text-3xl font-bold text-white">0</span></div></CardContent>
        </Card>
        <Card className="bg-gray-800 border-gray-700">
          <CardHeader className="pb-2"><CardTitle className="text-gray-400 text-sm">Tickets Asignados</CardTitle></CardHeader>
          <CardContent><div className="flex items-center gap-3"><Ticket className="h-8 w-8 text-skyworth-green" /><span className="text-3xl font-bold text-white">0</span></div></CardContent>
        </Card>
        <Card className="bg-gray-800 border-gray-700">
          <CardHeader className="pb-2"><CardTitle className="text-gray-400 text-sm">Vendedores</CardTitle></CardHeader>
          <CardContent><div className="flex items-center gap-3"><Users className="h-8 w-8 text-blue-400" /><span className="text-3xl font-bold text-white">0</span></div></CardContent>
        </Card>
        <Card className="bg-gray-800 border-gray-700">
          <CardHeader className="pb-2"><CardTitle className="text-gray-400 text-sm">Ventas Totales</CardTitle></CardHeader>
          <CardContent><div className="flex items-center gap-3"><TrendingUp className="h-8 w-8 text-purple-400" /><span className="text-3xl font-bold text-white">0</span></div></CardContent>
        </Card>
      </div>
      <p className="text-gray-400 mt-8 text-center">Panel de administración en desarrollo. Continúa pidiendo funcionalidades.</p>
    </div>
  );
}
