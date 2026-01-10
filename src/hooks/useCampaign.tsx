import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface CampaignSettings {
  id: string;
  campaign_name: string;
  campaign_subtitle: string | null;
  start_date: string;
  end_date: string;
  draw_date: string;
  preselected_count: number;
  finalists_count: number;
  min_age: number;
  terms_url: string | null;
  is_active: boolean;
}

export function useCampaign() {
  return useQuery({
    queryKey: ['campaign-settings'],
    queryFn: async (): Promise<CampaignSettings | null> => {
      const { data, error } = await supabase
        .from('campaign_settings')
        .select('*')
        .eq('is_active', true)
        .maybeSingle();

      if (error) {
        console.error('Error fetching campaign:', error);
        throw error;
      }

      return data;
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}
