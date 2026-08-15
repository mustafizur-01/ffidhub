import { useState } from 'react';
import { UploadCloud, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

interface Props {
  onPublished?: () => void;
}

const AdminReleaseUploader = ({ onPublished }: Props) => {
  const { user } = useAuth();
  const [version, setVersion] = useState('');
  const [versionCode, setVersionCode] = useState('');
  const [minAndroid, setMinAndroid] = useState('7.0');
  const [notes, setNotes] = useState('');
  const [externalUrl, setExternalUrl] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);

  const publish = async () => {
    if (!version.trim() || !versionCode.trim()) {
      toast.error('Version name and version code are required');
      return;
    }
    if (!file && !externalUrl.trim()) {
      toast.error('Upload an APK file or provide a direct download link');
      return;
    }
    setBusy(true);
    try {
      let apk_path: string | null = null;
      let size_mb: number | null = null;
      if (file) {
        const path = `releases/${version.trim().replace(/[^\w.-]/g, '')}-${Date.now()}.apk`;
        const { error: upErr } = await supabase.storage
          .from('app-builds')
          .upload(path, file, { contentType: 'application/vnd.android.package-archive', upsert: false });
        if (upErr) throw upErr;
        apk_path = path;
        size_mb = Math.round((file.size / (1024 * 1024)) * 10) / 10;
      }
      const { error } = await supabase.from('app_releases').insert({
        version: version.trim(),
        version_code: Number(versionCode),
        min_android: minAndroid.trim() || null,
        release_notes: notes.trim() || null,
        apk_path,
        apk_external_url: externalUrl.trim() || null,
        size_mb,
        is_published: true,
        created_by: user?.id ?? null,
      } as any);
      if (error) throw error;
      toast.success('New release published');
      setFile(null);
      setVersion('');
      setVersionCode('');
      setNotes('');
      setExternalUrl('');
      onPublished?.();
    } catch (e: any) {
      toast.error(e.message ?? 'Failed to publish release');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card className="mb-6 border-primary/30">
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <Shield className="h-4 w-4 text-primary" /> Admin: publish a new app build
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid sm:grid-cols-3 gap-3">
          <div>
            <Label className="text-xs">Version name</Label>
            <Input placeholder="v1.5.0" value={version} onChange={(e) => setVersion(e.target.value)} />
          </div>
          <div>
            <Label className="text-xs">Version code</Label>
            <Input
              type="number"
              placeholder="150"
              value={versionCode}
              onChange={(e) => setVersionCode(e.target.value)}
            />
          </div>
          <div>
            <Label className="text-xs">Min Android</Label>
            <Input placeholder="7.0" value={minAndroid} onChange={(e) => setMinAndroid(e.target.value)} />
          </div>
        </div>
        <div>
          <Label className="text-xs">Release notes</Label>
          <Textarea
            rows={2}
            placeholder="What's new in this build"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </div>
        <div className="grid sm:grid-cols-2 gap-3">
          <div>
            <Label className="text-xs">APK file (hosted here, no GitHub needed)</Label>
            <Input
              type="file"
              accept=".apk,application/vnd.android.package-archive"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
          </div>
          <div>
            <Label className="text-xs">Or direct download link</Label>
            <Input
              placeholder="https://..."
              value={externalUrl}
              onChange={(e) => setExternalUrl(e.target.value)}
            />
          </div>
        </div>
        <Button onClick={publish} disabled={busy} className="w-full gap-2">
          <UploadCloud className="h-4 w-4" /> {busy ? 'Publishing...' : 'Publish release'}
        </Button>
      </CardContent>
    </Card>
  );
};

export default AdminReleaseUploader;
