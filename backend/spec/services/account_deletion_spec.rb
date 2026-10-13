require "rails_helper"
RSpec.describe Accounts::DeleteAccount do
  it "requires store closure confirmation and removes owned data and sessions" do
    owner = create(:user, password: "original-password-123")
    business = create(:business)
    create(:business_membership, business: business, user: owner, role: "owner")
    product = Inventory::CreateProduct.call(business: business, user: owner, attributes: {name: "Deleted stock", selling_price: 10}, initial_quantity: 5, idempotency_key: "created-before-deletion")
    Session.issue!(owner)
    args = {user: owner, password: "original-password-123", close_owned_stores: false}
    expect { described_class.call(**args) }.to raise_error(ArgumentError, /closure/)
    expect(Business.exists?(business.id)).to be(true)
    described_class.call(**args.merge(close_owned_stores: true))
    expect(Business.exists?(business.id)).to be(false)
    expect(Product.exists?(product.id)).to be(false)
    expect(owner.reload.status).to eq("deleted")
    expect(owner.sessions.count).to eq(0)
    expect(owner.email).to end_with("@example.invalid")
  end
end
