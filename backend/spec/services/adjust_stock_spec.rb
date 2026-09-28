require "rails_helper"
RSpec.describe Inventory::AdjustStock do
  let(:business) { create(:business) }
  let(:user) { create(:user) }
  let!(:membership) { create(:business_membership, business: business, user: user) }
  let(:product) { create(:product, business: business) }
  def move(quantity, type = "stock_in", key = SecureRandom.uuid)
    described_class.call(product: product, user: user, quantity: quantity, movement_type: type, idempotency_key: key)
  end
  it "maintains the ledger and cached quantity through mixed movements" do
    move(50, "initial_stock"); move(-5, "sale"); move(-2, "damage"); move(10, "adjustment")
    expect(product.reload.current_stock).to eq(53)
    expect(product.stock_movements.sum(:quantity)).to eq(53)
    expect(business.activities.count).to eq(4)
  end
  it "rejects negative inventory atomically" do
    move(2)
    expect { move(-3, "sale") }.to raise_error(described_class::InvalidMovement, /Not enough/)
    expect(product.reload.current_stock).to eq(2)
    expect(product.stock_movements.count).to eq(1)
  end
  it "does not double apply a retried request" do
    a = move(10, "stock_in", "retry-key")
    b = move(10, "stock_in", "retry-key")
    expect(a.id).to eq(b.id)
    expect(product.reload.current_stock).to eq(10)
  end
  it "rejects reuse with different request parameters" do
    move(10, "stock_in", "retry-key")
    expect { move(20, "stock_in", "retry-key") }.to raise_error(described_class::InvalidMovement, /different change/)
  end
  it "rejects bad, zero, infinite, over-precision and wrong-sign quantities" do
    [0, "bad", "NaN", "Infinity", "0.0001", -1].each do |quantity|
      expect { move(quantity) }.to raise_error(described_class::InvalidMovement)
    end
    expect { move(1, "sale") }.to raise_error(described_class::InvalidMovement)
  end
  it "preserves fractional quantities" do
    move("1.125"); move("-0.025", "sale")
    expect(product.reload.current_stock).to eq(BigDecimal("1.1"))
  end
  it "rejects actors from another business" do
    outsider = create(:user)
    expect { described_class.call(product: product, user: outsider, quantity: 1, movement_type: "stock_in", idempotency_key: "x") }.to raise_error(described_class::InvalidMovement, /Not permitted/)
  end
  it "makes persisted movements read-only" do
    movement = move(10)
    expect { movement.update!(quantity: 15) }.to raise_error(ActiveRecord::ReadOnlyRecord)
    expect { movement.destroy! }.to raise_error(ActiveRecord::ReadOnlyRecord)
  end
  it "creates notifications only when entering a different warning state" do
    move(10); move(-6, "sale"); move(-1, "sale"); move(-3, "sale")
    expect(business.notifications.pluck(:kind)).to eq(%w[low_stock out_of_stock])
  end
  it "rolls product creation back if opening quantity is invalid" do
    expect { Inventory::CreateProduct.call(business: business, user: user, attributes: {name: "Bad"}, initial_quantity: -1) }.to raise_error(described_class::InvalidMovement)
    expect(business.products.where(name: "Bad")).not_to exist
  end
end
