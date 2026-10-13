module Notifications
  class Visibility
    def self.scope(business, membership)
      scope = business.notifications
      BusinessPolicy.new(membership, business).report? ? scope : scope.where.not(kind: %w[sale_completed bill_returned employee_joined employee_removed employee_role_changed])
    end
    def self.allowed?(notification, membership)
      scope(notification.business, membership).exists?(id: notification.id)
    end
  end
end
