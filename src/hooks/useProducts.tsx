import { useQuery } from '@tanstack/react-query';
import apiService from '@/services/apiService';

export interface Product {
  id: number;
  nombre: string;
  modelo: string;
  tamanoPulgadas: number;
  multiplicadorCupones: number;
  descripcion: string;
  activo: boolean;
}

export function useProducts() {
  return useQuery({
    queryKey: ['products'],
    queryFn: async (): Promise<Product[]> => {
      // Fetch all products (admin endpoint returns all, optionally filtered by active)
      // Since this hook might be used by admin, we want all. 
      // If used by public, we might want only active.
      // The previous implementation fetched only active=true. 
      // User complaint was "products not fetching". 
      // Let's default to fetching all for now as this seems to be for Admin management mostly based on previous usage.
      // But wait, useProducts was widely used?
      // AdminProducts uses its own query usually? No, AdminProducts.tsx has its own useQuery using 'admin-products'.
      
      // Let's make this hook flexible or just for the public/general use.
      // If this is for admin list, api/admin/productos returns all.
      // Let's assume this hooking is for general use, so maybe list active only?
      // Actually AdminProducts.tsx defines its OWN query.
      // So this file might be for other components.
      
      // Let's align with the backend. 
      const response = await apiService.get<Product[]>('/api/admin/productos?activo=true');
      return response.data;
    },
    staleTime: 1000 * 60 * 5,
  });
}
