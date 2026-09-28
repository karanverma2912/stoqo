require "rails_helper"
RSpec.describe "Concurrent stock removal" do
  self.use_transactional_tests = false
  it "serializes stock-out requests so exactly one can use the last units" do
    business = create(:business)
    user = create(:user)
    create(:business_membership, business: business, user: user)
    product = Inventory::CreateProduct.call(business: business, user: user, attributes: {name: "Last batch"}, initial_quantity: 5)
    ready = Queue.new
    start = Queue.new
    outcomes = Queue.new
    threads = 2.times.map do |i|
      Thread.new do
        ActiveRecord::Base.connection_pool.with_connection do
          ready << true
          start.pop
          begin
            Inventory::AdjustStock.call(product: Product.find(product.id), user: User.find(user.id), quantity: -4,
              movement_type: "sale", idempotency_key: "concurrent-#{i}")
            outcomes << :success
          rescue Inventory::AdjustStock::InvalidMovement
            outcomes << :rejected
          end
        end
      end
    end
    2.times { ready.pop }
    2.times { start << true }
    threads.each(&:value)
    expect(2.times.map { outcomes.pop }.sort).to eq([:rejected, :success])
    expect(product.reload.current_stock).to eq(1)
    expect(product.stock_movements.sum(:quantity)).to eq(1)
  ensure
    if business
      [StockMovement, Activity, Notification, Product, BusinessMembership].each { |m| m.where(business_id: business.id).delete_all }
      plan = business.subscription_plan
      business.destroy!
      plan.destroy!
      user&.destroy!
    end
  end
end
