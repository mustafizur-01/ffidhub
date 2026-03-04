

## Phone Number Sign-In with OTP Verification

### Overview
Add a phone number + OTP sign-in flow to the AuthModal, allowing users to enter their phone number, receive an SMS OTP, and verify it to sign in.

### Important Consideration
Supabase Auth supports phone sign-in with OTP natively via `supabase.auth.signInWithOtp({ phone })` and `supabase.auth.verifyOtp({ phone, token, type: 'sms' })`. However, this requires an SMS provider (like Twilio) to be configured on the backend. Since this project uses Lovable Cloud, SMS provider configuration may not be available through the standard tools.

### Database Changes
- **Profiles table**: The `email` column is currently required (`NOT NULL`). For phone-only users, we need to make `email` nullable or store the phone number. We'll update the `handle_new_user` trigger to handle users who sign up with a phone number (where `email` may be null, using `phone` instead).
- **Migration**: `ALTER TABLE public.profiles ALTER COLUMN email DROP NOT NULL;` and update the `handle_new_user` function to use `COALESCE(NEW.email, NEW.phone, 'unknown')`.

### Frontend Changes

**1. Update `src/components/AuthModal.tsx`**
- Add a new "Phone" tab or a phone sign-in section within the existing login/signup tabs
- Two-step flow:
  - **Step 1**: Phone number input with country code (defaulting to +91 for India based on ₹ currency usage). Submit calls `supabase.auth.signInWithOtp({ phone })`.
  - **Step 2**: OTP input (6 digits) using the existing `InputOTP` component. Submit calls `supabase.auth.verifyOtp({ phone, token, type: 'sms' })`.
- Add loading states, error handling, and a "Resend OTP" button.

**2. Update `src/hooks/useAuth.tsx`**
- Add `signInWithPhone(phone: string)` method that calls `supabase.auth.signInWithOtp({ phone })`.
- Add `verifyPhoneOtp(phone: string, token: string)` method that calls `supabase.auth.verifyOtp()`.

### UI Flow
1. User clicks "Continue with Phone" button in the auth modal
2. Phone number input appears with a country code selector
3. User enters number and clicks "Send OTP"
4. OTP input field appears (6 digits using InputOTP component)
5. User enters OTP and clicks "Verify"
6. On success, user is signed in and modal closes

### Files to Modify
- `src/components/AuthModal.tsx` - Add phone sign-in UI with OTP flow
- `src/hooks/useAuth.tsx` - Add phone auth methods
- Database migration for profiles table email nullable + trigger update

