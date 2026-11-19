import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { Link, useSearchParams } from 'react-router';
import { api, problemMessage } from '../api/client';
import type { CandidateProfileFull, CandidateSkill, Modality, ProfileInput, Seniority } from '../api/types';
import { AIBadge } from '../components/AIBadge';
import { ApplicationMarks } from '../components/ApplicationMarks';
import { useI18n } from '../i18n';

/** Categoría de la taxonomía que agrupa las habilidades blandas. */
const SOFT = 'Soft skills';

type Draft = { skillId: string; name: string; category: string; level: number; selected: boolean; proposed: boolean; evidence: string | null };

const toDraft = (s: CandidateSkill): Draft => ({
  skillId: s.skillId, name: s.name, category: s.category, level: Math.max(1, s.level),
  selected: s.confirmed, proposed: !s.confirmed, evidence: s.evidence,
});

const RESUME_ACCEPT = '.pdf,.txt,.md,application/pdf,text/plain,text/markdown';

/** Página del candidato: datos profesionales, CV (archivo o texto) → skills, y vacantes aplicadas. */
export function ProfilePage() {
  const profile = useQuery({ queryKey: ['profile'], queryFn: api.myProfile });
  const [params] = useSearchParams();
  const { t } = useI18n();

  return (
    <section>
      <header className="page-header"><h1>{t.profile.title}</h1></header>
      {params.has('bienvenida') && (
        <p className="card aurora" role="status">{t.profile.welcome}</p>
      )}
      {profile.isError && <p role="alert" className="error">{problemMessage(profile.error)}</p>}
      {profile.data && <PersonalInfo profile={profile.data} />}
      <ResumeAndSkills profile={profile.data} />
      <AppliedJobs />
    </section>
  );
}

function PersonalInfo({ profile }: { profile: CandidateProfileFull }) {
  const qc = useQueryClient();
  const { t } = useI18n();
  const [f, setF] = useState<ProfileInput>({
    fullName: profile.fullName, headline: profile.headline, seniority: profile.seniority as Seniority | null,
    country: profile.country, preferredModalities: profile.preferredModalities ?? [], salaryExpectation: profile.salaryExpectation,
  });
  const save = useMutation({
    mutationFn: () => api.updateProfile(f),
    onSuccess: (p) => {
      qc.setQueryData(['profile'], p);
      qc.invalidateQueries({ queryKey: ['match'] });
      qc.invalidateQueries({ queryKey: ['candidate-dashboard'] });
    },
  });
  const toggleModality = (m: Modality) =>
    setF({ ...f, preferredModalities: f.preferredModalities.includes(m) ? f.preferredModalities.filter((x) => x !== m) : [...f.preferredModalities, m] });

  return (
    <form className="card" aria-labelledby="info-title" onSubmit={(e: FormEvent) => { e.preventDefault(); save.mutate(); }}>
      <h2 id="info-title">{t.profile.myData}</h2>
      <div className="form-grid">
        <div className="field"><label htmlFor="p-name">{t.profile.fullName}</label>
          <input id="p-name" required minLength={2} value={f.fullName} onChange={(e) => setF({ ...f, fullName: e.target.value })} /></div>
        <div className="field"><label htmlFor="p-headline">{t.profile.headline}</label>
          <input id="p-headline" maxLength={160} value={f.headline ?? ''} onChange={(e) => setF({ ...f, headline: e.target.value })} /></div>
        <div className="field"><label htmlFor="p-seniority">{t.profile.seniority}</label>
          <select id="p-seniority" value={f.seniority ?? ''} onChange={(e) => setF({ ...f, seniority: (e.target.value || null) as Seniority | null })}>
            <option value="">{t.profile.unspecified}</option>
            {(['junior', 'mid', 'senior', 'lead'] as const).map((s) => <option key={s} value={s}>{t.seniority[s]}</option>)}
          </select></div>
        <div className="field"><label htmlFor="p-country">{t.profile.country}</label>
          <input id="p-country" maxLength={2} value={f.country ?? ''} onChange={(e) => setF({ ...f, country: e.target.value.toUpperCase() })} /></div>
        <div className="field"><label htmlFor="p-salary">{t.profile.salary}</label>
          <input id="p-salary" type="number" min={0} step={100} value={f.salaryExpectation ?? ''}
            onChange={(e) => setF({ ...f, salaryExpectation: e.target.value ? Number(e.target.value) : null })} /></div>
        <fieldset className="field"><legend>{t.profile.modalities}</legend>
          <div className="row">
            {(Object.keys(t.modality) as Modality[]).map((m) => (
              <label key={m} className="row small"><input type="checkbox" checked={f.preferredModalities.includes(m)} onChange={() => toggleModality(m)} />{t.modality[m]}</label>
            ))}
          </div>
        </fieldset>
      </div>
      <p className="small muted">{t.profile.noSensitive}</p>
      <button className="btn btn--primary" disabled={save.isPending}>{save.isPending ? t.common.saving : t.profile.saveData}</button>
      {save.isSuccess && <p role="status" className="success">{t.profile.saved}</p>}
      {save.isError && <p role="alert" className="error">{problemMessage(save.error)}</p>}
    </form>
  );
}

