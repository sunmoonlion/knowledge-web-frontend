'use client'

import { useFormatter, useTranslations } from 'next-intl'
import { useState } from 'react'

import type { Entry, Vocabulary } from '@/contracts/library'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

import {
  downloadHref,
  useAddVersion,
  useExperts,
  useHistory,
  useImpact,
  useLibraryActions,
  useReads,
  useRenditions,
  useVersions,
} from '../api/library'
import {
  DISPLAY_APPS,
  LICENSES,
  canAddVersion,
  canChangeLicense,
  canConvert,
  canHandToMarket,
  descriptionBody,
  draftOf,
  formatBytes,
  isLowering,
  isShownTo,
  needsAttest,
  parseUse,
  type Draft,
} from '../model/library'
import { DescriptionForm } from './description-form'
import { ErrorNote } from './error-note'

const sectionClass = 'space-y-3 rounded-lg border p-4'

// 一份资料的详情（0044 第 2.2 节）：描述、内容版本与读法、展示按钮、许可档、谁读过、删。
export function MaterialDetail({
  entry,
  vocabulary,
  csrfToken,
  onClose,
}: {
  entry: Entry
  vocabulary: Vocabulary
  csrfToken: string
  onClose: () => void
}) {
  const t = useTranslations('library.detail')
  const tc = useTranslations('library.categories')
  const id = entry.material.material_id
  const actions = useLibraryActions(csrfToken)
  return (
    <article className="space-y-4" aria-label={entry.material.name}>
      <header className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold break-all">{entry.material.name}</h2>
          <p className="text-muted-foreground text-xs">
            {tc.has(entry.category) ? tc(entry.category) : entry.category}
            {' · '}
            {t('versions', { count: entry.material.current_version })}
          </p>
        </div>
        <Button type="button" variant="ghost" size="sm" onClick={onClose}>
          {t('close')}
        </Button>
      </header>
      {/* 换了一份、或后端回来的描述变了，表单从新的起（key 变了就重来） */}
      <DescriptionSection
        key={`${id}:${JSON.stringify(entry.material.description)}`}
        entry={entry}
        vocabulary={vocabulary}
        actions={actions}
      />
      <VersionsSection entry={entry} csrfToken={csrfToken} actions={actions} />
      <DisplaySection entry={entry} actions={actions} />
      <LicenseSection key={`${id}:${entry.material.license}`} entry={entry} actions={actions} />
      {canConvert(entry) ? <ConvertSection entry={entry} actions={actions} /> : null}
      <ReadsSection id={id} enabled={entry.material.mine} />
      {entry.material.mine ? <HistorySection id={id} /> : null}
      {entry.material.mine ? (
        <DeleteSection entry={entry} actions={actions} onDeleted={onClose} />
      ) : null}
    </article>
  )
}

type Actions = ReturnType<typeof useLibraryActions>

function DescriptionSection({
  entry,
  vocabulary,
  actions,
}: {
  entry: Entry
  vocabulary: Vocabulary
  actions: Actions
}) {
  const t = useTranslations('library.detail')
  const ts = useTranslations('library.status')
  const d = entry.material.description
  const [draft, setDraft] = useState<Draft>(() => draftOf(d))
  const editable = entry.material.mine
  const save = (confirm: boolean) =>
    actions.describe.mutate({
      id: entry.material.material_id,
      body: descriptionBody(draft, vocabulary, confirm),
    })
  // 没确认的栏都当待确认：识别出来的、迁移来的，本人点确认后才参与解析
  const pending = new Set(
    d.status === 'unconfirmed'
      ? [
          'doc_type',
          'subject',
          'period',
          'disclosed_on',
          'edition',
          'topics',
          'industry',
          'language',
          ...Object.keys(d.attributes).map((k) => `attributes.${k}`),
        ]
      : [],
  )
  return (
    <section className={sectionClass}>
      <div className="flex items-center justify-between">
        <h3 className="font-medium">{t('description')}</h3>
        <span className="text-xs">
          {ts.has(d.status) ? ts(d.status) : d.status}
          {!d.resolvable && d.status !== 'unconfirmed' ? ` · ${t('oldVocabulary')}` : null}
        </span>
      </div>
      {d.status === 'unconfirmed' ? (
        <p className="text-muted-foreground text-xs">{t('unconfirmedHint')}</p>
      ) : null}
      <DescriptionForm
        draft={draft}
        onChange={setDraft}
        vocabulary={vocabulary}
        recognized={pending}
        disabled={!editable || actions.describe.isPending}
      />
      {editable ? (
        <div className="flex flex-wrap gap-2">
          <Button type="button" size="sm" onClick={() => save(true)}>
            {t('saveConfirm')}
          </Button>
          <Button type="button" size="sm" variant="outline" onClick={() => save(false)}>
            {t('saveOnly')}
          </Button>
        </div>
      ) : (
        <p className="text-muted-foreground text-xs">{t('notOwner')}</p>
      )}
      <ErrorNote error={actions.describe.error} />
    </section>
  )
}

