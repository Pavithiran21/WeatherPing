import { IconPlayerPause } from '@tabler/icons-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { pauseRule } from '../../api/rules';
import { Dialog } from '../../components/Dialog';
import { CONDITIONS } from '../../lib/conditions';
import { useToast } from '../../toast/ToastContext';
import { saveRuleInCache, showRuleError } from './ruleCache';

/** Dialog 11. Pausing keeps the rule; resuming needs no dialog. */
export function PauseRuleDialog({ open, onClose, rule, placeName, onPaused }) {
  return (
    <Dialog open={open} onClose={onClose} role="alertdialog" labelledBy="pause-rule-title" describedBy="pause-rule-text">
      <PauseRuleForm rule={rule} placeName={placeName} onClose={onClose} onPaused={onPaused} />
    </Dialog>
  );
}

function PauseRuleForm({ rule, placeName, onClose, onPaused }) {
  const queryClient = useQueryClient();
  const toast = useToast();
  const condition = CONDITIONS[rule.condition];

  const pause = useMutation({
    mutationFn: () => pauseRule(rule.id),
    onSuccess: (saved) => {
      saveRuleInCache(queryClient, saved);
      onClose();
      onPaused(saved);
    },
    onError: (error) => {
      showRuleError(error, { toast, queryClient });
      if (error.status === 404) onClose();
    },
  });

  return (
    <>
      <span className="mb-3 grid size-[58px] place-items-center rounded-[18px] border-3 border-ink bg-sun-soft">
        <IconPlayerPause size={30} aria-hidden="true" />
      </span>
      <h3 id="pause-rule-title" className="mb-1.5 text-2xl">
        Pause this rule?
      </h3>
      <p id="pause-rule-text" className="mb-[18px] text-[15px] leading-normal">
        You won't get emails for{' '}
        <b>
          {condition.label} {condition.short(rule.threshold)}
        </b>{' '}
        in {placeName} until you resume it. Nothing is deleted.
      </p>
      <div className="flex flex-wrap justify-end gap-2.5">
        <button type="button" className="btn btn-white" onClick={onClose}>
          Cancel
        </button>
        <button type="button" className="btn btn-sun" disabled={pause.isPending} onClick={() => pause.mutate()}>
          <IconPlayerPause size={20} aria-hidden="true" /> {pause.isPending ? 'Pausing…' : 'Pause rule'}
        </button>
      </div>
    </>
  );
}
