import { MessageCircle, Mail, Instagram, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';

// 👉 Update these with your real contact details
const SUPPORT_WHATSAPP = '918101230080'; // include country code, no +
const SUPPORT_EMAIL = 'ffmaxidmarket@gmail.com';
const SUPPORT_INSTAGRAM = 'ff_id_.market'; // handle without @

const SupportSection = () => {
  const whatsappUrl = `https://wa.me/${SUPPORT_WHATSAPP}?text=${encodeURIComponent(
    'Hi! I need support with FF ID Hub.'
  )}`;
  const emailUrl = `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(
    'Support Request - FF ID Hub'
  )}`;
  const instagramUrl = `https://instagram.com/${SUPPORT_INSTAGRAM}`;

  return (
    <section className="container py-12">
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
    </section>
  );
};

export default SupportSection;