function ResumeAndSkills({ profile }: { profile: CandidateProfileFull | undefined }) {
  const qc = useQueryClient();
  const { t } = useI18n();
  const taxonomy = useQuery({ queryKey: ['skills'], queryFn: api.skills, staleTime: Infinity });
  const [cv, setCv] = useState('');
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [toAdd, setToAdd] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (profile) setDrafts(profile.skills.map(toDraft));
  }, [profile]);

  const onExtracted = (r: { proposedSkills: CandidateSkill[]; confirmedSkills: CandidateSkill[] }) =>
    setDrafts([...r.confirmedSkills, ...r.proposedSkills].map(toDraft).map((d) => (d.proposed ? { ...d, selected: true } : d)));
  const upload = useMutation({ mutationFn: () => api.submitResume(cv), onSuccess: onExtracted });
  const uploadFile = useMutation({
    mutationFn: (file: File) => api.uploadResumeFile(file),
    onSuccess: (r) => { onExtracted(r); if (fileRef.current) fileRef.current.value = ''; },
  });
  const confirm = useMutation({
    mutationFn: () => api.confirmSkills(drafts.filter((d) => d.selected).map(({ skillId, level }) => ({ skillId, level }))),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['profile'] });
      qc.invalidateQueries({ queryKey: ['match'] });
      qc.invalidateQueries({ queryKey: ['candidate-dashboard'] });
    },
  });

  // Técnicas y soft skills se muestran y agregan por separado (las soft, en verde); se confirman juntas.
  const available = useMemo(
    () => (taxonomy.data ?? []).filter((x) => x.category !== SOFT && !drafts.some((d) => d.skillId === x.id)),
    [taxonomy.data, drafts],
  );
  const availableSoft = useMemo(
    () => (taxonomy.data ?? []).filter((x) => x.category === SOFT && !drafts.some((d) => d.skillId === x.id)),
    [taxonomy.data, drafts],
  );
  const [softToAdd, setSoftToAdd] = useState('');
  const technicalDrafts = drafts.filter((d) => d.category !== SOFT);
  const softDrafts = drafts.filter((d) => d.category === SOFT);
  const update = (id: string, patch: Partial<Draft>) => setDrafts((ds) => ds.map((d) => (d.skillId === id ? { ...d, ...patch } : d)));
  const addSkill = () => {
    const s = taxonomy.data?.find((t) => t.id === toAdd);
    if (!s) return;
    setDrafts((ds) => [...ds, { skillId: s.id, name: s.name, category: s.category, level: 3, selected: true, proposed: false, evidence: null }]);
    setToAdd('');
  };
  const addSoft = () => {
    const s = taxonomy.data?.find((x) => x.id === softToAdd);
    if (!s) return;
    setDrafts((ds) => [...ds, { skillId: s.id, name: s.name, category: s.category, level: 3, selected: true, proposed: false, evidence: null }]);
    setSoftToAdd('');
  };
  const skillItem = (d: Draft) => (
    <li key={d.skillId} className={`${d.proposed ? 'proposed' : ''}${d.category === SOFT ? ' skill--soft' : ''}`}>
      <label className="row">
        <input type="checkbox" checked={d.selected} onChange={(e) => update(d.skillId, { selected: e.target.checked })} />
        <span>{d.name} <small className={d.category === SOFT ? 'skill__category--soft' : 'muted'}>{t.categories[d.category] ?? d.category}</small></span>
      </label>
      <label className="row small">
        {t.profile.level}
        <input type="range" min={1} max={5} value={d.level} aria-label={t.profile.levelOf(d.name)}
          onChange={(e) => update(d.skillId, { level: Number(e.target.value) })} />
        <output>{d.level}</output>
      </label>
      {d.evidence && <p className="small muted evidence">“{d.evidence}”</p>}
    </li>
  );
  const busy = upload.isPending || uploadFile.isPending;
  const uploadError = upload.error ?? uploadFile.error;

  return (
    <div className="two-col section-gap">
      <form className="card" onSubmit={(e) => { e.preventDefault(); upload.mutate(); }}>
        <h2>{t.profile.cvTitle}</h2>
        <div className="dropzone">
          <label htmlFor="cv-file">{t.profile.uploadCv}</label>
          <input id="cv-file" ref={fileRef} type="file" accept={RESUME_ACCEPT} disabled={busy}
            onChange={(e) => { const file = e.target.files?.[0]; if (file) uploadFile.mutate(file); }} />
          {profile?.hasResume && <p className="small muted">{t.profile.hasCv}</p>}
        </div>
        <p className="small muted divider">{t.profile.orPaste}</p>
        <label htmlFor="cv">{t.profile.pasteCv}</label>
        <textarea id="cv" rows={8} value={cv} onChange={(e) => setCv(e.target.value)} maxLength={30000}
          placeholder={t.profile.cvPlaceholder} />
        <p className="small muted">{t.profile.cvPrivacy}</p>
        <button className="btn btn--primary" disabled={cv.trim().length < 30 || busy}>
          {busy ? t.profile.analyzing : t.profile.extract}
        </button>
        {uploadFile.isPending && <p className="small muted" role="status">{t.profile.readingFile}</p>}
        {uploadError && <p role="alert" className="error">{problemMessage(uploadError)}</p>}
      </form>

      <section className="card" aria-labelledby="skills-title">
        <header className="row between">
          <h2 id="skills-title">{t.profile.skillsTitle}</h2>
          {drafts.some((d) => d.proposed) && <AIBadge>{t.profile.proposedByAi}</AIBadge>}
        </header>
        <p className="small muted">{t.profile.onlyConfirmed}</p>
        {drafts.length === 0 && <p className="muted">{t.profile.noSkills}</p>}
        <h3 className="profile-skills__title">{t.profile.technicalTitle}</h3>
        <ul className="skill-list" aria-label={t.profile.technicalTitle}>{technicalDrafts.map(skillItem)}</ul>
        <div className="row">
          <label className="sr-only" htmlFor="add-skill">{t.profile.addSkill}</label>
          <select id="add-skill" value={toAdd} onChange={(e) => setToAdd(e.target.value)}>
            <option value="">{t.profile.addSkillOption}</option>
            {available.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
          <button type="button" className="btn" onClick={addSkill} disabled={!toAdd}>{t.common.add}</button>
        </div>

        <fieldset className="field soft-fieldset profile-soft">
          <legend className="soft-skills-heading">{t.soft.title}</legend>
          <p className="small muted">{t.profile.softHint}</p>
          {softDrafts.length === 0 && <p className="muted small">{t.soft.formEmpty}</p>}
          <ul className="skill-list" aria-label={t.soft.title}>{softDrafts.map(skillItem)}</ul>
          <div className="row">
            <label className="sr-only" htmlFor="add-soft-skill">{t.soft.add}</label>
            <select id="add-soft-skill" value={softToAdd} onChange={(e) => setSoftToAdd(e.target.value)}>
              <option value="">{t.soft.addOption}</option>
              {availableSoft.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}
            </select>
            <button type="button" className="btn" onClick={addSoft} disabled={!softToAdd} aria-label={t.soft.add}>{t.common.add}</button>
          </div>
        </fieldset>
        <button className="btn btn--primary" onClick={() => confirm.mutate()} disabled={confirm.isPending || drafts.length === 0}>
          {confirm.isPending ? t.common.saving : t.profile.confirmN(drafts.filter((d) => d.selected).length)}
        </button>
        {confirm.isSuccess && <p role="status" className="success">{t.profile.confirmed}</p>}
        {confirm.isError && <p role="alert" className="error">{problemMessage(confirm.error)}</p>}
      </section>
    </div>
  );
}

