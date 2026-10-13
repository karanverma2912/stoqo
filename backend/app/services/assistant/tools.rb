module Assistant
  class Tools
    HELP = "Stoqo manages inventory for small stores. Scan a saved barcode to find a product; an unknown barcode starts Add product. Each size/color variant has its own stock and barcode. Scanning alone does not change stock. Add items to Sell, check quantity and payment method, then confirm checkout. Bills and returns are in history; returns can be sellable or damaged. Owners/admins invite teammates; the invitee signs in with the invited email and joins immediately. Managers can edit products and view reports; staff handle stock and their own bills. Low-stock and activity alerts sync across signed-in devices. Settings controls language, security and notifications. The first mobile release needs internet for committed stock changes. Never claim a draft or scan has completed a sale."
    def initialize(business:, user:)
      @business, @user = business, user
      @membership = business.business_memberships.find_by!(user: user)
      @policy = BusinessPolicy.new(@membership, business)
    end
    def declarations
      rows = [
        declaration("stoqo_help", "Explain Stoqo features and how to use the app", {}),
        declaration("inventory_search", "Look up current products and stock in this store", {query: {type: "STRING"}, filter: {type: "STRING", enum: %w[all low out]}}),
        declaration("stock_summary", "Read current stock totals and low-stock counts", {}),
        declaration("recent_notifications", "Read alerts this user is permitted to see", {})
      ]
      rows << declaration("daily_summary", "Read the owner's daily sales, payment totals and employee summary", {date: {type: "STRING", description: "YYYY-MM-DD, omit for today"}}) if @policy.manage?
      rows << declaration("team_list", "List this store's employee names and roles", {}) if @policy.manage?
      if @policy.stock?
        rows << declaration("propose_stock_change", "Prepare a stock in, stock out or damage change for the user to confirm; NEVER execute it", {product_id: {type: "INTEGER"}, quantity: {type: "STRING", description: "Positive decimal quantity"}, movement_type: {type: "STRING", enum: %w[stock_in stock_out damage]}}, %w[product_id quantity movement_type])
        rows << declaration("propose_sale", "Prepare a bill at saved selling prices for confirmation; NEVER execute it", {items: {type: "ARRAY", items: {type: "OBJECT", properties: {product_id: {type: "INTEGER"}, quantity: {type: "STRING"}}, required: %w[product_id quantity]}}, payment_method: {type: "STRING", enum: %w[cash upi card other]}}, %w[items payment_method])
      end
      rows << declaration("propose_invitation", "Prepare an employee invitation for confirmation; NEVER send it automatically", {email: {type: "STRING"}, role: {type: "STRING", enum: @membership.role == "owner" ? %w[staff manager admin] : %w[staff manager]}}, %w[email role]) if @policy.manage?
      rows
    end
    def call(name, arguments)
      raise Pundit::NotAuthorizedError unless declarations.any? { |d| d[:name] == name }
      a = arguments.to_h.stringify_keys
      case name
      when "stoqo_help" then {guide: HELP}
      when "inventory_search"
        scope = @business.products.active
        if a["query"].present?
          q = "%#{Product.sanitize_sql_like(a['query'].to_s.first(120))}%"
          scope = scope.where("name ILIKE :q OR barcode ILIKE :q OR sku ILIKE :q", q: q)
        end
        scope = scope.low if a["filter"] == "low"
        scope = scope.out if a["filter"] == "out"
        {products: scope.order(:name).limit(20).map { |p| product(p) }, truncated: scope.count > 20}
      when "stock_summary"
        scope = @business.products.active
        result = {products: scope.count, total_units: scope.sum(:current_stock).to_s, low_stock: scope.low.count, out_of_stock: scope.out.count, currency: @business.currency}
        result[:inventory_value] = scope.sum("current_stock * purchase_price").to_s if @policy.costs?
        result
      when "recent_notifications"
        {notifications: Notifications::Visibility.scope(@business, @membership).order(created_at: :desc).limit(10).as_json(only: [:kind, :message, :created_at])}
      when "daily_summary"
        Reports::DailySummary.new(business: @business, date: a["date"].presence).call
      when "team_list"
        {members: @business.business_memberships.includes(:user).order(:id).limit(50).map { |m| {name: m.user.name, role: m.role} }}
      when "propose_stock_change"
        p = @business.products.active.find(a.fetch("product_id"))
        quantity = Sales::Checkout.decimal(a.fetch("quantity"), places: 3, positive: true)
        movement = a.fetch("movement_type")
        raise ArgumentError, "Choose stock in, stock out or damage" unless %w[stock_in stock_out damage].include?(movement)
        raise ArgumentError, "Not enough stock available" if movement != "stock_in" && quantity > p.current_stock
        proposal("stock_change", {product_id: p.id, product_name: p.display_name, quantity: quantity.to_s("F"), movement_type: movement, current_stock: p.current_stock.to_s("F")})
      when "propose_invitation"
        email = a.fetch("email").to_s.strip.downcase
        role = a.fetch("role").to_s
        raise ArgumentError, "Enter a valid email" unless email.length <= 254 && email.match?(URI::MailTo::EMAIL_REGEXP)
        raise Pundit::NotAuthorizedError unless (@membership.role == "owner" ? %w[staff manager admin] : %w[staff manager]).include?(role)
        proposal("invite_employee", {email: email, role: role})
      when "propose_sale"
        items = a.fetch("items")
        raise ArgumentError, "Select between 1 and 20 products" unless items.is_a?(Array) && items.size.between?(1, 20)
        ids = items.map { |i| Integer(i.fetch("product_id").to_s, 10) }
        raise ArgumentError, "Combine duplicate products" unless ids.uniq.size == ids.size
        products = @business.products.active.where(id: ids).index_by(&:id)
        raise ActiveRecord::RecordNotFound unless products.size == ids.size
        total = 0.to_d
        lines = items.map do |item|
          p = products.fetch(Integer(item.fetch("product_id").to_s, 10))
          q = Sales::Checkout.decimal(item.fetch("quantity"), places: 3, positive: true)
          raise ArgumentError, "Not enough stock for #{p.display_name}" if q > p.current_stock
          total += (q * p.selling_price).round(2)
          {product_id: p.id, product_name: p.display_name, quantity: q.to_s("F"), unit_price: p.selling_price.to_s("F")}
        end
        method = a.fetch("payment_method")
        raise ArgumentError, "Choose a payment method" unless %w[cash upi card other].include?(method)
        proposal("create_sale", {items: lines, payment_method: method, total: total.to_s("F"), currency: @business.currency})
      end
    end
    private
    def product(p)
      fields = {id: p.id, name: p.display_name, barcode: p.barcode, current_stock: p.current_stock.to_s("F"), unit: p.unit, selling_price: p.selling_price.to_s("F"), stock_status: p.stock_status}
      fields[:purchase_price] = p.purchase_price.to_s("F") if @policy.costs?
      fields
    end
    def proposal(kind, payload)
      raise ArgumentError, "Your subscription is read-only" unless @business.writable?
      action = AssistantAction.create!(business: @business, user: @user, kind: kind, payload: payload, expires_at: 10.minutes.from_now)
      {proposal: action.as_json(only: [:id, :kind, :payload, :expires_at]), requires_user_confirmation: true, executed: false}
    end
    def declaration(name, description, properties, required = [])
      schema = {type: "OBJECT", properties: properties}
      schema[:required] = required if required.any?
      {name: name, description: description, parameters: schema}
    end
  end
end
