import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState, type FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { api, problemMessage } from '../api/client';
import type { JobInput, Modality, Seniority } from '../api/types';
import { JOB_CURRENCY } from '../components/labels';
import { useI18n } from '../i18n';
import { useToast } from '../components/Toast';
import { FlameIcon } from '../components/UrgentBadge';

/** Categoría de la taxonomía que agrupa las habilidades blandas. */
const SOFT = 'Soft skills';

const EMPTY: JobInput = {
  title: '', description: '', seniority: 'mid', modality: 'remote', country: 'MX', city: null,
  salaryMin: null, salaryMax: null, currency: JOB_CURRENCY, positionsTotal: 1, skills: [], softSkills: [], externalId: null, urgent: false,
};

/** Crear (/e/vacantes/nueva) o editar (/e/vacantes/:jobId/editar) una vacante. */
export function JobFormPage() {
  const { jobId } = useParams();
  const editing = !!jobId;
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { show } = useToast();
  const { t } = useI18n();
  const taxonomy = useQuery({ queryKey: ['skills'], queryFn: api.skills, staleTime: Infinity });
  const existing = useQuery({ queryKey: ['employer-job', jobId], queryFn: () => api.employerJob(jobId!), enabled: editing });
  const [f, setF] = useState<JobInput>(EMPTY);
  const [toAdd, setToAdd] = useState('');
  const [softToAdd, setSoftToAdd] = useState('');
  const softList = f.softSkills ?? [];
  const technicalTaxonomy = (taxonomy.data ?? []).filter((s) => s.category !== SOFT);
  const softTaxonomy = (taxonomy.data ?? []).filter((s) => s.category === SOFT);

  useEffect(() => {
    const j = existing.data;
    if (!j) return;
    setF({
      title: j.title, description: j.description, seniority: j.seniority as Seniority, modality: j.modality, country: j.country, city: j.city,
      salaryMin: j.salary?.min ?? null, salaryMax: j.salary?.max ?? null, currency: JOB_CURRENCY,
      positionsTotal: j.positionsTotal, externalId: j.externalId, urgent: !!j.urgent,
      skills: j.skills.filter((s) => s.category !== SOFT).map(({ name, level, mustHave }) => ({ name, level, mustHave })),
      softSkills: j.skills.filter((s) => s.category === SOFT).map(({ name, level, mustHave }) => ({ name, level, mustHave })),
    });
  }, [existing.data]);

  const save = useMutation({
    mutationFn: (publish: boolean) => (editing ? api.updateJob(jobId!, f) : api.createJob(f, publish)),
    onSuccess: (j) => {
      qc.invalidateQueries({ queryKey: ['employer-jobs'] });
      qc.invalidateQueries({ queryKey: ['employer-dashboard'] });
      qc.invalidateQueries({ queryKey: ['jobs'] });
      show({ title: editing ? t.jobForm.updated : j.status === 'published' ? t.jobForm.published : t.jobForm.draftSaved, body: j.title, tone: 'success' });
      navigate('/e/vacantes');
    },
  });

  const set = <K extends keyof JobInput>(k: K, v: JobInput[K]) => setF((x) => ({ ...x, [k]: v }));
  const money = (v: string) => (v === '' ? null : Number(v));
  const addSkill = () => {
    const s = taxonomy.data?.find((t) => t.id === toAdd);
    if (s && !f.skills.some((x) => x.name === s.name)) set('skills', [...f.skills, { name: s.name, level: 3, mustHave: false }]);
    setToAdd('');
  };
  const addSoft = () => {
    const s = softTaxonomy.find((x) => x.id === softToAdd);
    if (s && !softList.some((x) => x.name === s.name)) set('softSkills', [...softList, { name: s.name, level: 3, mustHave: false }]);
    setSoftToAdd('');
    setToAdd('');
  };
  const submit = (publish: boolean) => (e?: FormEvent) => { e?.preventDefault(); save.mutate(publish); };

  if (editing && existing.isLoading) return <p className="muted">{t.common.loading}</p>;
  if (existing.isError) return <p role="alert" className="error">{problemMessage(existing.error)}</p>;

  return (
    <section>
      <Link to="/e/vacantes">{t.jobForm.back}</Link>
      <header className="page-header"><h1>{editing ? t.jobForm.editTitle : t.jobForm.newTitle}</h1></header>
      <form className="card" onSubmit={submit(false)} aria-label={editing ? t.jobForm.editTitle : t.jobForm.newTitle}>
        <div className="form-grid">
          <div className="field span-2"><label htmlFor="j-title">{t.jobForm.title}</label>
            <input id="j-title" required minLength={3} maxLength={160} value={f.title} onChange={(e) => set('title', e.target.value)} /></div>
          <div className="field span-2"><label htmlFor="j-desc">{t.jobForm.description}</label>
            <textarea id="j-desc" required minLength={10} rows={6} value={f.description} onChange={(e) => set('description', e.target.value)} /></div>
          <div className="field"><label htmlFor="j-seniority">{t.jobForm.seniority}</label>
            <select id="j-seniority" value={f.seniority} onChange={(e) => set('seniority', e.target.value as Seniority)}>
              {(['junior', 'mid', 'senior', 'lead'] as const).map((s) => <option key={s} value={s}>{t.seniority[s]}</option>)}
            </select></div>
          <div className="field"><label htmlFor="j-modality">{t.jobForm.modality}</label>
            <select id="j-modality" value={f.modality} onChange={(e) => set('modality', e.target.value as Modality)}>
              {(Object.keys(t.modality) as Modality[]).map((m) => <option key={m} value={m}>{t.modality[m]}</option>)}
            </select></div>
          <div className="field"><label htmlFor="j-country">{t.jobForm.country}</label>
            <input id="j-country" required maxLength={2} value={f.country} onChange={(e) => set('country', e.target.value.toUpperCase())} /></div>
          <div className="field"><label htmlFor="j-city">{t.jobForm.city}</label>
            <input id="j-city" value={f.city ?? ''} onChange={(e) => set('city', e.target.value || null)} /></div>
          <div className="field"><label htmlFor="j-min">{t.jobForm.salaryMin}</label>
            <input id="j-min" type="number" min={0} step={100} value={f.salaryMin ?? ''} onChange={(e) => set('salaryMin', money(e.target.value))} /></div>
          <div className="field"><label htmlFor="j-max">{t.jobForm.salaryMax}</label>
            <input id="j-max" type="number" min={0} step={100} value={f.salaryMax ?? ''} onChange={(e) => set('salaryMax', money(e.target.value))} /></div>
          <div className="field"><label htmlFor="j-currency">{t.jobForm.currency}</label>
            <input id="j-currency" value={t.jobForm.currencyValue} readOnly aria-describedby="j-currency-hint" />
            <small id="j-currency-hint" className="muted">{t.jobForm.currencyHint}</small></div>
          <div className="field"><label htmlFor="j-positions">{t.jobForm.positions}</label>
            <input id="j-positions" type="number" min={1} max={1000} required value={f.positionsTotal} onChange={(e) => set('positionsTotal', Number(e.target.value))} /></div>
          <div className="field"><label htmlFor="j-ext">{t.jobForm.externalId}</label>
            <input id="j-ext" maxLength={120} placeholder="REQ-2026-0042" value={f.externalId ?? ''} onChange={(e) => set('externalId', e.target.value || null)} /></div>
        </div>

        <label className={`urgent-toggle facet${f.urgent ? ' urgent-toggle--on' : ''}`}>
          <input type="checkbox" checked={!!f.urgent} onChange={(e) => set('urgent', e.target.checked)} />
          <span className="row"><FlameIcon size={16} /> {t.urgent.formLabel}</span>
          <span className="small muted">{t.urgent.formHint}</span>
        </label>

        <fieldset className="field">
          <legend>{t.jobForm.skills}</legend>
          <p className="small muted">{t.jobForm.skillsHint}</p>
          {f.skills.length === 0 && <p className="muted small">{t.jobForm.skillsEmpty}</p>}
          <ul className="skill-list">
            {f.skills.map((s, i) => (
              <li key={s.name} className="row between">
                <span>{s.name}</span>
                <label className="row small">{t.jobForm.level}
                  <input type="range" min={1} max={5} value={s.level} aria-label={t.jobForm.levelOf(s.name)}
                    onChange={(e) => set('skills', f.skills.map((x, k) => (k === i ? { ...x, level: Number(e.target.value) } : x)))} />
                  <output>{s.level}</output>
                </label>
                <label className="row small"><input type="checkbox" checked={s.mustHave}
                  onChange={(e) => set('skills', f.skills.map((x, k) => (k === i ? { ...x, mustHave: e.target.checked } : x)))} />{t.jobForm.mandatory}</label>
                <button type="button" className="btn btn--ghost small" aria-label={t.jobForm.removeSkill(s.name)} onClick={() => set('skills', f.skills.filter((_, k) => k !== i))}>{t.common.remove}</button>
              </li>
            ))}
          </ul>
          <div className="row">
            <label className="sr-only" htmlFor="j-add-skill">{t.jobForm.addSkill}</label>
            <select id="j-add-skill" value={toAdd} onChange={(e) => setToAdd(e.target.value)}>
              <option value="">{t.jobForm.addSkillOption}</option>
              {technicalTaxonomy.filter((x) => !f.skills.some((s) => s.name === x.name)).map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}
            </select>
            <button type="button" className="btn" disabled={!toAdd} onClick={addSkill}>{t.common.add}</button>
          </div>
        </fieldset>

        <fieldset className="field soft-fieldset">
          <legend className="soft-skills-heading">{t.soft.formTitle}</legend>
          <p className="small muted">{t.soft.formHint}</p>
          {softList.length === 0 && <p className="muted small">{t.soft.formEmpty}</p>}
          <ul className="skill-list">
            {softList.map((s, i) => (
              <li key={s.name} className="row between">
                <span className="chip chip--soft">{s.name}</span>
                <label className="row small">{t.jobForm.level}
                  <input type="range" min={1} max={5} value={s.level} aria-label={t.jobForm.levelOf(s.name)}
                    onChange={(e) => set('softSkills', softList.map((x, k) => (k === i ? { ...x, level: Number(e.target.value) } : x)))} />
                  <output>{s.level}</output>
                </label>
                <button type="button" className="btn btn--ghost small" aria-label={t.jobForm.removeSkill(s.name)}
                  onClick={() => set('softSkills', softList.filter((_, k) => k !== i))}>{t.common.remove}</button>
              </li>
            ))}
          </ul>
          <div className="row">
            <label className="sr-only" htmlFor="j-add-soft">{t.soft.add}</label>
            <select id="j-add-soft" value={softToAdd} onChange={(e) => setSoftToAdd(e.target.value)}>
              <option value="">{t.soft.addOption}</option>
              {softTaxonomy.filter((x) => !softList.some((s) => s.name === x.name)).map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}
            </select>
            <button type="button" className="btn" disabled={!softToAdd} onClick={addSoft}>{t.common.add}</button>
          </div>
        </fieldset>

        <div className="row">
          {editing ? (
            <button className="btn btn--primary" disabled={save.isPending}>{save.isPending ? t.common.saving : t.jobForm.saveChanges}</button>
          ) : (
            <>
              <button className="btn" disabled={save.isPending}>{t.jobForm.saveDraft}</button>
              <button type="button" className="btn btn--primary" disabled={save.isPending || f.skills.length === 0} onClick={submit(true)}>
                {t.jobForm.publish}
              </button>
            </>
          )}
        </div>
        {!editing && <p className="small muted">{t.jobForm.paymentNote}</p>}
        {save.isError && <p role="alert" className="error">{problemMessage(save.error)}</p>}
      </form>
    </section>
  );
}
