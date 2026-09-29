module Sales
  class Checkout
    def self.decimal(value, places:, positive: false)
      n = BigDecimal(value.to_s, exception: false)
      raise ArgumentError, "Enter valid amounts with up to #{places} decimals" unless n&.finite? && n >= 0 && n < 100_000_000 && n == n.round(places) && (!positive || n > 0)
      n
    end
    def self.call(business:, user:, attributes:)
      a = attributes.deep_stringify_keys
      raise ArgumentError, "Add between 1 and 100 products" unless a["items"].is_a?(Array) && a["items"].size.between?(1, 100)
      digest = Digest::SHA256.hexdigest(JSON.generate(a.except("idempotency_key")))
      business.with_lock("FOR NO KEY UPDATE") do
        member = business.business_memberships.find_by!(user: user)
        policy = BusinessPolicy.new(member, business)
        raise Pundit::NotAuthorizedError unless policy.stock?
        existing = business.sales.find_by(idempotency_key: a["idempotency_key"])
        if existing
          raise ArgumentError, "This checkout key belongs to another sale" unless existing.request_digest == digest && existing.user_id == user.id
          return existing
        end
        raise ArgumentError, "Your subscription does not allow stock changes" unless business.writable?
        ids = a["items"].map { |row| Integer(row["product_id"].to_s) }
        raise ArgumentError, "Combine duplicate products into one cart line" unless ids.uniq.size == ids.size
        products = business.products.active.where(id: ids).order(:id).lock.index_by(&:id)
        raise ActiveRecord::RecordNotFound unless products.size == ids.size
        lines = a["items"].map do |row|
          product = products.fetch(Integer(row["product_id"]))
          quantity = decimal(row["quantity"], places: 3, positive: true)
          price = row["unit_price"].present? ? decimal(row["unit_price"], places: 2) : product.selling_price
          raise Pundit::NotAuthorizedError if !policy.write? && price != product.selling_price
          raise ArgumentError, "#{product.display_name}: only #{product.current_stock.to_s('F')} #{product.unit} available" if quantity > product.current_stock
          {product: product, quantity: quantity, unit_price: price, gross_total: (quantity * price).round(2)}
        end
        subtotal = lines.sum { |l| l[:gross_total] }
        raise ArgumentError, "Bill amount is too large" if subtotal >= 100_000_000
        discount = decimal(a.fetch("discount", 0), places: 2)
        raise Pundit::NotAuthorizedError if !policy.write? && discount > 0
        raise ArgumentError, "Discount cannot exceed the bill amount" if discount > subtotal
        sale = business.sales.create!(user: user, number: "ST-#{SecureRandom.hex(6).upcase}", business_name: business.name,
          cashier_name: user.name, currency: business.currency, customer_name: a["customer_name"], customer_phone: a["customer_phone"],
          payment_method: a.fetch("payment_method", "cash"), idempotency_key: a["idempotency_key"], request_digest: digest,
          subtotal: subtotal, discount: discount, total: subtotal - discount)
        remaining = discount
        lines.each_with_index do |line, i|
          # Allocate cents deterministically, keeping each line nonnegative and totals exact.
          gross = line[:gross_total]
          share = i == lines.size - 1 ? remaining : (subtotal.zero? ? 0.to_d : (discount * gross / subtotal).floor(2))
          share = [share, gross, remaining].min
          remaining -= share
          product = line.delete(:product)
          item = sale.sale_items.create!(line.merge(business: business, product: product, name: product.display_name,
            unit: product.unit, sku: product.sku, barcode: product.barcode, line_total: gross - share))
          Inventory::AdjustStock.call(product: product, user: user, quantity: -item.quantity, movement_type: "sale",
            idempotency_key: "bill:#{SecureRandom.uuid}", note: "Bill #{sale.number}")
        end
        # Any rounding remainder is allocated backwards to lines with enough value.
        if remaining > 0
          sale.sale_items.order(id: :desc).each do |item|
            allocation = [remaining, item.line_total].min
            item.update!(line_total: item.line_total - allocation)
            remaining -= allocation
            break if remaining.zero?
          end
        end
        business.activities.create!(user: user, action: "bill_created", subject_name: sale.number, details: {sale_id: sale.id, total: sale.total.to_s, items: lines.size})
        business.notifications.create!(kind: "sale_completed", message: "#{user.name} completed bill #{sale.number} · #{sale.currency} #{sale.total.to_s('F')}")
        sale
      end
    end
  end
end