function VersionsSection({
  entry,
  csrfToken,
  actions,
}: {
  entry: Entry
  csrfToken: string
  actions: Actions
}) {
  const t = useTranslations('library.detail')
  const format = useFormatter()
  const id = entry.material.material_id
  const versions = useVersions(id)
  const addVersion = useAddVersion(csrfToken)
  const [open, setOpen] = useState<number | null>(null)
  const [file, setFile] = useState<File | null>(null)
  const [process, setProcess] = useState(false)
  const processable = entry.material.mine && entry.material.content_origin === 'upload'
  return (
    <section className={sectionClass}>
      <h3 className="font-medium">{t('contentVersions')}</h3>
      <p className="text-muted-foreground text-xs">{t('versionsHint')}</p>
      <ul className="divide-y text-sm">
        {(versions.data ?? []).map((v) => (
          <li key={v.version_no} className="space-y-1 py-2">
            <div className="flex flex-wrap items-center gap-3">
              <span className="font-medium">v{v.version_no}</span>
              <span>
                {format.dateTime(new Date(v.created_at), {
                  dateStyle: 'medium',
                  timeStyle: 'short',
                })}
              </span>
              <span>{formatBytes(v.size_bytes)}</span>
              <span className="font-mono text-xs">{v.sha256.slice(0, 8)}</span>
              <a className="text-primary underline" href={downloadHref(id, v.version_no)} download>
                {t('download')}
              </a>
              <button
                type="button"
                className="text-primary underline"
                onClick={() => setOpen(open === v.version_no ? null : v.version_no)}
              >
                {open === v.version_no ? t('hideReadings') : t('showReadings')}
              </button>
              {processable ? (
                <button
                  type="button"
                  className="text-primary underline"
                  onClick={() => actions.process.mutate({ id, versionNo: v.version_no })}
                >
                  {t('processThis')}
                </button>
              ) : null}
            </div>
            {open === v.version_no ? <Readings id={id} versionNo={v.version_no} /> : null}
          </li>
        ))}
      </ul>
      <ErrorNote error={versions.error ?? actions.process.error} />
      {canAddVersion(entry) ? (
        <div className="space-y-2 border-t pt-3 text-sm">
          <span className="font-medium">{t('newVersion')}</span>
          <input type="file" onChange={(event) => setFile(event.target.files?.[0] ?? null)} />
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={process}
              onChange={(event) => setProcess(event.target.checked)}
            />
            {t('processNew')}
          </label>
          <Button
            type="button"
            size="sm"
            disabled={!file || addVersion.isPending}
            onClick={() => file && addVersion.mutate({ id, file, process })}
          >
            {t('uploadVersion')}
          </Button>
          <ErrorNote error={addVersion.error} />
        </div>
      ) : null}
    </section>
  )
}

