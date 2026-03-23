/**
 * Centralized admin mutation wrapper.
 * Automatically logs every admin action to admin_activity_log.
 */
import { useMutation, useQueryClient, UseMutationOptions } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { useTranslation } from 'react-i18next';
import { logAdminAction } from '@/lib/admin-log';
import { apiMutate } from '@/lib/supabase-api';

interface AdminMutationOptions<TData, TVariables> {
  /** Table name for the mutation */
  table: string;
  /** The mutation function */
  mutationFn: (variables: TVariables) => Promise<TData>;
  /** Admin action name for logging (e.g., 'create_class') */
  action: string;
  /** Target table for audit log */
  targetTable: string;
  /** Extract target ID from variables for logging */
  getTargetId?: (variables: TVariables, data: TData) => string | undefined;
  /** Extra details for audit log */
  getDetails?: (variables: TVariables, data: TData) => Record<string, unknown>;
  /** Query keys to invalidate on success */
  invalidateKeys?: string[][];
  /** Success toast message */
  successMessage?: string;
  /** Error toast message */
  errorMessage?: string;
}

export function useAdminMutation<TData = any, TVariables = any>(
  options: AdminMutationOptions<TData, TVariables>
) {
  const { user } = useAuth();
  const { toast } = useToast();
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: options.mutationFn,
    onSuccess: async (data, variables) => {
      // Log admin action
      if (user) {
        try {
          await logAdminAction(
            user.id,
            options.action,
            options.targetTable,
            options.getTargetId?.(variables, data),
            options.getDetails?.(variables, data)
          );
        } catch {
          // Don't fail the mutation if logging fails
          console.warn('Admin action logging failed');
        }
      }

      // Invalidate queries
      if (options.invalidateKeys) {
        options.invalidateKeys.forEach((key) => {
          queryClient.invalidateQueries({ queryKey: key });
        });
      }

      // Show success toast
      if (options.successMessage) {
        toast({ title: options.successMessage });
      }
    },
    onError: () => {
      toast({
        title: options.errorMessage || t('common.error', 'An error occurred'),
        variant: 'destructive',
      });
    },
  });
}
