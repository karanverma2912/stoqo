module Sales
  class ReturnItems
    def self.call(sale:, user:, attributes:)
      a = attributes.deep_stringify_keys
      digest = Digest::SHA256.hexdigest(JSON.generate(a.except("idempotency_key")))
      sale.business.with_lock("FOR NO KEY UPDATE") do
        member = sale.business.business_memberships.find_by!(user: user)
        raise Pundit::NotAuthorizedError unless BusinessPolicy.new(member, sale.business).write?
        existing = sale.business.sale_returns.find_by(idempotency_key: a["idempotency_key"])
        if existing
          raise ArgumentError, "This return key belongs to another request" unless existing.sale_id == sale.id && existing.request_digest == digest && existing.user_id == user.id
          return existing
        end
        raise ArgumentError, "Your subscription does not allow stock changes" unless sale.business.writable?
        rows = a["items"]
        raise ArgumentError, "Select between 1 and 100 items to return" unless rows.is_a?(Array) && rows.size.between?(1, 100)
        ids = rows.map { |r| Integer(r["sale_item_id"].to_s) }
        raise ArgumentError, "Duplicate return item" unless ids.uniq.size == ids.size
        items = sale.sale_items.where(id: ids).index_by(&:id)
        raise ActiveRecord::RecordNotFound unless items.size == ids.size
        products = sale.business.products.where(id: items.values.map(&:product_id)).order(:id).lock.index_by(&:id)
        record = sale.sale_returns.create!(business: sale.business, user: user, reason: a["reason"], idempotency_key: a["idempotency_key"], request_digest: digest, amount: 0)
        total = 0.to_d
        rows.each do |row|
          item = items.fetch(Integer(row["sale_item_id"]))
          q = Checkout.decimal(row["quantity"], places: 3, positive: true)
          raise ArgumentError, "Return exceeds the unreturned quantity for #{item.name}" if q + item.returned_quantity > item.quantity
          amount = (item.line_total * (item.returned_quantity + q) / item.quantity).round(2) - (item.line_total * item.returned_quantity / item.quantity).round(2)
          record.sale_return_items.create!(sale: sale, sale_item: item, quantity: q, amount: amount)
          Inventory::AdjustStock.call(product: products.fetch(item.product_id), user: user, quantity: q, movement_type: "return_in", idempotency_key: "return:#{record.id}:#{item.id}", note: "Return for #{sale.number}: #{a['reason']}")
          item.update!(returned_quantity: item.returned_quantity + q)
          total += amount
        end
        record.update!(amount: total)
        sale.update!(status: sale.sale_items.where("returned_quantity < quantity").exists? ? "partially_returned" : "returned")
        sale.business.activities.create!(user: user, action: "bill_returned", subject_name: sale.number, details: {sale_id: sale.id, return_id: record.id, amount: total.to_s})
        record
      end
    end
  end
end
