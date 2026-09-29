module Inventory
  class AdjustStock
    class InvalidMovement < StandardError; end
    INCOMING = %w[initial_stock stock_in purchase return_in].freeze
    OUTGOING = %w[stock_out sale damage return_out].freeze
    def self.call(product:, user:, quantity:, movement_type:, idempotency_key:, note: nil, unit_cost: nil)
      amount = BigDecimal(quantity.to_s, exception: false)
      raise InvalidMovement, "Enter a non-zero quantity with up to 3 decimals" unless amount&.finite? && !amount.zero? && amount.abs < 100_000_000 && amount == amount.round(3)
      raise InvalidMovement, "Choose a valid reason" unless StockMovement::TYPES.include?(movement_type)
      raise InvalidMovement, "Quantity must be positive for incoming stock" if INCOMING.include?(movement_type) && amount.negative?
      raise InvalidMovement, "Quantity must be negative for outgoing stock" if OUTGOING.include?(movement_type) && amount.positive?
      raise InvalidMovement, "A request key is required" if idempotency_key.blank?
      membership = product.business.business_memberships.find_by(user: user)
      raise InvalidMovement, "Not permitted" unless membership && BusinessPolicy.new(membership, product.business).stock?
      product.with_lock do
        existing = product.business.stock_movements.find_by(idempotency_key: idempotency_key)
        if existing
          raise InvalidMovement, "Request key was already used for a different change" unless existing.product_id == product.id && existing.quantity == amount && existing.movement_type == movement_type
          return existing
        end
        raise InvalidMovement, "Not enough stock available" if product.current_stock + amount < 0
        before = product.stock_status
        movement = product.stock_movements.create!(business: product.business, user: user, quantity: amount,
          movement_type: movement_type, idempotency_key: idempotency_key, note: note, unit_cost: unit_cost, occurred_at: Time.current)
        product.update!(current_stock: product.current_stock + amount)
        product.business.activities.create!(user: user, action: movement_type, subject_name: product.name,
          details: {product_id: product.id, quantity: amount.to_s, movement_id: movement.id})
        if product.stock_status != before && product.stock_status != "healthy"
          product.business.notifications.create!(kind: product.stock_status == "out" ? "out_of_stock" : "low_stock", message: "#{product.name} #{product.stock_status == 'out' ? 'is out of stock' : 'is running low'}")
        end
        movement
      end
    end
  end
end
