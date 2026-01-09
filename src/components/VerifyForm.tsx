import { useState } from 'react';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2, Copy, CheckCircle, UserCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { VerifiedMember } from '@/types/listing';

const formSchema = z.object({
  email: z.string().email('Enter a valid email address'),
});

type FormValues = z.infer<typeof formSchema>;

const VerifyForm = () => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [member, setMember] = useState<VerifiedMember | null>(null);
  const [copied, setCopied] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: '',
    },
  });

  const generateMemberCode = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = 'FF-MAX-';
    for (let i = 0; i < 4; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  };

  const onSubmit = async (values: FormValues) => {
    setIsSubmitting(true);
    try {
      // Check if email already exists
      const { data: existingMember } = await supabase
        .from('verified_members')
        .select('*')
        .eq('email', values.email.toLowerCase())
        .maybeSingle();

      if (existingMember) {
        setMember(existingMember as VerifiedMember);
        toast.info('Welcome back! Here\'s your member code.');
        return;
      }

      // Create new member
      const memberCode = generateMemberCode();
      const { data, error } = await supabase
        .from('verified_members')
        .insert({
          email: values.email.toLowerCase(),
          member_code: memberCode,
        })
        .select()
        .single();

      if (error) throw error;

      setMember(data as VerifiedMember);
      toast.success('🎉 You are now a verified member!');
    } catch (error: any) {
      toast.error(error.message || 'Failed to verify');
    } finally {
      setIsSubmitting(false);
    }
  };

  const copyCode = () => {
    if (member) {
      navigator.clipboard.writeText(member.member_code);
      setCopied(true);
      toast.success('Code copied to clipboard!');
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (member) {
    return (
      <div className="card-gaming p-8 text-center space-y-6 animate-slide-up">
        <div className="w-20 h-20 mx-auto rounded-full bg-gaming-success/20 flex items-center justify-center">
          <UserCheck className="h-10 w-10 text-gaming-success" />
        </div>
        
        <div>
          <h3 className="font-display text-xl font-bold mb-2">
            Verified Member!
          </h3>
          <p className="text-muted-foreground text-sm">
            {member.email}
          </p>
        </div>

        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">Your Unique Member Code</p>
          <div className="flex items-center justify-center gap-2">
            <span className="font-display text-2xl font-bold text-gradient">
              {member.member_code}
            </span>
            <Button
              variant="ghost"
              size="icon"
              onClick={copyCode}
              className="hover:text-primary"
            >
              {copied ? (
                <CheckCircle className="h-5 w-5 text-gaming-success" />
              ) : (
                <Copy className="h-5 w-5" />
              )}
            </Button>
          </div>
        </div>

        <p className="text-xs text-muted-foreground">
          Use this code when selling or buying to verify your identity
        </p>

        <Button
          variant="outline"
          onClick={() => setMember(null)}
        >
          Verify Another Email
        </Button>
      </div>
    );
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Your Personal Email</FormLabel>
              <FormControl>
                <Input
                  type="email"
                  placeholder="Enter your email address"
                  className="input-gaming"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button
          type="submit"
          variant="gaming"
          size="lg"
          className="w-full"
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin" />
              Verifying...
            </>
          ) : (
            'Get My Member Code'
          )}
        </Button>
      </form>
    </Form>
  );
};

export default VerifyForm;
