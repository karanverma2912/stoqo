require "rails_helper"
RSpec.describe Inventory::CreateProduct do
  let(:business) { create(:business) }
  let(:user) { create(:user) }
  before { create(:business_membership, business: business, user: user, role: "owner") }
  it "returns the same product and opening stock on a retried request" do
    attributes = {name: "Retry product", selling_price: "25", purchase_price: "5", unit: "units"}
    args = {business: business, user: user, attributes: attributes, initial_quantity: "8", idempotency_key: "mobile-create-1"}
    first = described_class.call(**args)
    expect(described_class.call(**args).id).to eq(first.id)
    expect(first.reload.current_stock).to eq(8)
    expect(first.stock_movements.count).to eq(1)
    expect { described_class.call(**args.merge(initial_quantity: "9")) }.to raise_error(Inventory::AdjustStock::InvalidMovement)
    expect(business.products.count).to eq(1)
  end
end
