module Assistant
  class ConfirmAction
    def self.call(action:, user:)
      action.with_lock do
        business = action.business
        membership = business.business_memberships.find_by!(user: user)
        raise Pundit::NotAuthorizedError unless action.user_id == user.id
        policy = BusinessPolicy.new(membership, business)
        raise Pundit::NotAuthorizedError unless action.kind == "invite_employee" ? policy.manage? : policy.stock?
        return action.result if action.status == "completed"
        raise ArgumentError, "This task has expired or was cancelled" unless action.status == "proposed" && action.expires_at > Time.current
        raise ArgumentError, "Your subscription is read-only" unless business.writable?
        a = action.payload
        result = case action.kind
        when "stock_change"
          product = business.products.active.find(a.fetch("product_id"))
          amount = Sales::Checkout.decimal(a.fetch("quantity"), places: 3, positive: true)
          amount = -amount unless a["movement_type"] == "stock_in"
          movement = Inventory::AdjustStock.call(product: product, user: user, quantity: amount, movement_type: a.fetch("movement_type"), idempotency_key: "ai-action:#{action.id}", note: "Confirmed Stoqo assistant task")
          {message: "Stock updated", movement_id: movement.id, product_id: product.id, current_stock: product.reload.current_stock.to_s("F")}
        when "invite_employee"
          Team::Invite.call(business: business, user: user, attributes: a.slice("email", "role")).except(:token).merge(message: "Invitation created")
        when "create_sale"
          sale = Sales::Checkout.call(business: business, user: user, attributes: {items: a.fetch("items").map { |i| i.slice("product_id", "quantity", "unit_price") }, payment_method: a.fetch("payment_method"), discount: "0", idempotency_key: "ai-sale:#{action.id}"})
          {message: "Bill completed", sale_id: sale.id, number: sale.number, total: sale.total.to_s("F")}
        else
          raise ArgumentError, "Unsupported task"
        end
        business.activities.create!(user: user, action: "ai_task_confirmed", subject_name: action.kind, details: {assistant_action_id: action.id})
        action.update!(status: "completed", result: result, completed_at: Time.current)
        result
      end
    end
  end
end
