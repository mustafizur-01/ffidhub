import { useState } from 'react';
import { MessageCircle, Mail, Instagram, Clock, Send, Loader2 } from 'lucide-react';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

// 👉 Update these with your real contact details
const SUPPORT_WHATSAPP = '918101230080'; // include country code, no +
const SUPPORT_EMAIL = 'ffmaxidmarket@gmail.com';
const SUPPORT_INSTAGRAM = 'ff_id_.market'; // handle without @

const reportSchema = z.object({
  contact_email: z.string().trim().email('Invalid email address').max(255),
  category: z.enum(['general', 'payment', 'listing', 'tournament', 'account', 'bug', 'other']),
  subject: z.string().trim().min(3, 'Subject too short').max(150),
  message: z.string().trim().min(10, 'Please describe your issue (min 10 chars)').max(2000),
});

const SupportSection = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    contact_email: '',
    category: 'general',
    subject: '',
    message: '',
  });

  const whatsappUrl = `https://wa.me/${SUPPORT_WHATSAPP}?text=${encodeURIComponent(
    'Hi! I need support with FF ID Hub.'
  )}`;
  const emailUrl = `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(
    'Support Request - FF ID Hub'
  )}`;
  const instagramUrl = `https://instagram.com/${SUPPORT_INSTAGRAM}`;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = reportSchema.safeParse({
      ...form,
      contact_email: form.contact_email || user?.email || '',
    });
    if (!parsed.success) {
      toast({
        title: 'Invalid input',
        description: parsed.error.errors[0]?.message,
        variant: 'destructive',
      });
      return;
    }

    setSubmitting(true);
    const { error } = await supabase.from('support_reports').insert([
      {
        ...parsed.data,
        user_id: user?.id ?? null,
      },
    ]);
    setSubmitting(false);

    if (error) {
      toast({ title: 'Submission failed', description: error.message, variant: 'destructive' });
      return;
    }

    toast({
      title: 'Report submitted',
      description: 'Our team will reach out to you shortly.',
    });
    setForm({ contact_email: '', category: 'general', subject: '', message: '' });
  };

  return (
    <section className="container py-12 space-y-8">
      <div className="card-gaming p-6 md:p-8 bg-gradient-to-br from-primary/10 via-card to-card border-primary/20">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/15 text-primary text-xs font-semibold">
              <Clock className="h-3.5 w-3.5" />
              24/7 SUPPORT
            </div>
            <h2 className="font-display text-2xl md:text-3xl font-bold">
              Need help? We're online <span className="text-gradient">round the clock</span>
            </h2>
            <p className="text-muted-foreground text-sm md:text-base">
              Choose your preferred channel and our team will get back to you instantly.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 md:min-w-[420px]">
            <Button
              asChild
              variant="outline"
              className="h-auto py-3 flex-col gap-1 border-green-500/40 hover:bg-green-500/10 hover:border-green-500"
            >
              <a href={whatsappUrl} target="_blank" rel="noopener noreferrer">
                <MessageCircle className="h-5 w-5 text-green-500" />
                <span className="text-xs font-semibold">WhatsApp</span>
              </a>
            </Button>

            <Button
              asChild
              variant="outline"
              className="h-auto py-3 flex-col gap-1 border-blue-500/40 hover:bg-blue-500/10 hover:border-blue-500"
            >
              <a href={emailUrl}>
                <Mail className="h-5 w-5 text-blue-500" />
                <span className="text-xs font-semibold">Email</span>
              </a>
            </Button>

            <Button
              asChild
              variant="outline"
              className="h-auto py-3 flex-col gap-1 border-pink-500/40 hover:bg-pink-500/10 hover:border-pink-500"
            >
              <a href={instagramUrl} target="_blank" rel="noopener noreferrer">
                <Instagram className="h-5 w-5 text-pink-500" />
                <span className="text-xs font-semibold">Instagram</span>
              </a>
            </Button>
          </div>
        </div>
      </div>

      {/* Contact / Report Form */}
      <div className="card-gaming p-6 md:p-8">
        <div className="space-y-2 mb-6">
          <h3 className="font-display text-xl md:text-2xl font-bold">
            Report an Issue
          </h3>
          <p className="text-sm text-muted-foreground">
            Submit your problem and our team will respond as soon as possible.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="contact_email">Your Email *</Label>
              <Input
                id="contact_email"
                type="email"
                placeholder={user?.email ?? 'you@example.com'}
                value={form.contact_email}
                onChange={(e) => setForm({ ...form, contact_email: e.target.value })}
                required={!user?.email}
                maxLength={255}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="category">Category *</Label>
              <Select
                value={form.category}
                onValueChange={(v) => setForm({ ...form, category: v })}
              >
                <SelectTrigger id="category">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="general">General Inquiry</SelectItem>
                  <SelectItem value="payment">Payment / Deposit</SelectItem>
                  <SelectItem value="listing">ID Listing</SelectItem>
                  <SelectItem value="tournament">Tournament</SelectItem>
                  <SelectItem value="account">Account</SelectItem>
                  <SelectItem value="bug">Bug Report</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="subject">Subject *</Label>
            <Input
              id="subject"
              placeholder="Brief title of your issue"
              value={form.subject}
              onChange={(e) => setForm({ ...form, subject: e.target.value })}
              required
              maxLength={150}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="message">Describe the Problem *</Label>
            <Textarea
              id="message"
              placeholder="Please share as much detail as possible..."
              value={form.message}
              onChange={(e) => setForm({ ...form, message: e.target.value })}
              required
              maxLength={2000}
              rows={5}
            />
            <p className="text-xs text-muted-foreground text-right">
              {form.message.length} / 2000
            </p>
          </div>

          <Button
            type="submit"
            variant="gaming"
            size="lg"
            disabled={submitting}
            className="w-full md:w-auto"
          >
            {submitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Submitting...
              </>
            ) : (
              <>
                <Send className="h-4 w-4" />
                Submit Report
              </>
            )}
          </Button>
        </form>
      </div>
    </section>
  );
};

export default SupportSection;
