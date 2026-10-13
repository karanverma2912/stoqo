module Inventory
  class CreateProduct
    def self.call(business:, user:, attributes:, initial_quantity: 0, idempotency_key: nil)
      raise AdjustStock::InvalidMovement, "Request key is too long" if idempotency_key.to_s.length > 100
      digest_attributes = attributes.to_h.transform_values do |value|
        if value.is_a?(ActionDispatch::Http::UploadedFile)
          digest = Digest::SHA256.file(value.tempfile.path).hexdigest
          {filename: value.original_filename, digest: digest, content_type: value.content_type}
        else
          value
        end
      end
      digest = Digest::SHA256.hexdigest(JSON.generate([digest_attributes.sort.to_h, initial_quantity.to_s]))
      business.with_lock("FOR NO KEY UPDATE") do
        member = business.business_memberships.find_by(user: user)
        raise AdjustStock::InvalidMovement, "Not permitted" unless member && BusinessPolicy.new(member, business).stock?
        if idempotency_key.present? && (existing = ProductCreationRequest.find_by(business: business, idempotency_key: idempotency_key))
          raise AdjustStock::InvalidMovement, "This product request key belongs to another request" unless existing.user_id == user.id && existing.request_digest == digest
          return existing.product
        end
        raise AdjustStock::InvalidMovement, "Your subscription is read-only. Ask the owner to review the plan." unless business.writable?
        limit = business.subscription_plan.product_limit
        raise AdjustStock::InvalidMovement, "Your plan allows #{limit} saved products. Review your plan to add more." if limit && business.products.count >= limit
        product = business.products.create!(attributes)
        business.activities.create!(user: user, action: "product_created", subject_name: product.name, details: {product_id: product.id})
        quantity = BigDecimal(initial_quantity.to_s, exception: false)
        raise AdjustStock::InvalidMovement, "Initial quantity must be zero or greater" unless quantity&.finite? && quantity >= 0
        AdjustStock.call(product: product, user: user, quantity: quantity, movement_type: "initial_stock", idempotency_key: "initial:#{product.id}") unless quantity.zero?
        ProductCreationRequest.create!(business: business, user: user, product: product, idempotency_key: idempotency_key, request_digest: digest) if idempotency_key.present?
        product
      end
    end
  end
end
