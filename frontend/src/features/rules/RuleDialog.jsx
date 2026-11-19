import { zodResolver } from '@hookform/resolvers/zod';
import { IconAlertCircle, IconCheck, IconClock, IconMailFast, IconMapPin } from '@tabler/icons-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { z } from 'zod';
import { createRule, updateRule } from '../../api/rules';
import { useAuth } from '../../auth/AuthContext';
import { Dialog, DialogCloseButton } from '../../components/Dialog';
import { SelectField } from '../../components/SelectField';
import { applyFieldErrors, COULD_NOT_SAVE, errorMessage, isNetworkError } from '../../lib/apiErrors';
import { CONDITION_NAMES, CONDITIONS, previewText } from '../../lib/conditions';
import { formatWindow, minutesOfDay, timeOptions } from '../../lib/timeFormat';
import { useToast } from '../../toast/ToastContext';
import { saveRuleInCache } from './ruleCache';

// Same checks as backend/src/modules/rules/rule.schemas.js, with the messages from UI-UX.md.
// The threshold range depends on the condition, and the window must not cross midnight
// ("HH:mm" strings compare correctly as text).
const ruleFormSchema = z
  .object({
    locationId: z.string().min(1, 'Pick a place for this rule.'),
    condition: z.enum(CONDITION_NAMES, 'Pick a condition.'),
    threshold: z.number('Enter a number.'),
    windowStart: z.string(),
    windowEnd: z.string(),
  })
  .superRefine((rule, ctx) => {
    const condition = CONDITIONS[rule.condition];
    if (rule.threshold < condition.min || rule.threshold > condition.max) {
      ctx.addIssue({ code: 'custom', path: ['threshold'], message: condition.rangeMessage });
    }
    if (rule.windowEnd <= rule.windowStart) {
      ctx.addIssue({ code: 'custom', path: ['windowEnd'], message: 'End time must be after the start time.' });
    }
  });

const SERVER_FIELDS = ['locationId', 'condition', 'threshold', 'windowStart', 'windowEnd'];
const NEW_RULE = { condition: 'rain', threshold: CONDITIONS.rain.defaultThreshold, windowStart: '07:00', windowEnd: '09:00' };
const STRIP_TICKS = ['12 am', '6 am', '12 pm', '6 pm', '12 am'];

/**
 * Dialog 6: create or edit a rule. place is set when it was opened from a place (the
 * dashboard or a Rules-page card); without it (the Rules page's "New rule") the user picks one.
 */
export function RuleDialog({ open, onClose, rule, place, places }) {
  return (
    <Dialog open={open} onClose={onClose} labelledBy="rule-dialog-title" large>
      <RuleForm rule={rule} place={place} places={places} onClose={onClose} />
    </Dialog>
  );
}

