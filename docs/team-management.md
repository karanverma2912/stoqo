# Team management

Settings → Your team supports changing existing employee roles without removing
memberships. Role changes take effect on the next API request, including requests
from sessions already signed in. Old rendered screens can remain visible until
the employee refreshes; backend permissions are authoritative.

- Owners manage admins, managers and staff.
- Admins manage managers and staff. They cannot invite, modify or remove admins,
  or revoke an admin invitation.
- No one can remove themselves or change the owner role using these controls.
- Managers/staff cannot manage the team.
- Role changes and revoked invitations are included in activity history.
- Removing access preserves past bills and stock movements; it does not delete
  the employee's account or their memberships in other businesses.
- Seat usage includes the owner and unexpired pending invitations. Changing a
  role consumes no new seat. Security-related role reductions/removals remain
  available after subscription expiry; new invitations still require write access.

## Laptop checks

1. As owner, invite an employee; accept in a separate browser profile using the
   exact invited email. No invitation email is sent automatically yet.
2. Change staff to manager. On the employee's next request, reports/all bills
   become accessible. Change back to staff; reports should be denied and bills
   should again be limited to their own.
3. As admin, verify only staff/manager role options appear. Admin and owner rows
   must have no edit/remove actions; the current user's row has none either.
4. Cancel a role change or removal and verify nothing changes. Confirm a removal
   and verify the employee loses access while historic bills remain.
5. Revoke a pending invitation; verify its link stops working and the seat count
   in both Team and Plans & usage updates.

No database migration is required. Focused backend verification:

```sh
bundle exec rspec spec/requests/team_spec.rb spec/requests/account_security_spec.rb spec/requests/auth_spec.rb
```
