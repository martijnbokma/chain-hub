import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { errorMessage, learningsApi } from '@/lib/api';
import { queryKeys } from '@/lib/query-keys';

export function useResolveSkill() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (skill: string) => learningsApi.resolveSkill({ skill }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.learningsReflect });
      toast.success('Marked as addressed');
    },
    onError: (error) => {
      toast.error(errorMessage(error, 'Unable to mark as addressed'));
    }
  });
}
