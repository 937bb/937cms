import { http } from './http';

export type UploadMode = 'image' | 'any';

export async function uploadFile(opts: { file: File; dir?: string; mode?: UploadMode }) {
  const form = new FormData();
  form.append('file', opts.file);
  if (opts.dir) form.append('dir', opts.dir);
  if (opts.mode) form.append('mode', opts.mode);

  const res = await http.post('/admin/upload', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return res.data as {
    ok: boolean;
    url: string;
    filename: string;
    originalName: string;
    size: number;
    mime: string;
  };
}
