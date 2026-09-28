module Inventory
  class CreateProduct
    def self.call(business:, user:, attributes:, initial_quantity: 0)
      Product.transaction do
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
