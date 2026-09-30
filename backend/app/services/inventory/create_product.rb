module Inventory
  class CreateProduct
    def self.call(business:, user:, attributes:, initial_quantity: 0)
      business.with_lock("FOR NO KEY UPDATE") do
        member = business.business_memberships.find_by(user: user)
        raise AdjustStock::InvalidMovement, "Not permitted" unless member && BusinessPolicy.new(member, business).stock?
        raise AdjustStock::InvalidMovement, "Your subscription is read-only. Ask the owner to review the plan." unless business.writable?
        limit = business.subscription_plan.product_limit
        raise AdjustStock::InvalidMovement, "Your plan allows #{limit} saved products. Review your plan to add more." if limit && business.products.count >= limit
        product = business.products.create!(attributes)
        business.activities.create!(user: user, action: "product_created", subject_name: product.name, details: {product_id: product.id})
        quantity = BigDecimal(initial_quantity.to_s, exception: false)
        raise AdjustStock::InvalidMovement, "Initial quantity must be zero or greater" unless quantity&.finite? && quantity >= 0
        AdjustStock.call(product: product, user: user, quantity: quantity, movement_type: "initial_stock", idempotency_key: "initial:#{product.id}") unless quantity.zero?
        product
      end
    end
  end
end
