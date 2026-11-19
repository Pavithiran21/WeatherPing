import { IconTrash } from '@tabler/icons-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { deleteRule } from '../../api/rules';
import { Dialog } from '../../components/Dialog';
import { CONDITIONS } from '../../lib/conditions';
import { windowInWords } from '../../lib/timeFormat';
import { useToast } from '../../toast/ToastContext';
import { removeRuleFromCache, showRuleError } from './ruleCache';

/** Dialog 10. Cancel has focus first, as in every delete dialog. */
export function DeleteRuleDialog({ open, onClose, rule, placeName }) {
  return (
    <Dialog open={open} onClose={onClose} role="alertdialog" labelledBy="delete-rule-title" describedBy="delete-rule-text">
      <DeleteRuleForm rule={rule} placeName={placeName} onClose={onClose} />
    </Dialog>
  );
}

function DeleteRuleForm({ rule, placeName, onClose }) {
  const queryClient = useQueryClient();
  const toast = useToast();
  const condition = CONDITIONS[rule.condition];

  function afterDeleted() {
    removeRuleFromCache(queryClient, rule.id);
    toast.success('Rule deleted', { icon: IconTrash, tone: 'coral' });
    onClose();
  }

  const remove = useMutation({
    mutationFn: () => deleteRule(rule.id),
    onSuccess: afterDeleted,
    onError: (error) => {
      if (error.status === 404) {
        afterDeleted(); // Already gone (deleted in another tab): the result is the same.
      } else {
        showRuleError(error, { toast, queryClient });
      }
    },
  });

  return (
    <>
      <span className="mb-3 grid size-[58px] place-items-center rounded-[18px] border-3 border-ink bg-coral-soft">
        <IconTrash size={30} aria-hidden="true" />
      </span>
      <h3 id="delete-rule-title" className="mb-1.5 text-2xl">
        Delete this rule?
      </h3>
      <p id="delete-rule-text" className="mb-[18px] text-[15px] leading-normal">
        <b>
          {condition.label} {windowInWords(rule.windowStart, rule.windowEnd)}
        </b>{' '}
        in {placeName} will stop for good. Past alerts stay in your history.
      </p>
      <div className="flex flex-wrap justify-end gap-2.5">
        <button type="button" data-autofocus className="btn btn-white" onClick={onClose}>
          Cancel
        </button>
        <button type="button" className="btn btn-coral" disabled={remove.isPending} onClick={() => remove.mutate()}>
          <IconTrash size={20} aria-hidden="true" /> {remove.isPending ? 'Deleting…' : 'Delete rule'}
        </button>
      </div>
    </>
  );
}
