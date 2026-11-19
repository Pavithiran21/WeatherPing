import { IconPlayerPause } from '@tabler/icons-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { resumeRule } from '../../api/rules';
import { useToast } from '../../toast/ToastContext';
import { saveRuleInCache, showRuleError } from './ruleCache';

/**
 * What a rule list can do: New, Edit, the on/off switch and Delete. The dashboard's Rules
 * card and the Rules page both use it, so they behave the same.
 * Returns handlers for PlaceRulesCard and the props for <RuleDialogs>.
 */
export function useRuleActions() {
  const queryClient = useQueryClient();
  const toast = useToast();
  const [dialog, setDialog] = useState(null); // { type: 'new' | 'edit' | 'pause' | 'delete', rule?, place? }

  const resume = useMutation({
    mutationFn: (rule) => resumeRule(rule.id),
    onSuccess: (saved) => saveRuleInCache(queryClient, saved),
    onError: (error) => showRuleError(error, { toast, queryClient }),
  });

  // Called from the toast, after the Pause dialog has closed, so it uses the API directly.
  function undoPause(rule) {
    resumeRule(rule.id).then(
      (saved) => saveRuleInCache(queryClient, saved),
      (error) => showRuleError(error, { toast, queryClient }),
    );
  }

  return {
    handlers: {
      onNew: (place) => setDialog({ type: 'new', place: place ?? null }),
      onEdit: (rule) => setDialog({ type: 'edit', rule }),
      // Pausing asks first; resuming happens straight away (UI-UX.md screen 11).
      onToggle: (rule) => (rule.status === 'active' ? setDialog({ type: 'pause', rule }) : resume.mutate(rule)),
      onDelete: (rule) => setDialog({ type: 'delete', rule }),
      busyRuleId: resume.isPending ? resume.variables.id : null,
    },
    dialogProps: {
      dialog,
      onClose: () => setDialog(null),
      onPaused: (rule) =>
        toast.success('Rule paused', {
          icon: IconPlayerPause,
          tone: 'sun',
          action: { label: 'Undo', onClick: () => undoPause(rule) },
        }),
    },
  };
}
