'use client'

import { useSearchParams } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { useMemo, useState } from 'react'

import type { Recognition } from '@/contracts/library'
import { Button } from '@/components/ui/button'
import { useRouter } from '@/i18n/navigation'
import { useCrossAppOrigin } from '@/lib/cross-app/use-cross-app'
import { leaveTo } from '@/lib/leave-to'

import {
  errorCode,
  useAccount,
  useAddVersion,
  useEntries,
  useRecognize,
  useUpload,
  useUsage,
  useVocabulary,
} from '../api/library'
import {
  EMPTY_DRAFT,
  LICENSES,
  duplicatesOf,
  formatBytes,
  mergeDraft,
  needsAttest,
  paths,
  prefillOf,
  recognizedFields,
  uploadQuery,
  type Draft,
} from '../model/library'
import { DescriptionForm } from './description-form'
import { ErrorNote } from './error-note'

// 上传（0044 第 2.3 节）与直达上传（第 2.4 节）。选文件 → 先识别描述 → 本人确认或改 →
// 选许可档、要不要交加工 → 传。直达上传的链接带来源应用、引用和要的那一样的描述（预填）；
// 传完 knowbase 在同一个上传里记下「展示给来源应用」，再回到原处（地址只从配置里来）。
export function UploadPanel({ csrfToken }: { csrfToken: string }) {
  const t = useTranslations('library.upload')
  const tl = useTranslations('library.license')
  const router = useRouter()
  const search = useSearchParams()
  const prefill = useMemo(() => prefillOf(search), [search])
  const source = search.get('from')
  const ref = search.get('ref')
  const origin = useCrossAppOrigin()
  const vocabulary = useVocabulary()
  const usage = useUsage()
  const account = useAccount()
  const entries = useEntries()
  const recognize = useRecognize(csrfToken)
  const upload = useUpload(csrfToken)
  const addVersion = useAddVersion(csrfToken)

  const [file, setFile] = useState<File | null>(null)
  const [recognition, setRecognition] = useState<Recognition | null>(null)
  const [draft, setDraft] = useState<Draft>({ ...EMPTY_DRAFT, ...prefill })
  const [confirm, setConfirm] = useState(false)
  const [license, setLicense] = useState('self')
  const [attest, setAttest] = useState(false)
  const [process, setProcess] = useState(false)
  const [asVersionOf, setAsVersionOf] = useState<string | null>(null)
  const [tooLarge, setTooLarge] = useState(false)

  const recognized = useMemo(() => recognizedFields(recognition, prefill), [recognition, prefill])
  const duplicates = file && entries.data ? duplicatesOf(entries.data, file.name, draft) : []
  const direct = Boolean(origin.data)
  const maxBytes = usage.data?.max_item_bytes ?? 50 * 1024 * 1024
  const accept = (usage.data?.accepted ?? ['.pdf', '.xlsx', '.xls', '.csv', '.txt', '.md']).join(
    ',',
  )
  const attestNeeded = needsAttest('self', license)
  const busy = recognize.isPending || upload.isPending || addVersion.isPending

  function choose(next: File | null) {
    setFile(next)
    setRecognition(null)
    setAsVersionOf(null)
    setTooLarge(false)
    recognize.reset()
    upload.reset()
    if (!next) return
    if (next.size > maxBytes) {
      setTooLarge(true)
      return
    }
    recognize.mutate(next, {
      onSuccess: (found) => {
        setRecognition(found)
        setDraft(mergeDraft(prefill, found))
      },
      // 识别不出不挡上传：照链接预填的来，本人自己填
      onError: () => setDraft(mergeDraft(prefill, null)),
    })
  }

  function done(materialId: string) {
    const back = origin.data?.return_url
    if (back) {
      leaveTo(back)
      return
    }
    router.push(paths.library('uploaded', materialId))
  }

  function submit() {
    if (!file) return
    if (asVersionOf) {
      addVersion.mutate(
        { id: asVersionOf, file, process },
        { onSuccess: (entry) => done(entry.material.material_id) },
      )
      return
    }
    if (attestNeeded && !attest) return
    const query = uploadQuery(draft, vocabulary.data, {
      name: file.name,
      confirm,
      license,
      attest,
      process,
      from: source,
      ref,
    })
    upload.mutate({ file, query }, { onSuccess: (entry) => done(entry.material.material_id) })
  }

  return (
    <div className="space-y-6">
      {direct ? (
        <section className="rounded-lg border border-sky-200 bg-sky-50 p-4 text-sm text-sky-950">
          <p className="font-medium">{t('directTitle', { app: origin.data?.app ?? '' })}</p>
          <p className="mt-1">{t('directHint', { app: origin.data?.app ?? '' })}</p>
        </section>
      ) : null}

      <section className="space-y-2 rounded-lg border p-4">
        <label className="block space-y-2 text-sm">
          <span className="font-medium">{t('pick')}</span>
          <input
            type="file"
            accept={accept}
            disabled={busy}
            onChange={(event) => choose(event.target.files?.[0] ?? null)}
          />
        </label>
        <p className="text-muted-foreground text-xs">
          {t('limits', { size: formatBytes(maxBytes) })}
          {usage.data
            ? ` ${t('space', {
                used: formatBytes(usage.data.bytes_used),
                quota: formatBytes(usage.data.quota_bytes),
              })}`
            : null}
        </p>
        {tooLarge ? (
          <p role="alert" className="text-destructive text-sm">
            {t('tooLarge', { size: formatBytes(maxBytes) })}
          </p>
        ) : null}
        {recognize.isPending ? <p className="text-sm">{t('recognizing')}</p> : null}
        {recognition ? (
          <p className="text-muted-foreground text-xs">
            {recognition.fields.length
              ? t('recognized', { count: recognition.fields.length })
              : t('recognizedNothing')}{' '}
            {t('rulesVersion', { version: recognition.rules_version })}
          </p>
        ) : null}
        <ErrorNote error={recognize.error} />
      </section>

      {file && !tooLarge && vocabulary.data ? (
        <>
          {duplicates.length ? (
            <section className="space-y-2 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm">
              <p className="font-medium">{t('duplicate')}</p>
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  name="duplicate"
                  checked={asVersionOf === null}
                  onChange={() => setAsVersionOf(null)}
                />
                {t('anotherMaterial')}
              </label>
              {duplicates.map((entry) => (
                <label key={entry.material.material_id} className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="duplicate"
                    checked={asVersionOf === entry.material.material_id}
                    onChange={() => setAsVersionOf(entry.material.material_id)}
                  />
                  {t('asNewVersion', {
                    name: entry.material.name,
                    version: entry.material.current_version + 1,
                  })}
                </label>
              ))}
            </section>
          ) : null}

          {asVersionOf === null ? (
            <section className="space-y-4 rounded-lg border p-4">
              <div>
                <h2 className="font-medium">{t('describe')}</h2>
                <p className="text-muted-foreground text-xs">{t('describeHint')}</p>
              </div>
              <DescriptionForm
                draft={draft}
                onChange={setDraft}
                vocabulary={vocabulary.data}
                recognized={recognized}
                disabled={busy}
              />
              <label className="flex items-start gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={confirm}
                  onChange={(event) => setConfirm(event.target.checked)}
                />
                <span>
                  <span className="font-medium">{t('confirm')}</span>
                  <span className="text-muted-foreground block text-xs">{t('confirmHint')}</span>
                </span>
              </label>

              <div className="space-y-2 text-sm">
                <span className="font-medium">{tl('title')}</span>
                {LICENSES.map((code) => (
                  <label key={code} className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="license"
                      checked={license === code}
                      onChange={() => {
                        setLicense(code)
                        setAttest(false)
                      }}
                    />
                    {tl(code)}
                  </label>
                ))}
                {attestNeeded ? (
                  <label className="flex items-start gap-2 rounded-md bg-amber-50 p-2">
                    <input
                      type="checkbox"
                      checked={attest}
                      onChange={(event) => setAttest(event.target.checked)}
                    />
                    <span>{tl('attest', { license: tl(license) })}</span>
                  </label>
                ) : null}
              </div>
            </section>
          ) : null}

          <section className="space-y-3 rounded-lg border p-4 text-sm">
            <label className="flex items-start gap-2">
              <input
                type="checkbox"
                checked={process}
                onChange={(event) => setProcess(event.target.checked)}
              />
              <span>
                <span className="font-medium">{t('process')}</span>
                <span className="text-muted-foreground block text-xs">{t('processHint')}</span>
              </span>
            </label>
            {account.data ? (
              <p className="text-muted-foreground text-xs">
                {account.data.displays_by_default ? t('defaultShown') : t('defaultNotShown')}
              </p>
            ) : null}
            <div className="flex items-center gap-3">
              <Button
                type="button"
                onClick={submit}
                disabled={busy || (attestNeeded && !attest && asVersionOf === null)}
              >
                {upload.isPending || addVersion.isPending ? t('uploading') : t('submit')}
              </Button>
              {direct && origin.data?.return_url ? (
                <span className="text-muted-foreground text-xs">{t('willReturn')}</span>
              ) : null}
            </div>
            <ErrorNote error={upload.error ?? addVersion.error} />
            {errorCode(upload.error) === 'quota_exceeded' ? (
              <p className="text-muted-foreground text-xs">{t('quotaHint')}</p>
            ) : null}
          </section>
        </>
      ) : null}
    </div>
  )
}