function RuleForm({ rule, place, places, onClose }) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const toast = useToast();
  const [formError, setFormError] = useState(null);
  const isEdit = Boolean(rule);
  // An existing rule keeps its place; a rule started from a place uses that place.
  const fixedPlaceId = rule?.locationId ?? place?.id ?? null;

  const {
    register,
    control,
    handleSubmit,
    setValue,
    setError,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(ruleFormSchema),
    mode: 'onTouched',
    defaultValues: rule
      ? {
          locationId: rule.locationId,
          condition: rule.condition,
          threshold: rule.threshold,
          windowStart: rule.windowStart,
          windowEnd: rule.windowEnd,
        }
      : { locationId: fixedPlaceId ?? '', ...NEW_RULE },
  });

  const [condition, threshold, windowStart, windowEnd, locationId] = useWatch({
    control,
    name: ['condition', 'threshold', 'windowStart', 'windowEnd', 'locationId'],
  });
  const conditionInfo = CONDITIONS[condition];
  const placeName = places.find((item) => item.id === locationId)?.name ?? place?.name ?? '';
  const windowIsValid = windowEnd > windowStart;
  const windowError = errors.windowEnd?.message ?? errors.windowStart?.message;

  const save = useMutation({
    mutationFn: (values) =>
      isEdit
        ? updateRule(rule.id, {
            condition: values.condition,
            threshold: values.threshold,
            windowStart: values.windowStart,
            windowEnd: values.windowEnd,
          })
        : createRule(values),
    onSuccess: (saved) => {
      saveRuleInCache(queryClient, saved);
      toast.success('Rule saved');
      onClose();
    },
    onError: (error) => {
      if (isNetworkError(error)) {
        toast.error(COULD_NOT_SAVE);
      } else if (error.status === 404) {
        setFormError('This rule or its place no longer exists. Close this and try again.');
      } else if (!applyFieldErrors(error, setError, SERVER_FIELDS)) {
        setFormError(errorMessage(error));
      }
    },
  });

  function onSubmit(values) {
    setFormError(null);
    save.mutate(values);
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate>
      <div className="mb-1 flex items-center">
        <h3 id="rule-dialog-title" className="flex-1 text-[28px] tab:text-[32px]">
          {isEdit ? 'Edit rule' : 'New rule'}
        </h3>
        <DialogCloseButton onClose={onClose} />
      </div>

      {fixedPlaceId ? (
        <p className="mb-[22px] flex items-center gap-1 text-base text-muted">
          <IconMapPin size={18} aria-hidden="true" /> {placeName} · times in {user.timeZone}
        </p>
      ) : (
        <SelectField
          id="rule-place"
          label="Place"
          icon={IconMapPin}
          className="mt-3 mb-[22px]"
          error={errors.locationId?.message}
          hint={`Times are in ${user.timeZone}.`}
          {...register('locationId')}
        >
          <option value="">Pick one of your places</option>
          {places.map((item) => (
            <option key={item.id} value={item.id}>
              {item.name}
            </option>
          ))}
        </SelectField>
      )}

      <p id="rule-condition-label" className="field-label">
        What should we watch?
      </p>
      {/* Native radio buttons drawn as tiles: arrow keys move between them for free. */}
      <div role="radiogroup" aria-labelledby="rule-condition-label" className="mb-[22px] grid grid-cols-5 gap-2 tab:gap-2.5">
        {CONDITION_NAMES.map((name) => {
          const info = CONDITIONS[name];
          return (
            <label key={name} className="cond-tile">
              <input
                type="radio"
                value={name}
                className="sr-only"
                {...register('condition', {
                  // Each condition has its own range, so start from its usual threshold.
                  onChange: (event) => setValue('threshold', CONDITIONS[event.target.value].defaultThreshold),
                })}
              />
              <info.icon size={30} className="mx-auto mb-1" aria-hidden="true" />
              {info.tileLabel}
            </label>
          );
        })}
      </div>

      <div className="mb-[22px]">
        <label htmlFor="rule-threshold" className="field-label flex items-center">
          {conditionInfo.sliderLabel}
          <span className="tag ml-auto bg-sky-soft">{conditionInfo.value(threshold)}</span>
        </label>
        {/* Controlled, so min, max and value change together when the condition changes. */}
        <Controller
          name="threshold"
          control={control}
          render={({ field }) => (
            <input
              id="rule-threshold"
              ref={field.ref}
              type="range"
              className="slider"
              min={conditionInfo.min}
              max={conditionInfo.max}
              step={conditionInfo.step}
              value={field.value}
              onChange={(event) => field.onChange(Number(event.target.value))}
              onBlur={field.onBlur}
              aria-valuetext={conditionInfo.value(field.value)}
              aria-invalid={errors.threshold ? true : undefined}
              aria-describedby={errors.threshold ? 'rule-threshold-error' : undefined}
              style={{ '--fill': `${((field.value - conditionInfo.min) / (conditionInfo.max - conditionInfo.min)) * 100}%` }}
            />
          )}
        />
        <div className="flex justify-between text-[13px] text-muted">
          <span>{conditionInfo.value(conditionInfo.min)}</span>
          <span>{conditionInfo.value(conditionInfo.max)}</span>
        </div>
        {errors.threshold && (
          <p id="rule-threshold-error" className="field-error">
            <IconAlertCircle size={18} aria-hidden="true" /> {errors.threshold.message}
          </p>
        )}
      </div>

      <div className="mb-2 flex items-center">
        <p id="rule-when-label" className="field-label mb-0">
          When
        </p>
        <span className="tag ml-auto bg-sun-soft">{windowIsValid ? formatWindow(windowStart, windowEnd) : '–'}</span>
      </div>
      <div role="group" aria-labelledby="rule-when-label" className="grid grid-cols-2 gap-3.5">
        <SelectField
          id="rule-from"
          label="From"
          icon={IconClock}
          className="mb-0"
          invalid={Boolean(windowError)}
          describedBy={windowError ? 'rule-window-error' : undefined}
          {...register('windowStart')}
        >
          {timeOptions().map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </SelectField>
        <SelectField
          id="rule-to"
          label="To"
          icon={IconClock}
          className="mb-0"
          invalid={Boolean(windowError)}
          describedBy={windowError ? 'rule-window-error' : undefined}
          {...register('windowEnd')}
        >
          {timeOptions().map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </SelectField>
      </div>
      {windowError && (
        <p id="rule-window-error" className="field-error">
          <IconAlertCircle size={18} aria-hidden="true" /> {windowError}
        </p>
      )}

      <div className="day-strip mt-3" aria-hidden="true">
        {windowIsValid && (
          <div
            className="window"
            style={{
              left: `${(minutesOfDay(windowStart) / 1440) * 100}%`,
              width: `${((minutesOfDay(windowEnd) - minutesOfDay(windowStart)) / 1440) * 100}%`,
            }}
          >
            <conditionInfo.icon size={20} />
          </div>
        )}
        <div className="ticks">
          {STRIP_TICKS.map((tick, index) => (
            <span key={index}>{tick}</span>
          ))}
        </div>
      </div>

      <div className="mt-5 flex items-center gap-3 rounded-[20px] border-3 border-dashed border-ink bg-mint-soft p-4">
        <IconMailFast size={32} className="shrink-0" aria-hidden="true" />
        <p className="text-[15px]">
          You'll get <b>one email</b> when{' '}
          {previewText({ condition, threshold, windowStart, windowEnd, placeName: placeName || null })}.
        </p>
      </div>

      {formError && (
        <p className="form-error" role="alert">
          {formError}
        </p>
      )}

      <div className="mt-[22px] flex flex-wrap justify-end gap-3">
        <button type="button" className="btn btn-white" onClick={onClose}>
          Cancel
        </button>
        <button type="submit" className="btn btn-sun" disabled={save.isPending}>
          <IconCheck size={20} aria-hidden="true" /> {save.isPending ? 'Saving…' : 'Save rule'}
        </button>
      </div>
    </form>
  );
}