// 一版的读法齐不齐：正文、按页文字、表格、检索索引，哪种就绪、哪种没成及原因
function Readings({ id, versionNo }: { id: string; versionNo: number }) {
  const t = useTranslations('library.readings')
  const renditions = useRenditions(id, versionNo, true)
  if (renditions.isPending) return <p className="text-muted-foreground text-xs">{t('loading')}</p>
  const found = renditions.data ?? []
  return (
    <ul className="ml-4 space-y-1 text-xs">
      {(['text', 'pages', 'table', 'index'] as const).map((kind) => {
        const latest = found.filter((r) => r.kind === kind).at(-1)
        const reason =
          latest && typeof latest.detail.reason === 'string' ? latest.detail.reason : null
        return (
          <li key={kind}>
            <span className="font-medium">{t(kind)}</span>
            {': '}
            {latest ? t(`status.${latest.status}`) : t('none')}
            {reason ? ` · ${reason}` : null}
          </li>
        )
      })}
    </ul>
  )
}

function DisplaySection({ entry, actions }: { entry: Entry; actions: Actions }) {
  const t = useTranslations('library.display')
  const id = entry.material.material_id
  const experts = useExperts(true)
  const toggle = (use: string) =>
    isShownTo(entry, use) ? actions.hide.mutate({ id, use }) : actions.show.mutate({ id, use })
  const frozen = entry.shown.map(parseUse).filter((u) => u.kind === 'expert' && u.version)
  return (
    <section className={sectionClass}>
      <h3 className="font-medium">{t('title')}</h3>
      {DISPLAY_APPS.map((app) => (
        <label key={app} className="flex items-start gap-2 text-sm">
          <input
            type="checkbox"
            checked={isShownTo(entry, `app:${app}`)}
            onChange={() => toggle(`app:${app}`)}
          />
          <span>
            {t('toApp', { app })}
            {app === 'knowbench' ? (
              <span className="text-muted-foreground block text-xs">{t('knowbenchHint')}</span>
            ) : null}
          </span>
        </label>
      ))}
      {canHandToMarket(entry) ? (
        <label className="flex items-start gap-2 text-sm">
          <input
            type="checkbox"
            checked={isShownTo(entry, 'market')}
            onChange={() => toggle('market')}
          />
          <span>
            {t('toMarket')}
            <span className="text-muted-foreground block text-xs">{t('marketHint')}</span>
          </span>
        </label>
      ) : null}
      <div className="space-y-1 text-sm">
        <span className="font-medium">
          {entry.category === 'purchased' ? t('bindOwnExpert') : t('bindExpert')}
        </span>
        <p className="text-muted-foreground text-xs">{t('bindHint')}</p>
        {experts.data && experts.data.length === 0 ? (
          <p className="text-muted-foreground text-xs">{t('noExperts')}</p>
        ) : null}
        {(experts.data ?? []).map((expert) => (
          <label key={expert.expert_id} className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={isShownTo(entry, `expert:${expert.expert_id}`)}
              onChange={() => toggle(`expert:${expert.expert_id}`)}
            />
            {expert.name}
            {expert.latest_version ? (
              <span className="text-muted-foreground text-xs">v{expert.latest_version}</span>
            ) : null}
          </label>
        ))}
        {frozen.length ? (
          <p className="text-muted-foreground text-xs">
            {t('frozen', {
              list: frozen
                .map((u) => (u.kind === 'expert' ? `${u.expert}@${u.version}` : ''))
                .join('、'),
            })}
          </p>
        ) : null}
      </div>
      <ErrorNote error={actions.show.error ?? actions.hide.error} />
    </section>
  )
}

