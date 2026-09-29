require "rails_helper"
RSpec.describe "Checkout and bills", type: :request do
  let(:owner) { create(:user) }
  let(:staff) { create(:user) }
  let(:business) { create(:business) }
  let!(:owner_membership) { create(:business_membership, business: business, user: owner) }
  let!(:staff_membership) { create(:business_membership, business: business, user: staff, role: "staff") }
  let!(:product) { create(:product, business: business, selling_price: "10.01") }
  before { Inventory::AdjustStock.call(product: product, user: owner, quantity: 10, movement_type: "initial_stock", idempotency_key: "opening") }
  def headers(user = owner)
    {"Authorization" => "Bearer #{Session.issue!(user)}", "X-Business-Id" => business.id.to_s}
  end
  def checkout(attrs = {}, actor = owner)
    post "/api/v1/sales", params: {sale: {idempotency_key: "bill-key", payment_method: "cash", discount: "0", items: [{product_id: product.id, quantity: "3"}]}.merge(attrs)}, headers: headers(actor), as: :json
  end
  it "saves a price snapshot and applies a retry only once" do
    checkout
    expect(response).to have_http_status(:created)
    id = response.parsed_body.dig("data", "id")
    checkout
    expect(response.parsed_body.dig("data", "id")).to eq(id)
    expect(product.reload.current_stock).to eq(7)
    expect(business.sales.count).to eq(1)
    product.update!(name: "New name", selling_price: 99)
    get "/api/v1/sales/#{id}", headers: headers
    expect(response.parsed_body.dig("data", "items", 0, "name")).to eq("Everyday Tee")
    expect(response.parsed_body.dig("data", "total").to_d).to eq("30.03".to_d)
  end
  it "rolls back the entire cart when one item cannot be sold" do
    empty = create(:product, business: business)
    checkout(items: [{product_id: product.id, quantity: "2"}, {product_id: empty.id, quantity: "1"}])
    expect(response).to have_http_status(:unprocessable_entity)
    expect(product.reload.current_stock).to eq(10)
    expect(business.sales.count).to eq(0)
  end
  it "rejects foreign products and foreign bill access" do
    foreign = create(:product)
    checkout(items: [{product_id: foreign.id, quantity: "1"}])
    expect(response).to have_http_status(:not_found)
    checkout
    id = response.parsed_body.dig("data", "id")
    outsider = create(:user)
    other = create(:business)
    create(:business_membership, business: other, user: outsider)
    get "/api/v1/sales/#{id}", headers: headers(outsider).merge("X-Business-Id" => other.id.to_s)
    expect(response).to have_http_status(:not_found)
  end
  it "limits staff to their own bills and blocks prices, discounts and returns" do
    checkout
    owner_bill = business.sales.last
    get "/api/v1/sales/#{owner_bill.id}", headers: headers(staff)
    expect(response).to have_http_status(:not_found)
    checkout({idempotency_key: "staff-bill"}, staff)
    expect(response).to have_http_status(:created)
    get "/api/v1/sales", headers: headers(staff)
    expect(response.parsed_body["data"].size).to eq(1)
    checkout({idempotency_key: "discount", discount: "1"}, staff)
    expect(response).to have_http_status(:forbidden)
    checkout({idempotency_key: "price", items: [{product_id: product.id, quantity: "1", unit_price: "1"}]}, staff)
    expect(response).to have_http_status(:forbidden)
    post "/api/v1/sales/#{business.sales.last.id}/return_items", params: {sale_return: {reason: "return", idempotency_key: "r", items: []}}, headers: headers(staff), as: :json
    expect(response).to have_http_status(:forbidden)
    get "/api/v1/notifications", headers: headers(staff)
    expect(response.body).not_to include(owner_bill.number)
    get "/api/v1/sales", headers: headers
    expect(response.parsed_body["data"].size).to eq(2)
  end
  it "allocates discount refunds exactly and prevents duplicate or excess returns" do
    checkout(discount: "0.02")
    sale = business.sales.last
    item = sale.sale_items.first
    3.times do |n|
      attrs = {reason: "Resellable return", idempotency_key: "return-#{n}", items: [{sale_item_id: item.id, quantity: "1"}]}
      2.times do
        post "/api/v1/sales/#{sale.id}/return_items", params: {sale_return: attrs}, headers: headers, as: :json
        expect(response).to have_http_status(:ok)
      end
    end
    expect(sale.reload.status).to eq("returned")
    expect(sale.sale_returns.sum(:amount)).to eq(sale.total)
    expect(product.reload.current_stock).to eq(10)
    post "/api/v1/sales/#{sale.id}/return_items", params: {sale_return: {reason: "extra", idempotency_key: "extra", items: [{sale_item_id: item.id, quantity: "1"}]}}, headers: headers, as: :json
    expect(response).to have_http_status(:unprocessable_entity)
  end
end
