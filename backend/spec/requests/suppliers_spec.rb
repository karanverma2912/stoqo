require "rails_helper"
RSpec.describe "Suppliers and restocking", type: :request do
  let(:user) { create(:user) }
  let(:business) { create(:business) }
  let!(:member) { create(:business_membership, user: user, business: business) }
  let(:headers) { {"Authorization" => "Bearer #{Session.issue!(user)}", "X-Business-Id" => business.id.to_s} }
  it "links suppliers, finds low stock and keeps delivery history" do
    post "/api/v1/suppliers", params: {supplier: {name: "Local supply", phone: "9876543210"}}, headers: headers, as: :json
    expect(response).to have_http_status(:created)
    supplier = business.suppliers.last
    product = create(:product, business: business)
    patch "/api/v1/products/#{product.id}", params: {product: {supplier_id: supplier.id}}, headers: headers, as: :json
    expect(response).to have_http_status(:ok)
    get "/api/v1/products", params: {filter: "restock", supplier_id: supplier.id}, headers: headers
    expect(response.parsed_body["data"].map { |p| p["id"] }).to eq([product.id])
    2.times { post "/api/v1/stock_movements", params: {stock_movement: {product_id: product.id, movement_type: "stock_in", quantity: 10, note: "Supplier: Local supply", idempotency_key: "delivery"}}, headers: headers, as: :json }
    expect(product.reload.current_stock).to eq(10)
    get "/api/v1/products", params: {filter: "restock", supplier_id: supplier.id}, headers: headers
    expect(response.parsed_body["data"]).to be_empty
    patch "/api/v1/suppliers/#{supplier.id}", params: {supplier: {archived: true}}, headers: headers, as: :json
    expect(response).to have_http_status(:ok)
    expect(product.reload.supplier_id).to eq(supplier.id)
    fresh = create(:product, business: business)
    patch "/api/v1/products/#{fresh.id}", params: {product: {supplier_id: supplier.id}}, headers: headers, as: :json
    expect(response).to have_http_status(:unprocessable_entity)
  end
  it "blocks foreign suppliers, staff administration and expired writes" do
    foreign = Supplier.create!(business: create(:business), name: "Private")
    product = create(:product, business: business)
    patch "/api/v1/products/#{product.id}", params: {product: {supplier_id: foreign.id}}, headers: headers, as: :json
    expect(response).to have_http_status(:unprocessable_entity)
    patch "/api/v1/suppliers/#{foreign.id}", params: {supplier: {name: "Changed"}}, headers: headers, as: :json
    expect(response).to have_http_status(:not_found)
    member.update!(role: "staff")
    get "/api/v1/suppliers", headers: headers
    expect(response).to have_http_status(:forbidden)
    member.update!(role: "manager")
    get "/api/v1/suppliers", headers: headers
    expect(response).to have_http_status(:ok)
    expect(response.body).not_to include("Private")
    business.update!(trial_ends_at: 1.day.ago)
    post "/api/v1/suppliers", params: {supplier: {name: "New"}}, headers: headers, as: :json
    expect(response).to have_http_status(:payment_required)
  end
end