function LicenseSection({ entry, actions }: { entry: Entry; actions: Actions }) {
  const t = useTranslations('library.license')
  const id = entry.material.material_id
  const current = entry.material.license
  const [target, setTarget] = useState(current)
  const [attest, setAttest] = useState(false)
  const lowering = isLowering(current, target)
  const impact = useImpact(id, lowering)
  const raising = needsAttest(current, target)
  return (
    <section className={sectionClass}>
      <h3 className="font-medium">{t('title')}</h3>
      <p className="text-sm">{t('current', { license: t(current) })}</p>
      {canChangeLicense(entry) ? (
        <div className="space-y-2 text-sm">
          <select
            className="h-8 rounded-lg border px-2"
            value={target}
            onChange={(event) => {
              setTarget(event.target.value)
              setAttest(false)
            }}
          >
            {LICENSES.map((code) => (
              <option key={code} value={code}>
                {t(code)}
              </option>
            ))}
          </select>
          {raising ? (
            <label className="flex items-start gap-2 rounded-md bg-amber-50 p-2">
              <input
                type="checkbox"
                checked={attest}
                onChange={(event) => setAttest(event.target.checked)}
              />
              <span>{t('attest', { license: t(target) })}</span>
            </label>
          ) : null}
          {lowering && impact.data ? <ImpactList impact={impact.data} lowering /> : null}
          <Button
            type="button"
            size="sm"
            disabled={target === current || (raising && !attest) || actions.setLicense.isPending}
            onClick={() => actions.setLicense.mutate({ id, license: target, attest })}
          >
            {t('change')}
          </Button>
          <p className="text-muted-foreground text-xs">{t('logged')}</p>
        </div>
      ) : (
        <p className="text-muted-foreground text-xs">{t('fixed')}</p>
      )}
      <ErrorNote error={actions.setLicense.error} />
    </section>
  )
}

function ImpactList({
  impact,
  lowering = false,
}: {
  impact: NonNullable<ReturnType<typeof useImpact>['data']>
  lowering?: boolean
}) {
  const t = useTranslations('library.impact')
  const lines = [
    impact.market ? t(lowering ? 'marketLowering' : 'market') : null,
    impact.bound_experts.length ? t('bound', { list: impact.bound_experts.join('、') }) : null,
    impact.frozen_experts.length ? t('frozen', { list: impact.frozen_experts.join('、') }) : null,
    impact.other_holders ? t('holders', { count: impact.other_holders }) : null,
    impact.active_grants ? t('grants', { count: impact.active_grants }) : null,
  ].filter(Boolean)
  return (
    <div className="rounded-md bg-amber-50 p-2 text-xs">
      <p className="font-medium">{lines.length ? t('title') : t('none')}</p>
      <ul className="list-disc pl-4">
        {lines.map((line) => (
          <li key={line}>{line}</li>
        ))}
      </ul>
    </div>
  )
}

function ConvertSection({ entry, actions }: { entry: Entry; actions: Actions }) {
  const t = useTranslations('library.convert')
  const tl = useTranslations('library.license')
  const [name, setName] = useState(entry.material.name)
  const [license, setLicense] = useState('self')
  const [attest, setAttest] = useState(false)
  const raising = needsAttest('self', license)
  return (
    <section className={sectionClass}>
      <h3 className="font-medium">{t('title')}</h3>
      <p className="text-muted-foreground text-xs">{t('hint')}</p>
      <Input value={name} maxLength={200} onChange={(event) => setName(event.target.value)} />
      <select
        className="h-8 rounded-lg border px-2 text-sm"
        value={license}
        onChange={(event) => {
          setLicense(event.target.value)
          setAttest(false)
        }}
      >
        {LICENSES.map((code) => (
          <option key={code} value={code}>
            {tl(code)}
          </option>
        ))}
      </select>
      {raising ? (
        <label className="flex items-start gap-2 rounded-md bg-amber-50 p-2 text-sm">
          <input type="checkbox" checked={attest} onChange={(e) => setAttest(e.target.checked)} />
          <span>{tl('attest', { license: tl(license) })}</span>
        </label>
      ) : null}
      <Button
        type="button"
        size="sm"
        disabled={(raising && !attest) || actions.convert.isPending}
        onClick={() =>
          actions.convert.mutate({ id: entry.material.material_id, name, license, attest })
        }
      >
        {t('submit')}
      </Button>
      {actions.convert.isSuccess ? <p className="text-sm">{t('done')}</p> : null}
      <ErrorNote error={actions.convert.error} />
    </section>
  )
}

