require "rails_helper"
require "csv"
RSpec.describe "Purchase cost permissions", type: :request do
  let(:user) { create(:user) }
  let(:business) { create(:business) }
  let!(:membership) { create(:business_membership, user: user, business: business) }
  let!(:product) { create(:product, business: business) }
  let(:headers) { {"Authorization" => "Bearer #{Session.issue!(user)}", "X-Business-Id" => business.id.to_s} }
  %w[owner admin manager staff].each do |role|
    context "as #{role}" do
      before do
        membership.update!(role: role)
        Inventory::AdjustStock.call(product: product, user: user, quantity: 2, movement_type: "stock_in", unit_cost: 123, idempotency_key: "seed")
        business.activities.create!(user: user, action: "product_updated", subject_name: product.name,
          details: {changes: {purchase_price: [100, 300], selling_price: [400, 599]}})
      end
      it "filters nested cost fields on every read surface" do
        %W[products products/#{product.id} stock_movements dashboard activities].each do |path|
          get "/api/v1/#{path}", headers: headers
          expect(response).to have_http_status(:ok)
          expect(response.body).not_to match(/"(?:purchase_price|unit_cost|inventory_value)":/) if %w[manager staff].include?(role)
        end
        get "/api/v1/products/#{product.id}", headers: headers
        expect(response.parsed_body["data"].key?("purchase_price")).to eq(%w[owner admin].include?(role))
      end
      it "allows product and stock entry while protecting cost writes" do
        post "/api/v1/products", params: {product: {name: "New item", purchase_price: 987, selling_price: 999}}, headers: headers, as: :json
        expect(response).to have_http_status(:created)
        expect(business.products.order(:id).last.purchase_price).to eq(%w[owner admin].include?(role) ? 987 : 0)
        post "/api/v1/stock_movements", params: {stock_movement: {product_id: product.id, quantity: 1, movement_type: "stock_in", unit_cost: 987, idempotency_key: "entry"}}, headers: headers, as: :json
        expect(response).to have_http_status(:created)
        expect(business.stock_movements.find_by!(idempotency_key: "entry").unit_cost).to eq(%w[owner admin].include?(role) ? 987 : nil)
      end
    end
  end
  it "removes manager costs from reports and exports and preserves costs during editing" do
    membership.update!(role: "manager")
    get "/api/v1/reports", headers: headers
    expect(response).to have_http_status(:ok)
    expect(response.parsed_body["data"]).not_to have_key("inventory_value")
    get "/api/v1/products/export", headers: headers
    csv = CSV.parse(response.body, headers: true)
    expect(csv.headers).not_to include("Purchase Price")
    expect(csv.first["Selling Price"].to_d).to eq(product.selling_price)
    patch "/api/v1/products/#{product.id}", params: {product: {purchase_price: 1, name: "Renamed"}}, headers: headers, as: :json
    expect(response).to have_http_status(:ok)
    expect(product.reload.purchase_price).to eq(300)
    expect(product.name).to eq("Renamed")
  end
  it "protects variant setup and nested product responses for managers" do
    membership.update!(role: "manager")
    post "/api/v1/product_groups", params: {product_group: {name: "Tee range", idempotency_key: "group", variants: [{size: "M", selling_price: 599, purchase_price: 999, initial_quantity: 1}]}}, headers: headers, as: :json
    expect(response).to have_http_status(:created)
    expect(response.body).not_to include('"purchase_price":')
    expect(business.products.order(:id).last.purchase_price).to eq(0)
    get "/api/v1/product_groups/#{response.parsed_body["data"]["id"]}", headers: headers
    expect(response).to have_http_status(:ok)
    expect(response.body).not_to include('"purchase_price":')
  end
  it "restricts import creation and results" do
    import = business.imports.create!(user: user)
    membership.update!(role: "manager")
    post "/api/v1/imports", headers: headers
    expect(response).to have_http_status(:forbidden)
    get "/api/v1/imports/#{import.id}", headers: headers
    expect(response).to have_http_status(:forbidden)
  end
end
