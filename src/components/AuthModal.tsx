import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { z } from 'zod';
import { Loader2, Flame, Mail, Phone, ArrowLeft } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/hooks/useAuth';
import { lovable } from '@/integrations/lovable/index';
import { toast } from 'sonner';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultTab?: 'login' | 'signup';
}

type Mode = 'choose' | 'email' | 'phone' | 'forgot';

const phoneSchema = z.string().regex(/^\+?[1-9]\d{7,14}$/, 'Enter a valid phone number with country code (e.g. +91...)');

const AuthModal = ({ isOpen, onClose }: AuthModalProps) => {
  const { signIn, signUp } = useAuth();
  const [mode, setMode] = useState<Mode>('choose');
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Email state
  const [emailTab, setEmailTab] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [referralCode, setReferralCode] = useState('');

  // Phone state
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);

  // Forgot password
  const [forgotEmail, setForgotEmail] = useState('');

  const reset = () => {
    setMode('choose');
    setEmail('');
    setPassword('');
    setReferralCode('');
    setPhone('');
    setOtp('');
    setOtpSent(false);
    setForgotEmail('');
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleGoogle = async () => {
    setIsGoogleLoading(true);
    const result = await lovable.auth.signInWithOAuth('google', {
      redirect_uri: window.location.origin,
    });
    if (result?.error) toast.error('Google sign-in failed. Please try again.');
    setIsGoogleLoading(false);
  };

  const handleEmailSubmit = async () => {
    if (!z.string().email().safeParse(email).success) {
      toast.error('Enter a valid email');
      return;
    }
    if (password.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }
    setIsLoading(true);
    const { error } = emailTab === 'login'
      ? await signIn(email, password)
      : await signUp(email, password, referralCode || undefined);
    setIsLoading(false);
    if (error) {
      toast.error(error.message);
    } else {
      toast.success(emailTab === 'login' ? 'Welcome back! 🔥' : 'Account created! 🎮');
      handleClose();
    }
  };

  const handleSendOtp = async () => {
    const parsed = phoneSchema.safeParse(phone);
    if (!parsed.success) {
      toast.error(parsed.error.errors[0].message);
      return;
    }
    setIsLoading(true);
    const { error } = await supabase.auth.signInWithOtp({ phone });
    setIsLoading(false);
    if (error) {
      toast.error(error.message);
    } else {
      setOtpSent(true);
      toast.success('OTP sent to your phone 📱');
    }
  };

  const handleVerifyOtp = async () => {
    if (otp.length < 4) {
      toast.error('Enter the OTP code');
      return;
    }
    setIsLoading(true);
    const { error } = await supabase.auth.verifyOtp({ phone, token: otp, type: 'sms' });
    setIsLoading(false);
    if (error) {
      toast.error(error.message);
    } else {
      toast.success('Logged in! 🔥');
      handleClose();
    }
  };

  const handleForgot = async () => {
    if (!z.string().email().safeParse(forgotEmail).success) {
      toast.error('Enter a valid email');
      return;
    }
    setIsLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(forgotEmail, {
      redirectTo: window.location.origin + '/reset-password',
    });
    setIsLoading(false);
    if (error) toast.error(error.message);
    else {
      toast.success('Reset link sent! 📧');
      setMode('choose');
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md bg-card border-border">
        <DialogHeader className="text-center">
          <div className="mx-auto flex items-center justify-center gap-2 mb-1">
            <img
              src="/images/app-icon-512.png"
              alt="FF ID Hub logo"
              width={32}
              height={32}
              className="h-8 w-8 rounded-lg object-cover"
            />
            <span className="font-display text-xl font-bold text-gradient">FF ID HUB</span>
          </div>
          <DialogTitle className="text-center">
            {mode === 'choose' && 'Sign in to continue'}
            {mode === 'email' && (emailTab === 'login' ? 'Login with Email' : 'Create Account')}
            {mode === 'phone' && 'Login with Phone'}
            {mode === 'forgot' && 'Reset Password'}
          </DialogTitle>
          <DialogDescription className="text-center text-xs">
            Quick & easy — pick your favorite way to sign in
          </DialogDescription>
        </DialogHeader>

        {mode === 'choose' && (
          <div className="space-y-3">
            <Button
              type="button"
              variant="gaming"
              size="lg"
              className="w-full h-12 text-base"
              onClick={handleGoogle}
              disabled={isGoogleLoading}
            >
              {isGoogleLoading ? (
                <Loader2 className="h-5 w-5 animate-spin mr-2" />
              ) : (
                <svg className="h-5 w-5 mr-2" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
              )}
              Continue with Google
            </Button>

            <Button
              type="button"
              variant="outline"
              size="lg"
              className="w-full h-12 text-base"
              onClick={() => setMode('phone')}
            >
              <Phone className="h-5 w-5 mr-2" />
              Continue with Phone
            </Button>

            <Button
              type="button"
              variant="outline"
              size="lg"
              className="w-full h-12 text-base"
              onClick={() => setMode('email')}
            >
              <Mail className="h-5 w-5 mr-2" />
              Continue with Email
            </Button>

            <p className="text-[11px] text-center text-muted-foreground pt-2">
              By continuing, you agree to our Terms & Privacy Policy.
            </p>
          </div>
        )}

        {mode === 'email' && (
          <div className="space-y-4">
            <Tabs value={emailTab} onValueChange={(v) => setEmailTab(v as 'login' | 'signup')}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="login">Login</TabsTrigger>
                <TabsTrigger value="signup">Sign Up</TabsTrigger>
              </TabsList>
              <TabsContent value={emailTab} className="mt-4 space-y-3">
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input
                    type="email"
                    placeholder="your@email.com"
                    className="input-gaming"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>Password</Label>
                    {emailTab === 'login' && (
                      <button
                        type="button"
                        className="text-xs text-primary hover:underline"
                        onClick={() => setMode('forgot')}
                      >
                        Forgot?
                      </button>
                    )}
                  </div>
                  <Input
                    type="password"
                    placeholder="••••••••"
                    className="input-gaming"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>
                {emailTab === 'signup' && (
                  <div className="space-y-2">
                    <Label>Referral Code (Optional)</Label>
                    <Input
                      placeholder="FF-XXXXXX"
                      className="input-gaming"
                      value={referralCode}
                      onChange={(e) => setReferralCode(e.target.value)}
                    />
                    <p className="text-xs text-muted-foreground">Use a friend's code and both of you get ₹10!</p>
                  </div>
                )}
                <Button variant="gaming" className="w-full" onClick={handleEmailSubmit} disabled={isLoading}>
                  {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  {emailTab === 'login' ? 'Login' : 'Create Account'}
                </Button>
              </TabsContent>
            </Tabs>
            <Button variant="ghost" size="sm" className="w-full" onClick={() => setMode('choose')}>
              <ArrowLeft className="h-4 w-4 mr-1" /> Back
            </Button>
          </div>
        )}

        {mode === 'phone' && (
          <div className="space-y-4">
            {!otpSent ? (
              <>
                <div className="space-y-2">
                  <Label>Phone Number</Label>
                  <Input
                    type="tel"
                    placeholder="+91XXXXXXXXXX"
                    className="input-gaming"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">Include country code (e.g. +91 for India)</p>
                </div>
                <Button variant="gaming" className="w-full" onClick={handleSendOtp} disabled={isLoading}>
                  {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  Send OTP
                </Button>
              </>
            ) : (
              <>
                <div className="space-y-2">
                  <Label>Enter OTP</Label>
                  <Input
                    type="text"
                    inputMode="numeric"
                    placeholder="6-digit code"
                    className="input-gaming text-center text-lg tracking-widest"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                    maxLength={6}
                  />
                  <p className="text-xs text-muted-foreground">Code sent to {phone}</p>
                </div>
                <Button variant="gaming" className="w-full" onClick={handleVerifyOtp} disabled={isLoading}>
                  {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  Verify & Login
                </Button>
                <button
                  type="button"
                  className="text-xs text-primary hover:underline w-full text-center"
                  onClick={() => { setOtpSent(false); setOtp(''); }}
                >
                  Change phone number
                </button>
              </>
            )}
            <Button variant="ghost" size="sm" className="w-full" onClick={() => setMode('choose')}>
              <ArrowLeft className="h-4 w-4 mr-1" /> Back
            </Button>
          </div>
        )}

        {mode === 'forgot' && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">Enter your email and we'll send you a reset link.</p>
            <Input
              type="email"
              placeholder="your@email.com"
              className="input-gaming"
              value={forgotEmail}
              onChange={(e) => setForgotEmail(e.target.value)}
            />
            <Button variant="gaming" className="w-full" onClick={handleForgot} disabled={isLoading}>
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Send Reset Link
            </Button>
            <Button variant="ghost" size="sm" className="w-full" onClick={() => setMode('email')}>
              <ArrowLeft className="h-4 w-4 mr-1" /> Back
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default AuthModal;
