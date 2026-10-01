# Account security and laptop checks

Settings → Account security now supports:

- Change password using the current password plus matching new passwords.
- Rotate the current sign-in token and revoke all previous sessions after a password change.
- Sign out other sessions with current-password confirmation, keeping this session active.
- Display the number of unexpired sign-in sessions without exposing token digests.

These actions are account-wide and independent of subscription status. Owners,
admins, managers and staff can secure their own account. Workspace editing is
shown only to owners/admins, matching the existing API permission.

No migration or new environment variable is required. Restart Rails and Next.js
after pulling. Password-reset email, email verification and invitation email
are still pending; this feature requires knowing the current password.

## Manual laptop checks

1. Sign into the same account in a normal browser window and a private window.
2. Open Settings → Account security. Both sessions should be counted.
3. Enter a wrong current password and try signing out other sessions: it should
   fail and both sessions should remain valid.
4. Enter the correct current password and sign out other sessions. The normal
   window should remain signed in; a fresh request in the private window should
   be unauthorized. An already rendered page may remain visible until it requests
   data again.
5. Sign in again in the private window. Change the password in the normal window.
   Try mismatched confirmation and a short password first: neither should change
   credentials or revoke sessions.
6. Submit a valid password. The current window should keep working, and the
   private window's previous session should be rejected. Old-password login should
   fail and new-password login should succeed.
7. Verify another user's session is unaffected.
8. Sign in as manager/staff and open Settings: business name is read-only but
   Account security and appearance settings remain usable.

Focused backend command:

```sh
cd backend
bundle exec rspec spec/requests/account_security_spec.rb spec/requests/auth_spec.rb
```

The API serializes password changes and login issuance with a user row lock.
Credentials are rechecked inside that lock to avoid issuing an old-password
session concurrently with a password change. Failed changes roll back; raw tokens
are returned only for session rotation and consumed by the existing Next.js
HTTP-only-cookie proxy.
