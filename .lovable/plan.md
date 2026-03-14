

## Forgot Password / Reset Password Flow

### Overview
Add a "Forgot password?" link in the login tab of AuthModal, plus a new `/reset-password` page where users set a new password after clicking the email link.

### Changes

**1. `src/components/AuthModal.tsx`**
- Add a "Forgot password?" view within the login tab
- When clicked, show an email input form that calls `supabase.auth.resetPasswordForEmail(email, { redirectTo: window.location.origin + '/reset-password' })`
- Add a "Back to login" link to return to normal login form

**2. `src/pages/ResetPassword.tsx`** (new)
- Public page at `/reset-password`
- On mount, detect `type=recovery` in URL hash (Supabase redirects with this)
- Show a form with new password + confirm password fields
- Call `supabase.auth.updateUser({ password })` to set the new password
- On success, redirect to home page with a success toast

**3. `src/App.tsx`**
- Add `<Route path="/reset-password" element={<ResetPassword />} />`

### No database or backend changes needed — uses built-in auth password reset functionality.

