module Inventory
  class SetupVariants
    def self.call(business:, user:, attributes:, group_id: nil)
      a = attributes.deep_stringify_keys
      digest = Digest::SHA256.hexdigest(JSON.generate([group_id.to_s, a.except("idempotency_key")]))
      business.with_lock("FOR NO KEY UPDATE") do
        membership = business.business_memberships.find_by!(user: user)
        raise Pundit::NotAuthorizedError unless BusinessPolicy.new(membership, business).write?
        previous = business.product_setup_batches.find_by(idempotency_key: a["idempotency_key"])
        if previous
          raise ArgumentError, "This request key belongs to a different setup" unless previous.request_digest == digest && previous.user_id == user.id
          return previous.product_group
        end
        raise ArgumentError, "Your subscription does not allow product changes" unless business.writable?
        rows = a.fetch("variants", [])
        ids = a.fetch("product_ids", []).map { |id| Integer(id.to_s) }
        raise ArgumentError, "Choose new variants or existing products, not both" if rows.any? && ids.any?
        count = rows.size + ids.size
        raise ArgumentError, "Choose between 1 and 100 variants" unless count.between?(1, 100) && ids.uniq.size == ids.size
        group = group_id ? business.product_groups.find(group_id) : business.product_groups.create!(name: a["name"])
        raise ArgumentError, "A group can contain up to 100 variants" if group.products.count + count > 100
        if ids.any?
          products = business.products.active.where(id: ids).order(:id).lock.to_a
          raise ActiveRecord::RecordNotFound unless products.size == ids.size
          products.each do |product|
            raise ArgumentError, "#{product.display_name} already belongs to a group" if product.product_group_id
            begin
              product.update!(product_group: group)
            rescue ActiveRecord::RecordInvalid => e
              raise ArgumentError, "#{product.display_name}: #{e.record.errors.full_messages.join(', ')}"
            end
          end
        else
          rows.each_with_index do |row, index|
            fields = row.slice("size", "color", "selling_price", "purchase_price", "low_stock_threshold", "sku", "barcode", "unit", "category_id")
            fields["barcode"] = "SQ#{SecureRandom.hex(6).upcase}" if fields["barcode"].blank?
            begin
              CreateProduct.call(business: business, user: user, attributes: fields.merge("name" => group.name, "product_group" => group), initial_quantity: row.fetch("initial_quantity", 0))
            rescue ActiveRecord::RecordInvalid => e
              raise ArgumentError, "Variant #{index + 1}: #{e.record.errors.full_messages.join(', ')}"
            end
          end
        end
        business.product_setup_batches.create!(user: user, product_group: group, idempotency_key: a["idempotency_key"], request_digest: digest)
        business.activities.create!(user: user, action: "variants_grouped", subject_name: group.name, details: {product_group_id: group.id, variants: count, existing_products: ids.any?})
        group
      end
    end
  end
end