function AppliedJobs() {
  const { t } = useI18n();
  const dash = useQuery({ queryKey: ['candidate-dashboard'], queryFn: api.candidateDashboard, refetchInterval: 30_000 });
  const apps = dash.data?.applications ?? [];
  return (
    <section id="postulaciones" className="card section-gap" aria-labelledby="applied-title">
      <header className="row between">
        <h2 id="applied-title">{t.profile.appliedTitle}</h2>
        <Link to="/c/dashboard" className="small">{t.profile.seeProgress}</Link>
      </header>
      {dash.isLoading && <p className="muted">{t.common.loading}</p>}
      {dash.data && apps.length === 0 && <p className="muted">{t.profile.noApplied}<Link to="/jobs">{t.profile.exploreJobs}</Link>.</p>}
      {apps.length > 0 && (
        <table className="table table--stack">
          <caption className="sr-only">{t.profile.tableCaption}</caption>
          <thead><tr><th scope="col">{t.profile.colJob}</th><th scope="col">{t.profile.colCompany}</th><th scope="col">{t.profile.colStatus}</th><th scope="col">{t.profile.colMatch}</th><th scope="col">{t.profile.colNotices}</th></tr></thead>
          <tbody>
            {apps.map((a) => (
              <tr key={a.id} className={a.job?.status === 'closed' ? 'row--muted' : ''}>
                <th scope="row">{a.job?.status === 'published' ? <Link to={`/jobs/${a.jobId}`}>{a.job.title}</Link> : (a.job?.title ?? t.profile.colJob)}</th>
                <td data-label={t.profile.colCompany}>{a.job?.organizationName}</td>
                <td data-label={t.profile.colStatus}>{t.status[a.status]}</td>
                <td data-label={t.profile.colMatch}>{a.matchScore !== null ? `${Math.round(a.matchScore * 100)}%` : '—'}</td>
                <td data-label={t.profile.colNotices}><ApplicationMarks status={a.status} jobStatus={a.job?.status} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}
