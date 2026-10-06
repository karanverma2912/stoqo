require "rails_helper"
RSpec.describe "Returns and customer history", type: :request do
  let(:owner) { create(:user) }
  let(:staff) { create(:user) }
  let(:business) { create(:business) }
  let!(:membership) { create(:business_membership, business: business, user: owner) }
  let!(:staff_membership) { create(:business_membership, business: business, user: staff, role: "staff") }
  let(:product) { create(:product, business: business, selling_price: 100) }
  def headers(actor = owner)
    {"Authorization" => "Bearer #{Session.issue!(actor)}", "X-Business-Id" => business.id.to_s}
  end
  def sale(actor)
    Sales::Checkout.call(business: business, user: actor, attributes: {idempotency_key: SecureRandom.uuid, customer_phone: "+91 98765-43210", customer_name: "Customer", items: [{product_id: product.id, quantity: "2"}]})
  end
  before { Inventory::AdjustStock.call(product: product, user: owner, quantity: 10, movement_type: "initial_stock", idempotency_key: "opening") }
  it "records damaged returns once, preserving stock and the refund method" do
    bill = sale(owner)
    attrs = {reason: "Broken", refund_method: "upi", idempotency_key: "damaged", items: [{sale_item_id: bill.sale_items.first.id, quantity: "1", disposition: "damaged"}]}
    2.times { post "/api/v1/sales/#{bill.id}/return_items", params: {sale_return: attrs}, headers: headers, as: :json; expect(response).to have_http_status(:ok) }
    expect(product.reload.current_stock).to eq(8)
    expect(bill.sale_returns.count).to eq(1)
    expect(response.parsed_body["data"]["returns"].first).to include("refund_method" => "upi")
    expect(business.stock_movements.where(movement_type: "damage").sum(:quantity)).to eq(-1)
    post "/api/v1/sales/#{bill.id}/return_items", params: {sale_return: attrs.merge(idempotency_key: "bad", refund_method: "invalid")}, headers: headers, as: :json
    expect(response).to have_http_status(:unprocessable_entity)
    expect(bill.sale_returns.count).to eq(1)
  end
  it "finds formatted phone numbers without exposing another cashier's bills" do
    sale(owner); sale(staff)
    get "/api/v1/sales", params: {customer_phone: "919876543210"}, headers: headers(staff)
    expect(response.parsed_body["data"].size).to eq(1)
    expect(response.parsed_body["meta"]["customer_summary"]["sales"].to_d).to eq(200)
    get "/api/v1/sales", params: {customer_phone: "+91 98765 43210"}, headers: headers
    expect(response.parsed_body["data"].size).to eq(2)
    get "/api/v1/sales", params: {customer_phone: "12"}, headers: headers
    expect(response).to have_http_status(:unprocessable_entity)
    other = create(:business)
    get "/api/v1/sales", params: {customer_phone: "919876543210"}, headers: headers.merge("X-Business-Id" => other.id.to_s)
    expect(response).to have_http_status(:not_found)
  end
end
