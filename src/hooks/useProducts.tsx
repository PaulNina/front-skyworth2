import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface Product {
  id: string;
  model_name: string;
  description: string | null;
  screen_size: number | null;
  tier: string;
  ticket_multiplier: number;
  points_value: number;
  image_url: string | null;
  is_active: boolean;
}

export function useProducts() {
  return useQuery({
    queryKey: ['products'],
    queryFn: async (): Promise<Product[]> => {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('is_active', true)
        .order('screen_size', { ascending: true });

      if (error) {
        console.error('Error fetching products:', error);
        throw error;
      }

      return data || [];
    },
    staleTime: 1000 * 60 * 5,
  });
}
