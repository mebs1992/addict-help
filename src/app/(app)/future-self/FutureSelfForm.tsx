'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { saveFutureSelf } from '@/lib/actions';

export function FutureSelfForm({
  userId,
  defaultCaption,
}: {
  userId: string;
  defaultCaption: string;
}) {
  const [caption, setCaption] = useState(defaultCaption);
  const [uploadedUrl, setUploadedUrl] = useState<string>('');
  const [status, setStatus] = useState<'idle' | 'uploading' | 'saving' | 'done' | 'error'>('idle');
  const [error, setError] = useState<string>('');

  async function handleFile(file: File) {
    setStatus('uploading');
    setError('');
    try {
      const supabase = createClient();
      const ext = file.name.split('.').pop() || 'jpg';
      const path = `${userId}/${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from('future-self')
        .upload(path, file, { upsert: true, cacheControl: '3600' });
      if (upErr) throw upErr;
      const { data } = supabase.storage.from('future-self').getPublicUrl(path);
      setUploadedUrl(data.publicUrl);
      setStatus('idle');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Upload failed');
      setStatus('error');
    }
  }

  async function handleSubmit(formData: FormData) {
    setStatus('saving');
    if (uploadedUrl) formData.set('image_url', uploadedUrl);
    await saveFutureSelf(formData);
    setStatus('done');
  }

  return (
    <form action={handleSubmit} className="card space-y-4">
      <div>
        <label className="label" htmlFor="photo">
          Upload a photo (your family, or what you&apos;re saving for)
        </label>
        <input
          id="photo"
          type="file"
          accept="image/*"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) handleFile(f);
          }}
          className="input file:mr-3 file:rounded-lg file:border-0 file:bg-brand-500 file:px-3 file:py-1.5 file:text-ink-950"
        />
        {status === 'uploading' && (
          <p className="muted mt-1">Uploading…</p>
        )}
        {uploadedUrl && status !== 'uploading' && (
          <p className="muted mt-1 text-brand-400">Photo ready ✓</p>
        )}
        {error && <p className="muted mt-1 text-danger-400">{error}</p>}
      </div>

      <div>
        <label className="label" htmlFor="caption">
          What does this represent?
        </label>
        <textarea
          id="caption"
          name="caption"
          value={caption}
          onChange={(e) => setCaption(e.target.value)}
          rows={3}
          placeholder="My kids' first overseas trip — this is what I'm playing for."
          className="input resize-none"
        />
      </div>

      <button
        className="btn-primary w-full py-3"
        disabled={status === 'uploading' || status === 'saving'}
      >
        {status === 'saving' ? 'Saving…' : 'Save my future self'}
      </button>
      {status === 'done' && (
        <p className="muted text-center text-brand-400">Saved 💚</p>
      )}
    </form>
  );
}
