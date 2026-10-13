module Team
  class Invite
    def self.call(business:, user:, attributes:)
      raw_token = SecureRandom.urlsafe_base64(32)
      invitation = nil
      business.with_lock do
        actor = business.business_memberships.find_by!(user: user)
        raise Pundit::NotAuthorizedError unless BusinessPolicy.new(actor, business).manage?
        raise ArgumentError, "Your subscription does not allow new invitations" unless business.writable?
        a = attributes.to_h.symbolize_keys.slice(:email, :role)
        raise Pundit::NotAuthorizedError if a[:role] == "admin" && actor.role != "owner"
        a[:email] = a[:email].to_s.strip.downcase
        raise ArgumentError, "This email is already on your team" if business.business_memberships.joins(:user).exists?(users: {email: a[:email]})
        raise ArgumentError, "An invitation is already pending for this email" if business.team_invitations.pending.exists?(email: a[:email])
        seats = business.business_memberships.count + business.team_invitations.pending.count
        raise ArgumentError, "Your plan's user limit has been reached" if seats >= business.subscription_plan.member_limit
        invitation = business.team_invitations.create!(a.merge(token_digest: Digest::SHA256.hexdigest(raw_token), expires_at: 7.days.from_now, email_status: EmailDelivery.configured? ? "queued" : "not_configured"))
        business.activities.create!(user: user, action: "employee_invited", subject_name: invitation.email)
        if EmailDelivery.configured?
          InvitationEmailJob.perform_later(invitation.id, EmailDelivery.encrypt(raw_token))
        end
      end
      {id: invitation.id, token: raw_token, email: invitation.email, role: invitation.role, expires_at: invitation.expires_at, email_status: invitation.email_status}
    end
  end
end
