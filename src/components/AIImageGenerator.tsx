import { useState } from 'react';
import { Wand2, Loader2, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Props {
  title?: string;
  hint?: string;
  buildPrompt: () => string;
  fileName?: string;
  source?: string;
  onGenerated: (file: File, dataUrl: string) => void;
}


const dataUrlToFile = (dataUrl: string, name: string) => {
  const [meta, b64] = dataUrl.split(',');
  const mime = meta.match(/data:(.*?);/)?.[1] || 'image/png';
  const bin = atob(b64);
  const arr = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
  return new File([arr], name, { type: mime });
};

export const AIImageGenerator = ({
  title = 'AI Image Generator',
  hint = 'Generate a cover image with AI instead of uploading one.',
  buildPrompt,
  fileName = 'ai-image.png',
  source = 'unknown',
  onGenerated,
}: Props) => {

  const [loading, setLoading] = useState(false);
  const [extra, setExtra] = useState('');
  const [preview, setPreview] = useState<string | null>(null);

  const generate = async () => {
    const base = buildPrompt().trim();
    const prompt = extra.trim() ? `${base}\nExtra details: ${extra.trim()}` : base;
    if (prompt.length < 5) return toast.error('Fill the details first');

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-image', {
        body: { prompt },
      });
      if (error) throw error;
      if (data?.error === 'rate_limited') return toast.error('AI is busy. Try again shortly.');
      if (data?.error === 'credits_exhausted') return toast.error('AI credits exhausted. Contact admin.');
      if (data?.error || !data?.image) throw new Error(data?.error || 'No image returned');

      const dataUrl: string = data.image;
      setPreview(dataUrl);
      onGenerated(dataUrlToFile(dataUrl, `${Date.now()}-${fileName}`), dataUrl);
      toast.success('AI image generated!');
    } catch (e: any) {
      toast.error(e.message || 'Failed to generate image');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card-gaming p-4 border-accent/30 space-y-3">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="flex-1 min-w-0">
          <h3 className="font-display font-bold text-base flex items-center gap-2">
            <Wand2 className="h-4 w-4 text-accent" />
            {title}
          </h3>
          <p className="text-xs text-muted-foreground mt-1">{hint}</p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={generate}
          disabled={loading}
          className="border-accent/50 text-accent hover:bg-accent/10 hover:text-accent"
        >
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : preview ? (
            <RefreshCw className="h-4 w-4" />
          ) : (
            <Wand2 className="h-4 w-4" />
          )}
          {loading ? 'Generating...' : preview ? 'Regenerate' : 'Generate Image'}
        </Button>
      </div>

      <Textarea
        rows={2}
        value={extra}
        onChange={(e) => setExtra(e.target.value)}
        placeholder="Optional style notes (e.g. neon orange, fire theme, esports poster)"
        className="input-gaming text-sm"
      />

      {preview && (
        <div className="rounded-lg overflow-hidden border border-accent/40">
          <img src={preview} alt="AI generated preview" className="w-full object-cover" loading="lazy" />
        </div>
      )}
    </div>
  );
};
