'use client'

import { useTranslations } from 'next-intl'

import type { Vocabulary } from '@/contracts/library'
import { Input } from '@/components/ui/input'

import { isPeriodic, isResearch, periodForYear, type Draft } from '../model/library'

const selectClass =
  'h-8 w-full rounded-lg border border-input bg-transparent px-2 text-sm outline-none focus-visible:border-ring'

// 描述表单（0044 第 2.2 节，接词表各维度，0049 第六节）：类型分大类、细类从词表取，
// 不写死；识别出来、还没确认的栏标「待确认」。研报才有研报的几维。
export function DescriptionForm({
  draft,
  onChange,
  vocabulary,
  recognized,
  disabled = false,
}: {
  draft: Draft
  onChange: (draft: Draft) => void
  vocabulary: Vocabulary
  recognized: Set<string>
  disabled?: boolean
}) {
  const t = useTranslations('library.form')
  const set = (patch: Partial<Draft>) => onChange({ ...draft, ...patch })
  const research = isResearch(vocabulary, draft.doc_type)
  const periodic = isPeriodic(vocabulary, draft.doc_type)
  const pending = (field: string) =>
    recognized.has(field) ? (
      <span className="ml-1 rounded bg-amber-100 px-1 text-[0.7rem] text-amber-900">
        {t('pending')}
      </span>
    ) : null
  const classes = Object.entries(vocabulary.doc_classes)
  const toggle = (values: string[], value: string) =>
    values.includes(value) ? values.filter((v) => v !== value) : [...values, value]

  return (
    <fieldset disabled={disabled} className="grid gap-3 sm:grid-cols-2">
      <label className="space-y-1 text-sm">
        <span className="font-medium">
          {t('docType')}
          {pending('doc_type')}
        </span>
        <select
          className={selectClass}
          value={draft.doc_type}
          onChange={(event) => set({ doc_type: event.target.value })}
        >
          <option value="">{t('notSet')}</option>
          {classes.map(([code, item]) => (
            <optgroup key={code} label={item.name}>
              {Object.entries(vocabulary.doc_types)
                .filter(([, type]) => type.class === code)
                .map(([typeCode, type]) => (
                  <option key={typeCode} value={typeCode}>
                    {type.name}
                  </option>
                ))}
            </optgroup>
          ))}
        </select>
      </label>
      <label className="space-y-1 text-sm">
        <span className="font-medium">
          {t('subject')}
          {pending('subject')}
        </span>
        <Input
          value={draft.subject}
          maxLength={64}
          placeholder={t('subjectPlaceholder')}
          onChange={(event) => set({ subject: event.target.value })}
        />
      </label>

      {periodic ? (
        <label className="space-y-1 text-sm">
          <span className="font-medium">
            {t('reportYear')}
            {pending('period')}
          </span>
          <Input
            inputMode="numeric"
            maxLength={4}
            value={draft.period_end.slice(0, 4)}
            placeholder="2025"
            onChange={(event) =>
              set(
                periodForYear(vocabulary, draft.doc_type, event.target.value) ?? {
                  period_start: '',
                  period_end: '',
                },
              )
            }
          />
          {draft.period_start ? (
            <span className="text-muted-foreground block text-xs">
              {t('period', { start: draft.period_start, end: draft.period_end })}
            </span>
          ) : null}
        </label>
      ) : (
        <div className="space-y-1 text-sm">
          <span className="font-medium">
            {t('periodRange')}
            {pending('period')}
          </span>
          <div className="flex gap-2">
            <Input
              type="date"
              aria-label={t('periodStart')}
              value={draft.period_start}
              onChange={(event) => set({ period_start: event.target.value })}
            />
            <Input
              type="date"
              aria-label={t('periodEnd')}
              value={draft.period_end}
              onChange={(event) => set({ period_end: event.target.value })}
            />
          </div>
        </div>
      )}
      <label className="space-y-1 text-sm">
        <span className="font-medium">
          {t('disclosedOn')}
          {pending('disclosed_on')}
        </span>
        <Input
          type="date"
          value={draft.disclosed_on}
          onChange={(event) => set({ disclosed_on: event.target.value })}
        />
      </label>

      <label className="space-y-1 text-sm">
        <span className="font-medium">
          {t('edition')}
          {pending('edition')}
        </span>
        <select
          className={selectClass}
          value={draft.edition}
          onChange={(event) => set({ edition: event.target.value })}
        >
          {Object.entries(vocabulary.editions).map(([code, name]) => (
            <option key={code} value={code}>
              {name}
            </option>
          ))}
        </select>
      </label>
      <label className="space-y-1 text-sm">
        <span className="font-medium">
          {t('industry')}
          {pending('industry')}
        </span>
        <select
          className={selectClass}
          value={draft.industry}
          onChange={(event) => set({ industry: event.target.value })}
        >
          <option value="">{t('notSet')}</option>
          {vocabulary.industries.map((name) => (
            <option key={name} value={name}>
              {name}
            </option>
          ))}
        </select>
      </label>
      <label className="space-y-1 text-sm">
        <span className="font-medium">
          {t('language')}
          {pending('language')}
        </span>
        <select
          className={selectClass}
          value={draft.language}
          onChange={(event) => set({ language: event.target.value })}
        >
          <option value="">{t('notSet')}</option>
          {Object.entries(vocabulary.languages).map(([code, name]) => (
            <option key={code} value={code}>
              {name}
            </option>
          ))}
        </select>
      </label>

      <div className="space-y-1 text-sm sm:col-span-2">
        <span className="font-medium">
          {t('topics')}
          {pending('topics')}
        </span>
        <div className="flex flex-wrap gap-x-3 gap-y-1">
          {Object.entries(vocabulary.topics).map(([code, name]) => (
            <label key={code} className="inline-flex items-center gap-1">
              <input
                type="checkbox"
                checked={draft.topics.includes(code)}
                onChange={() => set({ topics: toggle(draft.topics, code) })}
              />
              {name}
            </label>
          ))}
        </div>
      </div>

      {research ? (
        <div className="grid gap-3 rounded-lg border p-3 sm:col-span-2 sm:grid-cols-2">
          <p className="text-muted-foreground text-xs sm:col-span-2">{t('researchHint')}</p>
          <label className="space-y-1 text-sm">
            <span className="font-medium">
              {t('institution')}
              {pending('attributes.institution')}
            </span>
            <Input
              value={draft.institution}
              maxLength={100}
              onChange={(event) => set({ institution: event.target.value })}
            />
          </label>
          <label className="space-y-1 text-sm">
            <span className="font-medium">
              {t('analysts')}
              {pending('attributes.analysts')}
            </span>
            <Input
              value={draft.analysts}
              placeholder={t('analystsPlaceholder')}
              onChange={(event) => set({ analysts: event.target.value })}
            />
          </label>
          <label className="space-y-1 text-sm">
            <span className="font-medium">
              {t('rating')}
              {pending('attributes.rating')}
            </span>
            <Input
              value={draft.rating}
              maxLength={100}
              onChange={(event) => set({ rating: event.target.value })}
            />
          </label>
          {(['market', 'depth', 'frequency'] as const).map((key) => (
            <label key={key} className="space-y-1 text-sm">
              <span className="font-medium">
                {t(key)}
                {pending(`attributes.${key}`)}
              </span>
              <select
                className={selectClass}
                value={draft[key]}
                onChange={(event) => set({ [key]: event.target.value })}
              >
                <option value="">{t('notSet')}</option>
                {Object.entries(vocabulary.research.closed[key] ?? {}).map(([code, name]) => (
                  <option key={code} value={code}>
                    {name}
                  </option>
                ))}
              </select>
            </label>
          ))}
          <div className="space-y-1 text-sm sm:col-span-2">
            <span className="font-medium">
              {t('forecast')}
              {pending('attributes.forecast')}
            </span>
            <div className="flex flex-wrap gap-x-3">
              {Object.entries(vocabulary.research.closed.forecast ?? {}).map(([code, name]) => (
                <label key={code} className="inline-flex items-center gap-1">
                  <input
                    type="checkbox"
                    checked={draft.forecast.includes(code)}
                    onChange={() => set({ forecast: toggle(draft.forecast, code) })}
                  />
                  {name}
                </label>
              ))}
            </div>
          </div>
        </div>
      ) : null}
    </fieldset>
  )
}