function ReadsSection({ id, enabled }: { id: string; enabled: boolean }) {
  const t = useTranslations('library.reads')
  const format = useFormatter()
  const [open, setOpen] = useState(false)
  const reads = useReads(id, enabled && open)
  if (!enabled) return null
  return (
    <section className={sectionClass}>
      <button type="button" className="font-medium" onClick={() => setOpen(!open)}>
        {t('title')} {open ? '▾' : '▸'}
      </button>
      {open ? (
        reads.data && reads.data.length === 0 ? (
          <p className="text-muted-foreground text-sm">{t('none')}</p>
        ) : (
          <ul className="space-y-1 text-xs">
            {(reads.data ?? []).map((r, index) => (
              <li key={`${r.at}-${index}`}>
                {format.dateTime(new Date(r.at), { dateStyle: 'medium', timeStyle: 'short' })}
                {' · '}
                <ReaderLabel role={r.reader_role} app={r.app} />
                {' · '}
                {t.has(`operation.${r.operation}`) ? t(`operation.${r.operation}`) : r.operation}
                {' · '}
                <span className="font-mono">{r.sha256.slice(0, 8)}</span>
              </li>
            ))}
          </ul>
        )
      ) : null}
      <ErrorNote error={reads.error} />
    </section>
  )
}

// 平台人员读的、knowfeed 替用户加工读的单独标出（0044 第 2.2 节）
function ReaderLabel({ role, app }: { role: string | null; app: string | null }) {
  const t = useTranslations('library.reads.role')
  if (role === 'operator') return <strong>{t('operator')}</strong>
  if (role === 'machine') return <strong>{t('machine')}</strong>
  if (role === 'system') return <strong>{t('system')}</strong>
  if (app === 'knowbase') return <>{t('self')}</>
  return <>{app ?? t('unknown')}</>
}

function HistorySection({ id }: { id: string }) {
  const t = useTranslations('library.history')
  const tl = useTranslations('library.license')
  const format = useFormatter()
  const [open, setOpen] = useState(false)
  const history = useHistory(id, open)
  const licenseName = (value: unknown) =>
    typeof value === 'string' && tl.has(value) ? tl(value) : t('none')
  return (
    <section className={sectionClass}>
      <button type="button" className="font-medium" onClick={() => setOpen(!open)}>
        {t('title')} {open ? '▾' : '▸'}
      </button>
      {open ? (
        <ul className="space-y-1 text-xs">
          {(history.data ?? []).map((h, index) => (
            <li key={`${h.at}-${index}`}>
              {format.dateTime(new Date(h.at), { dateStyle: 'medium', timeStyle: 'short' })}
              {' · '}
              {h.what === 'license'
                ? t('license', {
                    from: licenseName(h.before.license),
                    to: licenseName(h.after.license),
                    attested: h.after.attested ? t('attested') : t('notAttested'),
                  })
                : h.what === 'recognized'
                  ? t('recognized', { version: String(h.after.rules_version ?? '?') })
                  : t('description')}
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  )
}

function DeleteSection({
  entry,
  actions,
  onDeleted,
}: {
  entry: Entry
  actions: Actions
  onDeleted: () => void
}) {
  const t = useTranslations('library.delete')
  const [asking, setAsking] = useState(false)
  const impact = useImpact(entry.material.material_id, asking)
  return (
    <section className={sectionClass}>
      {!asking ? (
        <Button type="button" variant="destructive" size="sm" onClick={() => setAsking(true)}>
          {t('start')}
        </Button>
      ) : (
        <div className="space-y-2 text-sm">
          <p>{t('explain')}</p>
          {impact.data ? <ImpactList impact={impact.data} /> : null}
          <div className="flex gap-2">
            <Button
              type="button"
              variant="destructive"
              size="sm"
              disabled={!impact.data || actions.remove.isPending}
              onClick={() =>
                actions.remove.mutate({ id: entry.material.material_id }, { onSuccess: onDeleted })
              }
            >
              {t('confirm')}
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={() => setAsking(false)}>
              {t('cancel')}
            </Button>
          </div>
        </div>
      )}
      <ErrorNote error={actions.remove.error ?? impact.error} />
    </section>
  )
}
