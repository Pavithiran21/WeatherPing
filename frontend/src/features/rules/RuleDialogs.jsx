import { DeleteRuleDialog } from './DeleteRuleDialog';
import { PauseRuleDialog } from './PauseRuleDialog';
import { RuleDialog } from './RuleDialog';

/** The rule dialogs, one open at a time (state from useRuleActions). places names the place in each dialog. */
export function RuleDialogs({ dialog, onClose, onPaused, places }) {
  const type = dialog?.type;
  const rule = dialog?.rule;
  const placeName = rule ? (places.find((place) => place.id === rule.locationId)?.name ?? '') : '';

  return (
    <>
      <RuleDialog
        open={type === 'new' || type === 'edit'}
        onClose={onClose}
        rule={type === 'edit' ? rule : null}
        place={type === 'new' ? dialog.place : null}
        places={places}
      />
      <PauseRuleDialog open={type === 'pause'} onClose={onClose} rule={rule} placeName={placeName} onPaused={onPaused} />
      <DeleteRuleDialog open={type === 'delete'} onClose={onClose} rule={rule} placeName={placeName} />
    </>
  );
}
